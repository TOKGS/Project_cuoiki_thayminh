# CHƯƠNG 3. QUY TRÌNH DEMO PHÂN LOẠI TRỰC TIẾP TRÊN ĐIỆN THOẠI

## 3.1. Tổng quan

Sau khi huấn luyện thành công trên Edge Impulse Studio, mô hình được triển khai lên điện thoại di động thông qua **WebAssembly (WASM)**. Điện thoại đóng vai trò là thiết bị edge — thu thập dữ liệu rung động từ cảm biến gia tốc tích hợp và thực hiện suy luận (inference) ngay tại chỗ mà không cần gửi dữ liệu lên cloud.

## 3.2. Kiến trúc hệ thống demo

```
┌──────────────────────────────────────────────────┐
│              ĐIỆN THOẠI DI ĐỘNG                   │
│                                                  │
│  ┌─────────────┐    ┌──────────────────────┐     │
│  │ Cảm biến gia│    │  Trình duyệt Chrome  │     │
│  │ tốc MEMS    │───>│  (WebAssembly)       │     │
│  │ (accX,Y,Z)  │    │                      │     │
│  └─────────────┘    │  ┌────────────────┐  │     │
│                     │  │ Edge Impulse   │  │     │
│                     │  │ Model (Float32)│  │     │
│                     │  └───────┬────────┘  │     │
│                     │         │            │     │
│                     │  ┌──────▼──────────┐ │     │
│                     │  │  Kết quả:       │ │     │
│                     │  │  - Lớp phân loại│ │     │
│                     │  │  - Confidence % │ │     │
│                     │  │  - Anomaly score│ │     │
│                     │  └────────────────┘ │     │
│                     └──────────────────────┘     │
└──────────────────────────────────────────────────┘
```

## 3.3. Hai phương thức phân loại

### 3.3.1. Phương thức 1 — Live Sensor (Cảm biến trực tiếp)

Điện thoại tự thu dữ liệu từ cảm biến gia tốc và phân loại tự động theo chu kỳ:

| Bước | Nội dung |
|---|---|
| 1 | Người dùng nhấn **"Bắt đầu Live"** |
| 2 | Ứng dụng xin quyền cảm biến (iOS cần xác nhận) |
| 3 | Thu **125 mẫu** ở tốc độ ~62.5 Hz (~2 giây) |
| 4 | Gửi **375 features** (125 × 3 trục) lên Edge Impulse API |
| 5 | Hiển thị kết quả: lớp phân loại + confidence + anomaly score |
| 6 | Tự động lặp lại sau 3 giây |

### 3.3.2. Phương thức 2 — API với CSV thủ công

Người dùng dán dữ liệu CSV (`timestamp, accX, accY, accZ`) vào giao diện và nhấn phân loại. Thích hợp để kiểm thử với dữ liệu đã biết nhãn từ tập test CWRU.

## 3.4. Giao diện ứng dụng demo

Ứng dụng web được xây dựng bằng HTML/CSS/JavaScript thuần, chạy trên máy chủ cục bộ hoặc bất kỳ thiết bị nào trong cùng mạng Wi-Fi:

| Thành phần giao diện | Mô tả |
|---|---|
| Thanh chọn chế độ | Simulate / API Live / WASM Local |
| Khung hiển thị kết quả | Lớp dự đoán, confidence %, thanh xác suất 4 lớp |
| Khung Anomaly Detection | Thanh anomaly score, mức cảnh báo |
| Hiển thị cảm biến thời gian thực | Giá trị accX, accY, accZ + thanh tiến trình thu mẫu |
| Lịch sử phân loại | 10 kết quả gần nhất |

## 3.5. Test Cases — Kiểm thử trên điện thoại

Bảng 3.1 trình bày các test case để kiểm tra hệ thống demo.

| TC | Loại | Input | Kết quả mong đợi | Ghi chú |
|---|---|---|---|---|
| TC01 | Điện thoại đặt tĩnh | Đặt điện thoại trên mặt phẳng không rung | `normal`, confidence cao | Kiểm tra baseline |
| TC02 | Điện thoại rung nhẹ | Gõ nhẹ vào bàn giữ điện thoại | Anomaly score tăng nhẹ | Kiểm tra phát hiện bất thường |
| TC03 | CSV dữ liệu CWRU Normal | Nhập CSV từ tập test `normal` | `normal` ≥ 90% | Kiểm tra độ chính xác |
| TC04 | CSV dữ liệu CWRU Ball Fault | Nhập CSV từ tập test `ball_fault` | `ball_fault` ≥ 90% | Kiểm tra phân loại lỗi |
| TC05 | CSV dữ liệu CWRU Inner Race | Nhập CSV từ tập test `inner_race_fault` | `inner_race_fault` ≥ 90% | Kiểm tra phân loại lỗi |
| TC06 | CSV dữ liệu CWRU Outer Race | Nhập CSV từ tập test `outer_race_fault` | `outer_race_fault` ≥ 90% | Kiểm tra phân loại lỗi |

## 3.6. Tổng hợp kết quả demo

| Tiêu chí | Giá trị đạt được |
|---|---|
| Accuracy (tập test CWRU) | **100%** |
| Latency suy luận (API cloud) | ~200–500 ms (phụ thuộc mạng) |
| Giao diện | Web app chạy trên Chrome/Safari điện thoại |
| Cảm biến sử dụng | Accelerometer tích hợp điện thoại (DeviceMotionEvent API) |
| Tần số thu mẫu | ~62.5 Hz (16 ms/mẫu) |
| Cửa sổ phân tích | 2 giây (125 mẫu) |

## 3.7. Nhận xét chương

Hệ thống demo trên điện thoại hoạt động theo nguyên lý Edge AI: thu thập và phân tích dữ liệu trực tiếp tại thiết bị, không phụ thuộc máy chủ xử lý trung tâm. Kết quả 100% accuracy từ tập test CWRU xác nhận mô hình hoạt động đúng khi nhận dữ liệu đầu vào theo chuẩn định dạng. Đây là minh chứng cho khả năng ứng dụng TinyML trong bài toán dự đoán hỏng hóc động cơ thực tế.

---

**Tài liệu tham khảo chương này:**

[2] Edge Impulse, "Edge Impulse Documentation," Edge Impulse Docs. Available: https://docs.edgeimpulse.com/

[11] MDN Web Docs, "DeviceMotionEvent API," Mozilla Developer Network. Available: https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent
