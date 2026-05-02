/*
 * Fan Motor Fault Detection — FreeRTOS Simulation
 * Board: ESP32 (Wokwi Simulator)
 * Author: Tran Nguyen An Son — N22DCDT057
 * Course: He dieu hanh nhung — PTIT HCM
 *
 * Tasks:
 *   Task_Sensor    (Priority 5): Sample accelerometer at 62.5 Hz
 *   Task_Inference (Priority 4): Run TinyML model every 2s window
 *   Task_Alert     (Priority 3): Trigger alert on fault detection
 *   Task_Display   (Priority 2): Print status every 500ms
 *   Task_Log       (Priority 1): Log results every 1000ms
 */

#include <Arduino.h>

// ============================================================
// Configuration
// ============================================================
#define SAMPLE_RATE_HZ      62.5f
#define SAMPLE_INTERVAL_MS  (1000.0f / SAMPLE_RATE_HZ)   // ~16 ms
#define WINDOW_SIZE_SAMPLES 125   // 2s * 62.5Hz = 125 samples
#define DISPLAY_INTERVAL_MS 500
#define LOG_INTERVAL_MS     1000

// LED pins
#define LED_GREEN_PIN  2
#define LED_RED_PIN    4

// ============================================================
// Data structures
// ============================================================
typedef struct {
  float x, y, z;
  uint32_t timestamp_ms;
} AccelSample_t;

typedef struct {
  uint8_t class_id;       // 0=Normal, 1=Bearing, 2=Imbalance, 3=Overheating
  float   confidence;
  float   anomaly_score;
  uint32_t timestamp_ms;
} InferenceResult_t;

// Class labels
const char* CLASS_LABELS[] = {"Normal", "Bearing Fault", "Imbalance", "Overheating"};

// ============================================================
// FreeRTOS handles
// ============================================================
QueueHandle_t xSensorQueue;    // AccelSample_t, depth=WINDOW_SIZE_SAMPLES
QueueHandle_t xResultQueue;    // InferenceResult_t, depth=5
SemaphoreHandle_t xAlertSemaphore;
SemaphoreHandle_t xDisplayMutex;

// Circular buffer for sensor samples
AccelSample_t sensorBuffer[WINDOW_SIZE_SAMPLES];
uint16_t sampleCount = 0;

// Last known result (shared, protected by mutex)
InferenceResult_t lastResult = {0, 0.0f, 0.0f, 0};

// ============================================================
// Mock: Simulate accelerometer reading
// Returns vibration pattern that varies over time to demo different states
// ============================================================
AccelSample_t readAccelerometer() {
  AccelSample_t s;
  s.timestamp_ms = millis();
  uint32_t t = s.timestamp_ms;

  // Simulate different fault modes every 8 seconds
  uint8_t mode = (t / 8000) % 4;

  float base_z = 1.0f;  // gravity
  float noise  = (random(-10, 10) / 100.0f);

  switch (mode) {
    case 0: // Normal — smooth, low vibration
      s.x = 0.10f + noise;
      s.y = 0.05f + noise;
      s.z = base_z + noise * 0.5f;
      break;
    case 1: // Bearing Fault — high frequency vibration
      s.x = 0.30f + sin(t * 0.05f) * 0.20f + noise;
      s.y = 0.25f + cos(t * 0.07f) * 0.15f + noise;
      s.z = base_z + sin(t * 0.09f) * 0.10f + noise;
      break;
    case 2: // Imbalance — 1x RPM dominant frequency
      s.x = 0.50f + sin(t * 0.01f) * 0.40f + noise * 0.5f;
      s.y = 0.50f + cos(t * 0.01f) * 0.40f + noise * 0.5f;
      s.z = base_z + sin(t * 0.01f) * 0.05f + noise;
      break;
    case 3: // Overheating — irregular high amplitude
      s.x = 0.20f + (random(-50, 50) / 100.0f);
      s.y = 0.20f + (random(-50, 50) / 100.0f);
      s.z = base_z + 0.30f + (random(-30, 30) / 100.0f);
      break;
  }
  return s;
}

// ============================================================
// Mock: Simple inference (in real system, use Edge Impulse library)
// ============================================================
InferenceResult_t runInference(AccelSample_t* buffer, uint16_t count) {
  InferenceResult_t result;
  result.timestamp_ms = millis();

  // Calculate RMS for each axis (simplified feature extraction)
  float sumX = 0, sumY = 0, sumZ = 0;
  for (int i = 0; i < count; i++) {
    sumX += buffer[i].x * buffer[i].x;
    sumY += buffer[i].y * buffer[i].y;
    sumZ += (buffer[i].z - 1.0f) * (buffer[i].z - 1.0f); // remove gravity
  }
  float rmsX = sqrt(sumX / count);
  float rmsY = sqrt(sumY / count);
  float rmsZ = sqrt(sumZ / count);
  float totalRMS = rmsX + rmsY + rmsZ;

  // Simple threshold-based classification (demo only)
  // In real system: ei_run_classifier() from Edge Impulse
  if (totalRMS < 0.25f) {
    result.class_id = 0; result.confidence = 0.92f; result.anomaly_score = 0.10f;
  } else if (totalRMS < 0.50f) {
    result.class_id = 1; result.confidence = 0.88f; result.anomaly_score = 1.75f;
  } else if (totalRMS < 0.90f) {
    result.class_id = 2; result.confidence = 0.85f; result.anomaly_score = 2.10f;
  } else {
    result.class_id = 3; result.confidence = 0.80f; result.anomaly_score = 3.50f;
  }
  return result;
}

// ============================================================
// TASK 1: Task_Sensor — Priority 5 (Highest)
// Sample accelerometer at 62.5 Hz
// ============================================================
void vTaskSensor(void* pvParam) {
  TickType_t xLastWakeTime = xTaskGetTickCount();
  const TickType_t xInterval = pdMS_TO_TICKS((uint32_t)SAMPLE_INTERVAL_MS);

  while (1) {
    AccelSample_t sample = readAccelerometer();
    Serial.printf("[%lums] [SENSOR] X=%.2fg Y=%.2fg Z=%.2fg → buf[%d]\n",
                  millis(), sample.x, sample.y, sample.z, sampleCount);

    // Push to queue (non-blocking — drop if full)
    xQueueSend(xSensorQueue, &sample, 0);

    vTaskDelayUntil(&xLastWakeTime, xInterval);
  }
}

// ============================================================
// TASK 2: Task_Inference — Priority 4
// Collect window then run model
// ============================================================
void vTaskInference(void* pvParam) {
  AccelSample_t sample;
  sampleCount = 0;

  while (1) {
    // Collect samples until window is full
    if (xQueueReceive(xSensorQueue, &sample, portMAX_DELAY) == pdTRUE) {
      sensorBuffer[sampleCount++] = sample;

      if (sampleCount >= WINDOW_SIZE_SAMPLES) {
        Serial.printf("[%lums] [INFERENCE] Window ready (%d samples)! Running model...\n",
                      millis(), sampleCount);

        uint32_t t_start = millis();
        InferenceResult_t result = runInference(sensorBuffer, sampleCount);
        uint32_t t_infer = millis() - t_start;

        Serial.printf("[%lums] [INFERENCE] Done in %lums → %s (conf=%.0f%%, anomaly=%.2f)\n",
                      millis(), t_infer,
                      CLASS_LABELS[result.class_id],
                      result.confidence * 100,
                      result.anomaly_score);

        // Update shared result
        if (xSemaphoreTake(xDisplayMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
          lastResult = result;
          xSemaphoreGive(xDisplayMutex);
        }

        // Send to result queue (for Alert and Display tasks)
        xQueueSend(xResultQueue, &result, 0);

        sampleCount = 0; // Reset window
      }
    }
  }
}

// ============================================================
// TASK 3: Task_Alert — Priority 3
// React to fault detection immediately
// ============================================================
void vTaskAlert(void* pvParam) {
  InferenceResult_t result;

  while (1) {
    if (xQueueReceive(xResultQueue, &result, portMAX_DELAY) == pdTRUE) {
      if (result.class_id == 0) {
        // Normal — green LED
        digitalWrite(LED_GREEN_PIN, HIGH);
        digitalWrite(LED_RED_PIN, LOW);
        Serial.printf("[%lums] [ALERT]     Status OK — Normal operation\n", millis());
      } else {
        // Fault detected — red LED
        digitalWrite(LED_GREEN_PIN, LOW);
        digitalWrite(LED_RED_PIN, HIGH);
        Serial.printf("[%lums] [ALERT]  *** FAULT: %s *** (anomaly=%.2f)\n",
                      millis(), CLASS_LABELS[result.class_id], result.anomaly_score);
      }
    }
  }
}

// ============================================================
// TASK 4: Task_Display — Priority 2
// Print system status every 500ms
// ============================================================
void vTaskDisplay(void* pvParam) {
  TickType_t xLastWakeTime = xTaskGetTickCount();

  while (1) {
    if (xSemaphoreTake(xDisplayMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      if (lastResult.timestamp_ms == 0) {
        Serial.printf("[%lums] [DISPLAY]  Collecting... (%d/%d samples)\n",
                      millis(), sampleCount, WINDOW_SIZE_SAMPLES);
      } else {
        Serial.printf("[%lums] [DISPLAY]  %s | Conf=%.0f%% | Anomaly=%.2f\n",
                      millis(),
                      CLASS_LABELS[lastResult.class_id],
                      lastResult.confidence * 100,
                      lastResult.anomaly_score);
      }
      xSemaphoreGive(xDisplayMutex);
    }
    vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(DISPLAY_INTERVAL_MS));
  }
}

// ============================================================
// TASK 5: Task_Log — Priority 1 (Lowest)
// Log results every 1000ms
// ============================================================
void vTaskLog(void* pvParam) {
  TickType_t xLastWakeTime = xTaskGetTickCount();

  while (1) {
    if (xSemaphoreTake(xDisplayMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      if (lastResult.timestamp_ms > 0) {
        Serial.printf("[%lums] [LOG]      ts=%lu class=%s conf=%.2f anomaly=%.2f\n",
                      millis(), lastResult.timestamp_ms,
                      CLASS_LABELS[lastResult.class_id],
                      lastResult.confidence,
                      lastResult.anomaly_score);
      }
      xSemaphoreGive(xDisplayMutex);
    }
    vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(LOG_INTERVAL_MS));
  }
}

// ============================================================
// Setup & Loop
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  digitalWrite(LED_GREEN_PIN, HIGH); // Start green (Normal)
  digitalWrite(LED_RED_PIN, LOW);

  Serial.println("=== Fan Motor Fault Detection — FreeRTOS Demo ===");
  Serial.println("Tran Nguyen An Son — N22DCDT057");
  Serial.println("Tasks: Sensor(5) > Inference(4) > Alert(3) > Display(2) > Log(1)");
  Serial.println("================================================");

  // Create FreeRTOS objects
  xSensorQueue    = xQueueCreate(WINDOW_SIZE_SAMPLES, sizeof(AccelSample_t));
  xResultQueue    = xQueueCreate(5, sizeof(InferenceResult_t));
  xAlertSemaphore = xSemaphoreCreateBinary();
  xDisplayMutex   = xSemaphoreCreateMutex();

  // Create tasks
  xTaskCreate(vTaskSensor,    "Sensor",    4096, NULL, 5, NULL);
  xTaskCreate(vTaskInference, "Inference", 8192, NULL, 4, NULL);
  xTaskCreate(vTaskAlert,     "Alert",     2048, NULL, 3, NULL);
  xTaskCreate(vTaskDisplay,   "Display",   2048, NULL, 2, NULL);
  xTaskCreate(vTaskLog,       "Log",       2048, NULL, 1, NULL);

  Serial.println("[SYSTEM] All tasks created. FreeRTOS scheduler running...");
}

void loop() {
  // FreeRTOS scheduler handles everything — loop() stays empty
  vTaskDelay(portMAX_DELAY);
}
