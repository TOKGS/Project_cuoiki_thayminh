# CHƯƠNG 4. XÂY DỰNG MÔ HÌNH TRÊN EDGE IMPULSE

## 4.1. Giới thiệu nền tảng Edge Impulse trong đề tài

Edge Impulse Studio được sử dụng làm môi trường xây dựng pipeline TinyML cho bài toán phân loại hỏng hóc vòng bi động cơ. Nền tảng này cho phép thực hiện liên tục các bước tải dữ liệu, thiết kế impulse, trích xuất đặc trưng, huấn luyện, đánh giá và tối ưu mô hình ngay trên giao diện web [2]. Dự án thực tế của đề tài là **N22DCDT057_NhanDienHongHoc** (Project ID: 1019223) đã được hoàn thành và công khai tại: `https://studio.edgeimpulse.com/public/1019223/live`.

## 4.2. Chuẩn bị và nạp dữ liệu

### 4.2.1. Nguồn dữ liệu

Bộ dữ liệu sử dụng là **CWRU Bearing Dataset** được tải từ Kaggle (`brjapon/cwru-bearing-datasets`). Các tệp `.mat` được trích xuất kênh `DE_time` (Drive End accelerometer) và xử lý thành các mẫu CSV theo cửa sổ 2 giây.

### 4.2.2. Ánh xạ nhãn

| File gốc CWRU | Nhãn trong đề tài | Giải thích |
|---|---|---|
| `Normal_1_098.mat` | `normal` | Hoạt động bình thường |
| `B007 / B014 / B021` | `ball_fault` | Lỗi bi lăn (Ball Fault) |
| `IR007 / IR014 / IR021` | `inner_race_fault` | Lỗi vòng trong (Inner Race Fault) |
| `OR007 / OR014 / OR021` | `outer_race_fault` | Lỗi vòng ngoài (Outer Race Fault) |

### 4.2.3. Thống kê bộ dữ liệu sau khi tải lên

| Thông số | Giá trị thực tế |
|---|---|
| Tổng số mẫu | **3,238 mẫu** |
| Tổng thời gian dữ liệu | **5 phút 43 giây** |
| Tỷ lệ train / test | 80% / 20% |
| Tần số lấy mẫu | **12,004.8 Hz** (tốc độ thực của CWRU Drive End) |
| Trục cảm biến | `accX` (1 trục rung động chính) |
| Cửa sổ lấy mẫu | 2,000 ms |
| Bước trượt (stride) | 200 ms |

> Ghi chú: CWRU Bearing Dataset có tần số thu mục 12 kHz, khác với tần số 62.5 Hz trên MPU6050 của mạch ESP32. Edge Impulse tiếp nhận trực tiếp tần số 12 kHz và tự động cấu hình DSP phù hợp. Mạch ESP32 thu thập dữ liệu thực tế ở 62.5 Hz, do đó ở bước triển khai thực tế cần quan tâm sự khác biệt này.

## 4.3. Thiết kế Impulse

Trong mục **Impulse design**, cấu hình thực tế được cài đặt như sau:

| Thành phần | Cấu hình thực tế |
|---|---|
| Input data | Acceleration data (accX) |
| Window size | **2,000 ms** |
| Window increase (stride) | **200 ms** |
| Frequency | **12,004.8 Hz** |
| Processing block | Spectral Analysis |
| Learning block 1 | Classification (Keras) |
| Learning block 2 | Anomaly Detection (K-Means) |
| Số lớp đầu ra | 4 lớp |

> Bổ sung 2 khối song song (Classification + Anomaly Detection) cho phép hệ thống vừa phân loại chính xác trạng thái hỏng hóc, vừa cảnh báo khi gặp tín hiệu bất thường ngoài phạm vi huấn luyện.

## 4.4. Khối xử lý đặc trưng: Spectral Analysis

### 4.4.1. Tham số cài đặt

Khối **Spectral Analysis** được cấu hình với các tham số cụ thể như sau:

| Tham số | Giá trị thực tế | Ý nghĩa |
|---|---|---|
| Scale axes | 1 | Không thu phóng dữ liệu |
| Input decimation ratio | 1 | Giữ nguyên độ phân giải tần số |
| Filter type | **None** | Không lọc trước tín hiệu |
| FFT length | **256 điểm** | Độ phân giải tần số: 46.89 Hz/bin |
| Take log of spectrum | **True** | Lấy log biên độ để ổn định hóa |
| Overlap FFT frames | **True** | Tăng số lượng frame cho phân tích |
| Number of peaks | 0 | Không trích xuất đặc trưng tần số đỉnh |

### 4.4.2. Kết quả trích xuất đặc trưng

Sau khi xử lý, mỗi mẫu sinh ra **133 đặc trưng** gồm:

| Nhóm đặc trưng | Số lượng | Chi tiết |
|---|---|---|
| Đặc trưng thống kê | 5 | RMS, Skewness, Kurtosis, Spectral Skewness, Spectral Kurtosis |
| Phổ công suất FFT | 128 | Các bin tần số từ 23.45 Hz đến 6,002.4 Hz (độ rộng 46.89 Hz/bin) |
| **Tổng cộng** | **133** | Vector đặc trưng đầu vào mô hình |

> 128 bin phổ tương ứng với FFT 256 điểm (lấy nửa phổ dương, loại bin DC = 128 bin hữu ích). Độ phân giải 46.89 Hz/bin phù hợp để phân biệt các tần số hư hỏng đặc trưng của vòng bi.

## 4.5. Huấn luyện mô hình phân loại (Keras)

### 4.5.1. Kiến trúc mạng neural

Mô hình **Classification** sử dụng mạng neural đầy đủ (Dense Neural Network) với kiến trúc:

| Lớp | Số neuron | Ghi chú |
|---|---|---|
| Input | 133 | = số đặc trưng Spectral Analysis |
| Dense 1 | **20** | Lớp ẩn thứ nhất |
| Dense 2 | **10** | Lớp ẩn thứ hai |
| Dense 3 | **40** | Lớp ẩn thứ ba |
| Output (Softmax) | **4** | 4 lớp: normal, ball_fault, inner_race_fault, outer_race_fault |

### 4.5.2. Kết quả huấn luyện

| Chỉ số | Giá trị thực tế |
|---|---|
| **Accuracy (Validation set)** | **100.0%** |
| **Loss (Validation set)** | **0.00** |
| Số lớp phân loại | 4 |
| Kết quả Confusion Matrix | Tất cả 4 lớp được phân loại chính xác 100% |

> Kết quả 100% accuracy trên tập validation cho thấy đặc trưng phổ công suất FFT phân biệt rất rõ ràng giữa các trạng thái hỏng hóc vòng bi. Điều này phù hợp với lý thuyết: mỗi loại lỗi vòng bi tạo ra tần số hư hỏng đặc trưng (BPFI, BPFO, BSF) có thể nhận biết qua phổ tần số.

### 4.5.3. Hiệu năng trên thiết bị - Phân biệt 2 chế độ triển khai

Edge Impulse hỗ trợ 2 con đường triển khai khác nhau, ảnh hưởng đến loại model sử dụng:

| Chế độ triển khai | Model sử dụng | Phù hợp với |
|---|---|---|
| **WebAssembly (Browser/Phone)** | **Float32 Unoptimized** | Demo trên điện thoại, trình duyệt |
| **C++ Library / Firmware** | **Int8 Quantized** | MCU nhúng (STM32, ESP32, Cortex-M) |

**Trong đề tài này, demo trên điện thoại sử dụng WebAssembly (float32).**

#### Hiệu năng model Float32 (Phone / WebAssembly)

| Chỉ số | Giá trị thực tế |
|---|---|
| **Accuracy (Validation)** | **100.0%** |
| **Loss** | **0.00** |
| Latency trên điện thoại | Phụ thuộc CPU điện thoại (~5-50 ms tùy thiết bị) |
| Kích thước WASM | ~200-500 KB (bao gồm runtime WebAssembly) |

> Ghi chú: Các chỉ số RAM 1.7 KB và Flash 17.7 KB trên Cortex-M4F 80 MHz chỉ áp dụng cho trường hợp xuất C++ library cho MCU nhúng, không áp dụng cho chế độ phone/WebAssembly. Khi chạy trên trình duyệt điện thoại, bộ nhớ được cấp phát bởi JavaScript runtime và không bị giới hạn khắt khe như MCU.

## 4.6. Khối Anomaly Detection (K-Means)

Song song với Classification, khối **Anomaly Detection** sử dụng thuật toán K-Means được thêm vào để:
- Phát hiện các mẫu rung động không thuộc 4 lớp đã huấn luyện.
- Cảnh báo khi có tình huống hư hỏng mới mà mô hình chưa học.

| Tham số | Giá trị |
|---|---|
| Thuật toán | K-Means clustering |
| Đầu ra | Anomaly score (giá trị thực, càng cao = càng bất thường) |
| Ngưỡng cảnh báo | Xác định theo ứng dụng thực tế |

## 4.7. Đánh giá tổng thể mô hình

### 4.7.1. Kết quả phân loại (Float32 - WebAssembly / Phone)

| Chỉ số | Giá trị thực tế |
|---|---|
| Accuracy (Validation set) | **100.0%** |
| Accuracy (Test set) | **100.0%** |
| Loss | **0.00** |
| Mô hình sử dụng khi demo điện thoại | **Float32 Unoptimized** (WebAssembly) |

### 4.7.2. Tham khảo: Hiệu năng nếu triển khai lên MCU (Int8 Quantized)

Nếu trong tương lai muốn chuyển từ phone sang MCU nhúng (STM32, ESP32...), Edge Impulse đã sẵn sàng xuất C++ library với model int8 có hiệu năng:

| Chỉ số | Giá trị (tham khảo - MCU Cortex-M4F 80 MHz) |
|---|---|
| Latency | 1 ms |
| Peak RAM | 1.7 KB |
| Flash | 17.7 KB |

### 4.7.3. Tổng hợp cấu hình và hiệu năng

| Nội dung | Giá trị thực tế |
|---|---|
| Dataset | CWRU Bearing Dataset - 3,238 mẫu, 5 phút 43 giây |
| Số lớp | 4 (`normal`, `ball_fault`, `inner_race_fault`, `outer_race_fault`) |
| Tần số lấy mẫu | 12,004.8 Hz |
| Cửa sổ phân tích | 2,000 ms (bước trượt 200 ms) |
| Processing block | Spectral Analysis (FFT 256 điểm, 133 đặc trưng) |
| Learning block | Dense NN [133 → 20 → 10 → 40 → 4] + K-Means Anomaly |
| Accuracy | **100.0%** (validation + test) |
| Mô hình sử dụng khi demo | **Float32 Unoptimized** (WebAssembly - chạy trên điện thoại) |

### 4.7.4. Nhận xét chương

Đề tài đã xây dựng thành công pipeline TinyML trên Edge Impulse với kết quả vượt mức mục tiêu đặt ra (accuracy >= 85%). Kết quả 100% accuracy được giải thích bởi:

1. **Dữ liệu CWRU có tính tách biệt cao**: Phổ rung động của các loại hỏng hóc vòng bi có tần số đặc trưng riêng biệt, đầy đủ phân biệt khi dùng FFT.
2. **Đặc trưng phổ công suất phù hợp**: 128 bin FFT + 5 đặc trưng thống kê tạo thành vector 133 chiều đủ phong phú để phân biệt 4 lớp.
3. **Mô hình kiến trúc đơn giản nhưng hiệu quả**: 3 lớp ẩn với tổng 70 neuron đủ để học biết 4 phân phối lớp tách biệt.

Hiệu năng 1 ms suy luận và 1.7 KB RAM cho thấy mô hình có thể triển khai tức thời trên các MCU như STM32F4 hoặc ESP32, đảm bảo tính năng thời gian thực của hệ thống giám sát động cơ.
