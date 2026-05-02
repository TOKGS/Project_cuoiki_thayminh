# BÀI HỌC RÚT RA (Lessons Learned)

## Đồ án: Dự đoán hỏng hóc động cơ quạt gió trong nhà máy

---

*(Cập nhật sau mỗi lần có correction từ user hoặc phát hiện lỗi)*

### Quy tắc chung
- Luôn đọc đúng thư mục dự án trước khi làm việc
- Theo đúng workflow trong CLAUDE.md: Plan → Verify → Execute → Track → Document

### Lỗi đã mắc
1. **[2026-05-02]** Đọc nhầm thư mục dự án (`MAIN_PROJECT_THAYKIEN` thay vì `Project_thay_minh`)
   - **Nguyên nhân**: Không kiểm tra workspace URI, đọc file từ thư mục đang mở trong editor
   - **Quy tắc**: Luôn kiểm tra workspace path trong user_information TRƯỚC khi đọc file

2. **[2026-05-02]** FreeRTOS build lỗi trên Wokwi: `'QueueHandle_t' does not name a type`
   - **Nguyên nhân**: Chỉ có `#include <Arduino.h>` mà thiếu các header FreeRTOS tường minh. ESP32 Arduino core có FreeRTOS nhưng cần include riêng.
   - **Fix**: Thêm vào đầu file:
     ```cpp
     #include "freertos/FreeRTOS.h"
     #include "freertos/task.h"
     #include "freertos/queue.h"
     #include "freertos/semphr.h"
     #include "freertos/timers.h"
     ```
   - **Quy tắc**: Khi viết code FreeRTOS cho ESP32/Wokwi, LUÔN include đầy đủ các header FreeRTOS. Cũng cần có `diagram.json` với board `board-esp32-devkit-v1`.

3. **[2026-05-02]** Wokwi MPU6050 luôn báo lỗi (Overheating) dù ở trạng thái mặc định
   - **Nguyên nhân**: Trong Wokwi, slider gia tốc của MPU6050 dùng để mô phỏng mức độ rung động thay vì là trọng lực tĩnh. Khi để slider = 0, trục Z là 0. Hàm inference cũ trừ đi 1.0 (trọng lực tĩnh trên trục Z) làm cho giá trị chênh lệch trở thành -1.0, tạo ra RMS = 1.0 (ngưỡng báo lỗi cao nhất).
   - **Fix**: Bỏ logic trừ trọng lực ra khỏi hàm tính RMS và để mặc định `az = 0` thay vì `az = 1`.
   - **Quy tắc**: Nắm rõ cách các linh kiện mô phỏng (ví dụ như MPU6050) trên Wokwi cung cấp dữ liệu giả lập để thiết kế hàm xử lý cho phù hợp, tránh áp dụng cứng nhắc lý thuyết thực tế (bỏ trọng lực tĩnh Z) vào mô phỏng.

---
