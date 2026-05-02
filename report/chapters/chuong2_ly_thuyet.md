# CHƯƠNG 2. CƠ SỞ LÝ THUYẾT

## 2.1. Tổng quan về TinyML và Edge AI

### 2.1.1. Khái niệm

**Edge AI** là xu hướng triển khai các thuật toán trí tuệ nhân tạo trực tiếp trên các thiết bị ở "biên" của mạng (edge devices) — bao gồm smartphone, gateway, vi điều khiển — thay vì xử lý trên máy chủ trung tâm hay đám mây [1].

**TinyML (Tiny Machine Learning)** là một nhánh chuyên biệt của Edge AI, tập trung vào việc triển khai mô hình học máy trên các thiết bị nhúng tài nguyên cực hạn (microcontrollers — MCU), hoạt động ở mức công suất miliwatt hoặc thấp hơn [1]. TinyML đẩy ngưỡng xử lý xuống "extreme edge", nơi RAM thường chỉ từ 4 KB đến 512 KB và Flash từ 32 KB đến 2 MB.

### 2.1.2. Lợi ích của xử lý tại biên (Edge Processing)

| Lợi ích | Mô tả |
|---|---|
| **Giảm độ trễ (Latency)** | Xử lý tại chỗ, không cần truyền lên cloud; thời gian đáp ứng đạt mức mili-giây |
| **Bảo mật & Riêng tư** | Dữ liệu nhạy cảm không rời khỏi thiết bị |
| **Hoạt động offline** | Không phụ thuộc kết nối internet, phù hợp môi trường nhà máy |
| **Tiết kiệm băng thông** | Chỉ truyền kết quả, không truyền raw data liên tục |
| **Tiết kiệm năng lượng** | MCU tiêu thụ vài mW, cho phép hoạt động từ pin nhiều tháng |

### 2.1.3. Giới hạn tài nguyên trên thiết bị nhúng

| Tài nguyên | Phạm vi điển hình (MCU) | Ý nghĩa với TinyML |
|---|---|---|
| **RAM (SRAM)** | 4 KB – 512 KB | Giới hạn kích thước activation và buffer runtime |
| **Flash** | 32 KB – 2 MB | Giới hạn kích thước model weights + firmware |
| **Tốc độ xử lý** | 16 MHz – 200 MHz | Ảnh hưởng trực tiếp đến latency suy luận |
| **Công suất** | µW – mW | Ảnh hưởng đến thời lượng pin |

### 2.1.4. Phân biệt: huấn luyện vs. suy luận

- **Huấn luyện (Training)**: Thực hiện trên máy tính/máy chủ (hoặc nền tảng cloud như Edge Impulse Studio). Yêu cầu tài nguyên lớn: GPU, RAM nhiều GB.
- **Suy luận (Inference)**: Sau khi huấn luyện xong, mô hình được tối ưu và triển khai lên thiết bị đích. Chỉ cần thực hiện phép tính forward pass với tài nguyên tối thiểu.

Trong đề tài này, quá trình huấn luyện được thực hiện hoàn toàn trên **Edge Impulse Studio** (cloud), còn suy luận được thực hiện trực tiếp trên **điện thoại di động** thời gian thực.

## 2.2. Nền tảng Edge Impulse Studio

Edge Impulse là nền tảng phát triển TinyML toàn diện, cung cấp quy trình từ thu thập dữ liệu đến triển khai, được thiết kế để hoạt động với cả thiết bị nhúng lẫn điện thoại thông minh [2].

### 2.2.1. Các bước chính trong Edge Impulse

| Bước | Tên | Mô tả |
|---|---|---|
| 1 | **Data Acquisition** | Thu thập dữ liệu từ thiết bị, upload CSV/JSON hoặc kết nối trực tiếp |
| 2 | **Impulse Design** | Thiết kế pipeline: chọn processing block và learning block |
| 3 | **Feature Extraction** | Trích xuất đặc trưng từ raw data theo processing block đã chọn |
| 4 | **Model Training** | Huấn luyện mô hình trên Edge Impulse cloud, cấu hình epochs/learning rate |
| 5 | **Model Testing** | Đánh giá trên tập test, xem confusion matrix và classification report |
| 6 | **Deployment** | Xuất model sang firmware, thư viện C++, hoặc WebAssembly cho phone |

### 2.2.2. Processing Block: Spectral Analysis

Với dữ liệu rung động (vibration), **Spectral Analysis** là processing block phù hợp nhất [2]. Block này:

1. Chia dữ liệu raw thành các cửa sổ thời gian (window) theo `window_size` và `window_increase`.
2. Áp dụng bộ lọc (low-pass hoặc high-pass filter) để loại bỏ nhiễu.
3. Tính **Spectral Power** (phân tích FFT): biểu diễn cường độ tín hiệu theo tần số — tần số đặc trưng xuất hiện khi động cơ quay theo chu kỳ nhất định.
4. Trích xuất các đặc trưng: RMS (Root Mean Square), Peak, Power theo từng dải tần số, trên mỗi trục (X, Y, Z).

Các đặc trưng tần số này rất hữu ích vì các loại lỗi động cơ khác nhau có đặc trưng tần số khác nhau:
- **Bearing fault**: Xuất hiện peak ở tần số đặc trưng của bi (BPFI, BPFO, BSF, FTF).
- **Imbalance**: Xuất hiện peak lớn ở tần số quay (1× RPM).
- **Normal**: Phổ tần số ổn định, không có peak bất thường.

### 2.2.3. Learning Block: Classification + Anomaly Detection

Đề tài sử dụng **hai learning block song song**:

- **Classification (Keras)**: Mạng nơ-ron phân loại 4 trạng thái (Normal, Bearing Fault, Imbalance, Overheating). Cho phép nhận dạng các lớp đã được huấn luyện.
- **Anomaly Detection (K-Means)**: Phát hiện các trường hợp bất thường *chưa từng thấy* trong tập huấn luyện, dựa trên khoảng cách Euclidean đến các cụm (cluster) đã học [2]. Rất hữu ích khi có các loại lỗi mới xuất hiện trong nhà máy.

## 2.3. Lý thuyết về mô hình và thuật toán sử dụng

### 2.3.1. Mạng nơ-ron tích chập đơn giản (Fully Connected Neural Network)

Với dữ liệu đặc trưng tần số (đã qua Spectral Analysis), mạng nơ-ron dày (Fully Connected / Dense Network) được sử dụng vì:
- Dữ liệu đầu vào là vector đặc trưng 1 chiều (không phải ảnh 2D).
- Kích thước nhỏ gọn, phù hợp tài nguyên thiết bị nhúng.
- Hiệu năng tốt với bài toán phân loại đặc trưng tần số [1].

| Thành phần | Nội dung |
|---|---|
| **Input** | Vector đặc trưng tần số từ Spectral Analysis (accX, accY, accZ), window 2000 ms, sample rate 62.5 Hz |
| **Preprocessing** | Chuẩn hóa (normalization), FFT, tính RMS/Peak/Power theo dải tần |
| **Model** | Fully Connected Neural Network (2–3 lớp Dense + Dropout), softmax output |
| **Output** | 4 classes: Normal, Bearing Fault, Imbalance, Overheating + Anomaly Score |
| **Metrics** | Accuracy, Precision, Recall, F1-score, Confusion Matrix, Latency (ms), RAM/Flash (KB) |

### 2.3.2. Hàm mất mát và tối ưu

- **Loss function**: Categorical Cross-Entropy (phân loại đa lớp).
- **Optimizer**: Adam (adaptive moment estimation) — hội tụ nhanh, phù hợp với dataset không quá lớn.
- **Regularization**: Dropout để tránh overfitting.

### 2.3.3. Anomaly Detection — K-Means Clustering

K-Means phân cụm dữ liệu training thành K cụm trong không gian đặc trưng. Khi có sample mới:
- Tính khoảng cách đến cụm gần nhất.
- Nếu khoảng cách vượt ngưỡng → phát hiện **anomaly** (bất thường).

Trong Edge Impulse, số cluster K = 32 được khuyến nghị [2], kết hợp với **Feature Importance** để chọn các trục đặc trưng nhất (thường là RMS của accX, accY, accZ).

### 2.3.4. Quantization (Tối ưu hóa mô hình)

Để triển khai lên thiết bị nhúng, mô hình được **quantize từ float32 → int8**:
- Giảm kích thước model ~4 lần.
- Giảm thời gian suy luận.
- Hao hụt độ chính xác thường < 1–3%.

Edge Impulse sử dụng **EON Compiler** để tối ưu thêm về RAM và tốc độ thực thi trên MCU cụ thể.

## 2.4. Phần cứng sử dụng

Đề tài này sử dụng **điện thoại di động** làm phần cứng mục tiêu để demo, và **ESP32 trên Wokwi** để mô phỏng hệ thống FreeRTOS.

| Linh kiện | Thông số chính | Vai trò trong hệ thống | Nguồn tham khảo |
|---|---|---|---|
| **Điện thoại Android/iOS** | Cảm biến gia tốc 3 trục (MEMS), CPU ARM Cortex | Chạy mô hình Edge Impulse, thu thập dữ liệu rung động, demo inference | Edge Impulse Mobile Docs [2] |
| **ESP32 (Wokwi sim)** | Dual-core 240 MHz, 520 KB SRAM, 4 MB Flash, Wi-Fi/BT | Mô phỏng FreeRTOS đa nhiệm: thu cảm biến, inference, cảnh báo, log | Espressif Datasheet [5] |
| **Cảm biến gia tốc (sim)** | 3 trục (X, Y, Z), sample rate 62.5 Hz | Giả lập dữ liệu rung động động cơ quạt gió | — |
| **LED/Serial Output** | GPIO + UART | Hiển thị kết quả phân loại và cảnh báo lỗi | — |

> **Lưu ý**: Vì demo trên điện thoại, cảm biến gia tốc tích hợp thay thế cho cảm biến rung động gắn trực tiếp vào động cơ. Trong triển khai thực tế, cần sử dụng MCU chuyên dụng với accelerometer MEMS có độ nhạy cao (ví dụ: MPU-6050, ADXL345) gắn trực tiếp vào thân máy quạt.

---

**Tài liệu tham khảo chương này:**

[1] P. Warden and D. Situnayake, *TinyML: Machine Learning with TensorFlow Lite on Arduino and Ultra-Low-Power Microcontrollers*. Sebastopol, CA, USA: O'Reilly Media, 2020.

[2] Edge Impulse, "Edge Impulse Documentation," Edge Impulse Docs. Available: https://docs.edgeimpulse.com/

[3] TensorFlow, "TensorFlow Lite for Microcontrollers," TensorFlow Documentation. Available: https://www.tensorflow.org/lite/microcontrollers

[5] Espressif Systems, "ESP32 Technical Reference Manual," Espressif Docs. Available: https://docs.espressif.com/projects/esp-idf/

[10] M. Banbury et al., "MLPerf Tiny Benchmark," in *Proc. Neural Information Processing Systems (NeurIPS) Datasets and Benchmarks Track*, 2021.
