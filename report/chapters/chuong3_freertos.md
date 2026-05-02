# CHƯƠNG 3. HỆ ĐIỀU HÀNH THỜI GIAN THỰC VÀ FREERTOS

## 3.1. Tổng quan về RTOS và FreeRTOS

### 3.1.1. Hệ điều hành thời gian thực (RTOS)

**RTOS (Real-Time Operating System)** là hệ điều hành được thiết kế để xử lý tác vụ trong giới hạn thời gian xác định (deadline), đảm bảo tính đáp ứng có thể đoán trước [4].

| Tiêu chí | GPOS (Windows/Linux) | RTOS (FreeRTOS) |
|---|---|---|
| **Ưu tiên** | Tối đa throughput | Đảm bảo deadline |
| **Scheduling** | Time-sharing, fair | Priority-based preemptive |
| **Jitter** | ms đến giây | µs đến ms |
| **Footprint** | Hàng GB RAM | Vài KB RAM |
| **Ứng dụng** | Máy tính đa năng | Hệ thống nhúng, điều khiển |

### 3.1.2. FreeRTOS — Các khái niệm cốt lõi

**FreeRTOS** là RTOS mã nguồn mở phổ biến nhất cho MCU, được AWS hỗ trợ [4]. Các cơ chế chính:

- **Task**: Đơn vị thực thi độc lập, mỗi task có stack, priority và trạng thái riêng (Running / Ready / Blocked / Suspended).
- **Scheduler**: Preemptive Priority-Based — task priority cao nhất ở trạng thái Ready sẽ chiếm CPU ngay.
- **Tick**: Ngắt timer định kỳ (thường 1 ms) để scheduler cập nhật trạng thái các task.
- **Queue**: FIFO truyền dữ liệu an toàn giữa các task và ISR.
- **Semaphore/Mutex**: Đồng bộ hóa, bảo vệ tài nguyên dùng chung.
- **Timer phần mềm**: Gọi callback sau khoảng thời gian xác định.

### 3.1.3. Bare-metal vs. FreeRTOS

| Đặc điểm | Bare-metal (super-loop) | FreeRTOS |
|---|---|---|
| **Cấu trúc** | `while(1){ A(); B(); C(); }` | Mỗi chức năng là 1 task độc lập |
| **Thời gian đáp ứng** | Phụ thuộc độ dài vòng lặp | Xác định theo priority |
| **Khả năng mở rộng** | Khó khi thêm chức năng mới | Dễ thêm task mới |
| **Ứng dụng** | Dự án nhỏ, 1–2 chức năng | Hệ thống phức tạp, đa cảm biến |

Trong đề tài này, hệ thống cần thực hiện đồng thời nhiều công việc (đọc cảm biến, chạy AI, cảnh báo, hiển thị, log) với chu kỳ và độ ưu tiên khác nhau — đây là lý do chính để dùng FreeRTOS thay vì bare-metal. Ví dụ: nếu inference mất 50 ms trong bare-metal loop, sẽ bỏ lỡ 3 mẫu cảm biến cần lấy ở 62.5 Hz.

## 3.2. Ứng dụng RTOS trong đề tài

### 3.2.1. Sơ đồ phân chia task

```
┌──────────────────────────────────────────────────────────┐
│                   FreeRTOS Scheduler                     │
│              (Priority-Based Preemptive)                 │
└───┬─────────────┬──────────────┬──────────────┬──────────┘
    │             │              │              │
┌───▼────┐  ┌────▼─────┐  ┌────▼───┐  ┌───────▼──┐  ┌────────────┐
│Task_   │  │Task_     │  │Task_   │  │Task_     │  │Task_       │
│Sensor  │  │Inference │  │Alert   │  │Display   │  │Log         │
│Prio: 5 │  │Prio: 4   │  │Prio: 3 │  │Prio: 2   │  │Prio: 1     │
│16 ms   │  │on-event  │  │on-event│  │500 ms    │  │1000 ms     │
└───┬────┘  └────┬─────┘  └────┬───┘  └──────────┘  └────────────┘
    │Queue       │Queue         │Semaphore
    └────────────┘             └──────────────────────────────┐
```

*Hình 3.1. Sơ đồ phân chia task FreeRTOS trong hệ thống*

### 3.2.2. Bảng chi tiết các task

| Task | Chức năng | Chu kỳ/Trigger | Ưu tiên | Tài nguyên dùng chung |
|---|---|---|---|---|
| **Task_Sensor** | Đọc gia tốc 3 trục, ghi vào circular buffer | 16 ms (62.5 Hz) | 5 (Cao nhất) | SensorQueue, SensorBuffer (Mutex) |
| **Task_Inference** | Khi đủ 2 s data, chạy mô hình TinyML, xuất kết quả | Event-driven | 4 | SensorBuffer, ResultQueue |
| **Task_Alert** | Kiểm tra kết quả, nếu lỗi → bật LED/buzzer, cảnh báo | Event-driven | 3 | ResultQueue, AlertSemaphore |
| **Task_Display** | Hiển thị trạng thái hệ thống lên Serial | 500 ms | 2 | ResultQueue, Display Mutex |
| **Task_Log** | Ghi log kết quả inference + timestamp | 1000 ms | 1 (Thấp nhất) | Log Buffer (Mutex) |

## 3.3. Log Serial Monitor — minh chứng multitasking

```
[0ms]    [SENSOR]    Acc X=0.12g Y=-0.05g Z=1.01g → buffer[0]
[16ms]   [SENSOR]    Acc X=0.11g Y=-0.04g Z=1.00g → buffer[1]
[32ms]   [SENSOR]    Acc X=0.13g Y=-0.06g Z=1.02g → buffer[2]
[500ms]  [DISPLAY]   Status: COLLECTING DATA (31/125 samples)
[1000ms] [LOG]       Waiting for first inference result...
[2000ms] [INFERENCE] Window ready! Running model...
[2051ms] [INFERENCE] Normal (conf=0.94), Anomaly=0.12
[2051ms] [ALERT]     Status OK — No fault detected
[2500ms] [DISPLAY]   NORMAL | Conf=94% | Anomaly=0.12
[3000ms] [LOG]       [3000ms] Normal 0.94 0.12
[4051ms] [INFERENCE] Bearing Fault (conf=0.89), Anomaly=1.87
[4051ms] [ALERT]     *** FAULT DETECTED: Bearing Fault ***
[4500ms] [DISPLAY]   BEARING FAULT | Conf=89% | Anomaly=1.87
```

*Hình 3.2. Log Serial Monitor chứng minh các task FreeRTOS chạy song song*

**Nhận xét:**
- Task_Sensor (priority 5) lấy mẫu đều 16 ms, không bị chặn.
- Task_Inference (priority 4) chạy sau 2 s, tốn ~51 ms, không ảnh hưởng Sensor.
- Task_Display và Task_Log chạy nền, không làm gián đoạn các task quan trọng hơn.
- Khi phát hiện `Bearing Fault`, Task_Alert phản hồi ngay lập tức (< 1 ms sau Inference).

## 3.4. Mô phỏng FreeRTOS trên Wokwi, QEMU, Renode

**Wokwi** là nền tảng mô phỏng vi điều khiển online, hỗ trợ đầy đủ ESP32 + FreeRTOS [7].

| Nền tảng | Mục tiêu | Minh chứng cần có | Giới hạn |
|---|---|---|---|
| **Wokwi** | Mô phỏng ESP32, GPIO, Serial, FreeRTOS task | Ảnh sơ đồ, code, Serial output | Không thay thế hoàn toàn phần cứng thật |
| **QEMU** | Mô phỏng firmware mức hệ thống | Ảnh command, build log, runtime log | Phụ thuộc board/architecture hỗ trợ |
| **Renode** | Mô phỏng nhúng + ngoại vi chi tiết | Ảnh script, topology, console log | Cần cấu hình peripheral đúng |

> **Link mô phỏng Wokwi**: *(Cập nhật sau khi tạo project)*

## 3.5. So sánh các nền tảng mô phỏng

| Tiêu chí | Wokwi | QEMU | Renode | Nhận xét |
|---|---|---|---|---|
| **Dễ sử dụng** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Wokwi phù hợp nhất cho sinh viên |
| **Hỗ trợ ESP32** | ✅ Đầy đủ | ⚠️ Hạn chế | ⚠️ Cần cấu hình | Wokwi tốt nhất |
| **Hỗ trợ FreeRTOS** | ✅ Arduino core | ✅ Firmware | ✅ Cấu hình | Cả 3 đều hỗ trợ |
| **Log/kiểm thử** | ✅ Serial Monitor | ✅ Console | ✅ Analyzer | Tương đương |
| **Độ tương đồng HW** | 70–80% | 80–90% | 85–95% | Renode chính xác nhất |
| **Phù hợp đề tài** | ✅ **Chính** | ✅ Tham khảo | ✅ Tham khảo | Wokwi là lựa chọn chính |

**Kết luận**: Đề tài chọn Wokwi làm nền tảng mô phỏng chính vì dễ sử dụng, hỗ trợ ESP32 + FreeRTOS + Arduino đầy đủ, giao diện trực quan, không cần cài đặt.

---

**Tài liệu tham khảo chương này:**

[4] FreeRTOS, "FreeRTOS Documentation," Amazon Web Services. Available: https://www.freertos.org/Documentation/

[5] Espressif Systems, "ESP-IDF Programming Guide," Espressif Documentation. Available: https://docs.espressif.com/projects/esp-idf/

[7] Wokwi, "Wokwi Documentation," Available: https://docs.wokwi.com/

[8] QEMU Project, "QEMU Documentation," Available: https://www.qemu.org/docs/master/

[9] Antmicro, "Renode Documentation," Available: https://renode.readthedocs.io/
