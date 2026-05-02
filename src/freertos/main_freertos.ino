/*
 * Fan Motor Fault Detection — FreeRTOS + MPU6050
 * Board  : ESP32 DevKit V1 (Wokwi)
 * Author : Tran Nguyen An Son — N22DCDT057
 * Course : He dieu hanh nhung — PTIT HCM
 *
 * PASTE vao file ten chinh xac la "sketch.ino" tren Wokwi
 *
 * Tasks:
 *   Task_Sensor    Priority 5 — Doc MPU6050 qua I2C, 62.5 Hz
 *   Task_Inference Priority 4 — Phan loai rung dong moi 2s
 *   Task_Alert     Priority 3 — Bat LED khi phat hien loi
 *   Task_Display   Priority 2 — In trang thai moi 500 ms
 *   Task_Log       Priority 1 — Ghi log moi 1000 ms
 *
 * Wiring MPU6050:
 *   VCC  -> 3V3
 *   GND  -> GND
 *   SDA  -> GPIO 21
 *   SCL  -> GPIO 22
 */

#include <Arduino.h>
#include <Wire.h>

// ============================================================
// FreeRTOS (built-in voi ESP32 Arduino core)
// ============================================================
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"

// ============================================================
// MPU6050 — Thanh ghi va dia chi I2C
// ============================================================
#define MPU6050_ADDR       0x68
#define MPU_PWR_MGMT_1     0x6B
#define MPU_ACCEL_XOUT_H   0x3B
#define MPU_ACCEL_SCALE    16384.0f   // +/-2g range: 16384 LSB/g

// ============================================================
// Cau hinh he thong
// ============================================================
#define SAMPLE_INTERVAL_MS   16       // ~62.5 Hz
#define WINDOW_SIZE_SAMPLES  125      // 2 giay * 62.5 Hz
#define DISPLAY_INTERVAL_MS  500
#define LOG_INTERVAL_MS      1000

#define LED_GREEN_PIN  2
#define LED_RED_PIN    4

// ============================================================
// Cac struct du lieu
// ============================================================
typedef struct {
  float    x, y, z;      // don vi: g
  uint32_t ts;           // timestamp ms
} AccelSample_t;

typedef struct {
  uint8_t  class_id;     // 0=Normal 1=Bearing 2=Imbalance 3=Overheating
  float    confidence;
  float    anomaly_score;
  uint32_t ts;
} InferenceResult_t;

static const char* LABELS[] = {
  "Normal", "Bearing Fault", "Imbalance", "Overheating"
};

// ============================================================
// FreeRTOS handles
// ============================================================
static QueueHandle_t     xSensorQueue;
static QueueHandle_t     xResultQueue;
static SemaphoreHandle_t xI2CMutex;       // bao ve Wire (I2C)
static SemaphoreHandle_t xDataMutex;      // bao ve lastResult

static AccelSample_t     sensorBuf[WINDOW_SIZE_SAMPLES];
static uint16_t          sampleCount = 0;
static InferenceResult_t lastResult  = {0, 0.0f, 0.0f, 0};

// ============================================================
// Khoi dong MPU6050
// ============================================================
static bool mpu6050_init(void) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(MPU_PWR_MGMT_1);
  Wire.write(0x00);  // Wake up: xoa bit sleep
  return (Wire.endTransmission() == 0);
}

// ============================================================
// Doc 3 truc gia toc tu MPU6050 qua I2C
// ============================================================
static bool mpu6050_read(float* ax, float* ay, float* az) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(MPU_ACCEL_XOUT_H);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)6, (uint8_t)true);

  if (Wire.available() < 6) return false;

  int16_t raw_x = (Wire.read() << 8) | Wire.read();
  int16_t raw_y = (Wire.read() << 8) | Wire.read();
  int16_t raw_z = (Wire.read() << 8) | Wire.read();

  *ax = raw_x / MPU_ACCEL_SCALE;
  *ay = raw_y / MPU_ACCEL_SCALE;
  *az = raw_z / MPU_ACCEL_SCALE;
  return true;
}

// ============================================================
// Mock inference — tinh RMS, phan nguong don gian
// (Trong he thong that: goi ei_run_classifier() tu Edge Impulse)
// ============================================================
static InferenceResult_t runInference(AccelSample_t* buf, uint16_t n) {
  InferenceResult_t r;
  r.ts = millis();

  double sumX = 0, sumY = 0, sumZ = 0;
  for (int i = 0; i < n; i++) {
    sumX += (double)buf[i].x * buf[i].x;
    sumY += (double)buf[i].y * buf[i].y;
    sumZ += (double)buf[i].z * buf[i].z;  // Wokwi: slider = rung dong truc tiep (0=binh thuong)
  }
  float rms = sqrtf((float)(sumX/n)) + sqrtf((float)(sumY/n)) + sqrtf((float)(sumZ/n));

  if      (rms < 0.20f) { r.class_id = 0; r.confidence = 0.93f; r.anomaly_score = 0.08f; }
  else if (rms < 0.45f) { r.class_id = 1; r.confidence = 0.88f; r.anomaly_score = 1.72f; }
  else if (rms < 0.80f) { r.class_id = 2; r.confidence = 0.85f; r.anomaly_score = 2.15f; }
  else                  { r.class_id = 3; r.confidence = 0.79f; r.anomaly_score = 3.48f; }
  return r;
}

// ============================================================
// TASK 1 — Task_Sensor  (Priority 5)
// Doc MPU6050 qua I2C moi 16 ms (62.5 Hz)
// ============================================================
static void vTaskSensor(void* pv) {
  TickType_t       xLast     = xTaskGetTickCount();
  const TickType_t xInterval = pdMS_TO_TICKS(SAMPLE_INTERVAL_MS);

  while (1) {
    float ax = 0, ay = 0, az = 0.0f;  // Wokwi MPU6050: slider 0 = khong rung dong

    // Bao ve bus I2C bang mutex
    if (xSemaphoreTake(xI2CMutex, pdMS_TO_TICKS(5)) == pdTRUE) {
      mpu6050_read(&ax, &ay, &az);
      xSemaphoreGive(xI2CMutex);
    }

    AccelSample_t s = { ax, ay, az, millis() };
    Serial.printf("[%7lu] [SENSOR]    X=%6.3fg Y=%6.3fg Z=%6.3fg buf[%d]\n",
                  millis(), ax, ay, az, sampleCount);

    xQueueSend(xSensorQueue, &s, 0);
    vTaskDelayUntil(&xLast, xInterval);
  }
}

// ============================================================
// TASK 2 — Task_Inference  (Priority 4)
// Thu thap du du mau -> chay mo hinh
// ============================================================
static void vTaskInference(void* pv) {
  AccelSample_t s;
  sampleCount = 0;

  while (1) {
    if (xQueueReceive(xSensorQueue, &s, portMAX_DELAY) == pdTRUE) {
      sensorBuf[sampleCount++] = s;

      if (sampleCount >= WINDOW_SIZE_SAMPLES) {
        Serial.printf("[%7lu] [INFERENCE] Window %d samples. Running model...\n",
                      millis(), sampleCount);

        uint32_t t0 = millis();
        InferenceResult_t r = runInference(sensorBuf, sampleCount);
        uint32_t dt = millis() - t0;

        Serial.printf("[%7lu] [INFERENCE] %lu ms -> %s (conf=%.0f%%, anomaly=%.2f)\n",
                      millis(), (unsigned long)dt,
                      LABELS[r.class_id], r.confidence * 100.0f, r.anomaly_score);

        if (xSemaphoreTake(xDataMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
          lastResult = r;
          xSemaphoreGive(xDataMutex);
        }
        xQueueSend(xResultQueue, &r, 0);
        sampleCount = 0;
      }
    }
  }
}

// ============================================================
// TASK 3 — Task_Alert  (Priority 3)
// Bat LED khi phat hien loi
// ============================================================
static void vTaskAlert(void* pv) {
  InferenceResult_t r;
  while (1) {
    if (xQueueReceive(xResultQueue, &r, portMAX_DELAY) == pdTRUE) {
      if (r.class_id == 0) {
        digitalWrite(LED_GREEN_PIN, HIGH);
        digitalWrite(LED_RED_PIN,   LOW);
        Serial.printf("[%7lu] [ALERT]     OK - Normal operation\n", millis());
      } else {
        digitalWrite(LED_GREEN_PIN, LOW);
        digitalWrite(LED_RED_PIN,   HIGH);
        Serial.printf("[%7lu] [ALERT]  *** FAULT: %s *** anomaly=%.2f\n",
                      millis(), LABELS[r.class_id], r.anomaly_score);
      }
    }
  }
}

// ============================================================
// TASK 4 — Task_Display  (Priority 2)
// In trang thai moi 500 ms
// ============================================================
static void vTaskDisplay(void* pv) {
  TickType_t xLast = xTaskGetTickCount();
  while (1) {
    if (xSemaphoreTake(xDataMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      if (lastResult.ts == 0) {
        Serial.printf("[%7lu] [DISPLAY]  Collecting... %d/%d\n",
                      millis(), sampleCount, WINDOW_SIZE_SAMPLES);
      } else {
        Serial.printf("[%7lu] [DISPLAY]  %-14s | Conf=%.0f%% | Anomaly=%.2f\n",
                      millis(), LABELS[lastResult.class_id],
                      lastResult.confidence * 100.0f, lastResult.anomaly_score);
      }
      xSemaphoreGive(xDataMutex);
    }
    vTaskDelayUntil(&xLast, pdMS_TO_TICKS(DISPLAY_INTERVAL_MS));
  }
}

// ============================================================
// TASK 5 — Task_Log  (Priority 1)
// Ghi log moi 1000 ms
// ============================================================
static void vTaskLog(void* pv) {
  TickType_t xLast = xTaskGetTickCount();
  while (1) {
    if (xSemaphoreTake(xDataMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      if (lastResult.ts > 0) {
        Serial.printf("[%7lu] [LOG]      ts=%lu | %s | conf=%.2f | anomaly=%.2f\n",
                      millis(), (unsigned long)lastResult.ts,
                      LABELS[lastResult.class_id],
                      lastResult.confidence, lastResult.anomaly_score);
      }
      xSemaphoreGive(xDataMutex);
    }
    vTaskDelayUntil(&xLast, pdMS_TO_TICKS(LOG_INTERVAL_MS));
  }
}

// ============================================================
// setup() — chay 1 lan khi khoi dong
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(300);

  // I2C
  Wire.begin(21, 22);   // SDA=21, SCL=22 (default ESP32)
  if (!mpu6050_init()) {
    Serial.println("[ERROR] MPU6050 not found! Check wiring.");
  } else {
    Serial.println("[OK]    MPU6050 initialized.");
  }

  // LED
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN,   OUTPUT);
  digitalWrite(LED_GREEN_PIN, HIGH);
  digitalWrite(LED_RED_PIN,   LOW);

  Serial.println("=== Fan Motor Fault Detection - FreeRTOS + MPU6050 ===");
  Serial.println("Author : Tran Nguyen An Son - N22DCDT057");
  Serial.println("Tasks  : Sensor(5) Inference(4) Alert(3) Display(2) Log(1)");
  Serial.println("======================================================");

  // Tao FreeRTOS objects
  xSensorQueue = xQueueCreate(WINDOW_SIZE_SAMPLES, sizeof(AccelSample_t));
  xResultQueue = xQueueCreate(5,                   sizeof(InferenceResult_t));
  xI2CMutex    = xSemaphoreCreateMutex();
  xDataMutex   = xSemaphoreCreateMutex();

  // Tao 5 tasks
  xTaskCreate(vTaskSensor,    "Sensor",    4096, NULL, 5, NULL);
  xTaskCreate(vTaskInference, "Inference", 8192, NULL, 4, NULL);
  xTaskCreate(vTaskAlert,     "Alert",     2048, NULL, 3, NULL);
  xTaskCreate(vTaskDisplay,   "Display",   2048, NULL, 2, NULL);
  xTaskCreate(vTaskLog,       "Log",       2048, NULL, 1, NULL);

  Serial.println("[SYSTEM] All 5 tasks created. Scheduler running...");
}

// ============================================================
// loop() — FreeRTOS xu ly het, loop de trong
// ============================================================
void loop() {
  vTaskDelay(portMAX_DELAY);
}
