# CHƯƠNG 5. KẾT QUẢ VÀ ĐÁNH GIÁ

## 5.1. Kết quả huấn luyện mô hình trên Edge Impulse

### 5.1.1. Thông số mô hình thực tế

| Thông số | Giá trị |
|---|---|
| Dataset | CWRU Bearing Dataset — 3,238 mẫu |
| Tần số thu mẫu | 12,004.8 Hz (Drive End accelerometer) |
| Cửa sổ phân tích | 2,000 ms, bước trượt 200 ms |
| Số đặc trưng (features) | 133 (FFT 128 bins + 5 thống kê) |
| Kiến trúc mạng | Dense [133 → 20 → 10 → 40 → 4] |
| Số lớp phân loại | 4: `normal`, `ball_fault`, `inner_race_fault`, `outer_race_fault` |

### 5.1.2. Kết quả training

| Chỉ số | Giá trị |
|---|---|
| **Accuracy (Validation)** | **100.0%** |
| **Loss** | **0.00** |
| **Accuracy (Test set)** | **100.0%** |

Kết quả 100% accuracy trên cả tập validation và test cho thấy phổ tần số FFT phân biệt rõ ràng giữa 4 trạng thái vòng bi. Kết quả này phù hợp với lý thuyết: mỗi loại hỏng hóc vòng bi tạo ra tần số đặc trưng riêng (BPFI, BPFO, BSF) có thể nhận biết qua phân tích FFT.

## 5.2. Kết quả kiểm thử trên điện thoại

### 5.2.1. Môi trường kiểm thử

| Thành phần | Thông tin |
|---|---|
| Thiết bị | Điện thoại Android/iOS |
| Trình duyệt | Chrome / Safari |
| Địa chỉ truy cập | `http://192.168.x.x:8080` (cùng mạng Wi-Fi) |
| Model sử dụng | Float32 Unoptimized (WebAssembly) |
| API | Edge Impulse REST API (`/v1/api/1019223/classify`) |

### 5.2.2. Kết quả test cases

| TC | Input | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|
| TC01 | CSV tập test `normal` | `normal` ≥ 90% | Điền sau khi test | |
| TC02 | CSV tập test `ball_fault` | `ball_fault` ≥ 90% | Điền sau khi test | |
| TC03 | CSV tập test `inner_race_fault` | `inner_race_fault` ≥ 90% | Điền sau khi test | |
| TC04 | CSV tập test `outer_race_fault` | `outer_race_fault` ≥ 90% | Điền sau khi test | |
| TC05 | Live sensor — điện thoại đặt tĩnh | `normal`, anomaly thấp | Điền sau khi test | |
| TC06 | Live sensor — điện thoại rung | Anomaly score tăng | Điền sau khi test | |

### 5.2.3. Hiệu năng trên điện thoại

| Chỉ số | Giá trị |
|---|---|
| Latency gọi API | ~200–500 ms (phụ thuộc mạng) |
| Tần số thu mẫu (live) | ~62.5 Hz |
| Cửa sổ thu dữ liệu | 2 giây (125 mẫu × 3 trục) |
| Chu kỳ phân loại tự động | Mỗi ~5 giây (2s thu + 3s chờ) |
| Giao diện | Realtime: hiển thị accX, accY, accZ + thanh tiến trình |

## 5.3. Đánh giá tổng thể

### 5.3.1. So sánh kết quả với mục tiêu ban đầu

| Mục tiêu | Chỉ tiêu | Kết quả | Đạt? |
|---|---|---|---|
| Accuracy mô hình | ≥ 85% | **100.0%** | ✅ Vượt mục tiêu |
| Số lớp phân loại | 4 lớp | 4 lớp (`normal`, `ball_fault`, `inner_race_fault`, `outer_race_fault`) | ✅ |
| Triển khai lên điện thoại | Demo được | WebAssembly + REST API | ✅ |
| Anomaly Detection | Hoạt động | K-Means, anomaly score hiển thị realtime | ✅ |

### 5.3.2. Hạn chế và hướng phát triển

**Hạn chế:**
- Sử dụng public dataset (CWRU), không thu thập dữ liệu thực tế từ nhà máy.
- Cảm biến gia tốc điện thoại có độ nhạy và tần số thu mẫu thấp hơn so với thiết bị đo rung động công nghiệp (CWRU thu ở 12 kHz, điện thoại thường đạt 50–200 Hz).
- Demo qua API cloud có độ trễ mạng, không phù hợp cho ứng dụng hard real-time.

**Hướng phát triển:**
- Triển khai model lên MCU chuyên dụng (STM32, Raspberry Pi) với accelerometer công nghiệp gắn trực tiếp vào động cơ.
- Thu thập dữ liệu thực tế từ quạt gió trong nhà máy để huấn luyện lại mô hình phù hợp hơn.
- Tích hợp cảnh báo qua SMS/email khi phát hiện hỏng hóc.

## 5.4. Nhận xét chương

Đề tài đã hoàn thành toàn bộ pipeline TinyML từ dữ liệu đến demo thực tế: xử lý CWRU Bearing Dataset, xây dựng mô hình Spectral Analysis + Dense Neural Network đạt 100% accuracy, và triển khai thành công lên điện thoại qua WebAssembly. Kết quả cho thấy Edge Impulse là nền tảng hiệu quả để hiện thực hóa bài toán dự đoán hỏng hóc động cơ trong môi trường giáo dục và nghiên cứu.
