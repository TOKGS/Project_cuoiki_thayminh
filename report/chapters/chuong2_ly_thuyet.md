# CHƯƠNG 2. CƠ SỞ LÝ THUYẾT

## 2.1. Tổng quan về TinyML và Edge AI

### 2.1.1. Khái niệm

**Edge AI** là xu hướng triển khai các thuật toán trí tuệ nhân tạo trực tiếp trên các thiết bị ở "biên" của mạng (edge devices) — bao gồm smartphone, gateway, vi điều khiển — thay vì xử lý trên máy chủ trung tâm hay đám mây [1].

**TinyML (Tiny Machine Learning)** là một nhánh chuyên biệt của Edge AI, tập trung vào việc triển khai mô hình học máy trên các thiết bị tài nguyên hạn chế, hoạt động ở mức công suất miliwatt hoặc thấp hơn [1].

### 2.1.2. Lợi ích của xử lý tại biên (Edge Processing)

| Lợi ích | Mô tả |
|---|---|
| **Giảm độ trễ (Latency)** | Xử lý tại chỗ, không cần truyền lên cloud; thời gian đáp ứng đạt mức mili-giây |
| **Bảo mật & Riêng tư** | Dữ liệu nhạy cảm không rời khỏi thiết bị |
| **Hoạt động offline** | Không phụ thuộc kết nối internet, phù hợp môi trường nhà máy |
| **Tiết kiệm băng thông** | Chỉ truyền kết quả, không truyền raw data liên tục |
| **Tiết kiệm năng lượng** | Thiết bị tiêu thụ ít điện, phù hợp triển khai lâu dài |

### 2.1.3. Phân biệt: huấn luyện vs. suy luận

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
| 6 | **Deployment** | Xuất model sang WebAssembly cho điện thoại/trình duyệt, hoặc C++ library cho MCU |

### 2.2.2. Processing Block: Spectral Analysis

Với dữ liệu rung động (vibration), **Spectral Analysis** là processing block phù hợp nhất [2]. Block này:

1. Chia dữ liệu raw thành các cửa sổ thời gian (window) theo `window_size` và `window_increase`.
2. Áp dụng bộ lọc (low-pass hoặc high-pass filter) để loại bỏ nhiễu.
3. Tính **Spectral Power** (phân tích FFT): biểu diễn cường độ tín hiệu theo tần số — tần số đặc trưng xuất hiện khi động cơ quay theo chu kỳ nhất định.
4. Trích xuất các đặc trưng thống kê: RMS, Skewness, Kurtosis, Spectral Skewness, Spectral Kurtosis.

Các đặc trưng tần số này rất hữu ích vì các loại lỗi vòng bi khác nhau có đặc trưng tần số riêng biệt:
- **Ball Fault**: Xuất hiện peak ở tần số BSF (Ball Spin Frequency).
- **Inner Race Fault**: Xuất hiện peak ở tần số BPFI (Ball Pass Frequency Inner race).
- **Outer Race Fault**: Xuất hiện peak ở tần số BPFO (Ball Pass Frequency Outer race).
- **Normal**: Phổ tần số ổn định, không có peak bất thường.

### 2.2.3. Learning Block: Classification + Anomaly Detection

Đề tài sử dụng **hai learning block song song**:

- **Classification (Keras)**: Mạng nơ-ron phân loại 4 trạng thái (`normal`, `ball_fault`, `inner_race_fault`, `outer_race_fault`). Cho phép nhận dạng các lớp đã được huấn luyện.
- **Anomaly Detection (K-Means)**: Phát hiện các trường hợp bất thường *chưa từng thấy* trong tập huấn luyện, dựa trên khoảng cách Euclidean đến các cụm (cluster) đã học [2].

### 2.2.4. Deployment: WebAssembly cho điện thoại

Để demo trên điện thoại, Edge Impulse xuất model sang định dạng **WebAssembly (WASM)** — cho phép chạy mô hình trực tiếp trong trình duyệt web của điện thoại mà không cần cài đặt thêm ứng dụng. Model chạy ở định dạng **Float32 Unoptimized**, đảm bảo độ chính xác tối đa.

## 2.3. Lý thuyết về mô hình và thuật toán sử dụng

### 2.3.1. Mạng nơ-ron Dense (Fully Connected Neural Network)

Với dữ liệu đặc trưng tần số (đã qua Spectral Analysis), mạng nơ-ron dày (Fully Connected / Dense Network) được sử dụng vì:
- Dữ liệu đầu vào là vector đặc trưng 1 chiều (không phải ảnh 2D).
- Kích thước nhỏ gọn, phù hợp tài nguyên thiết bị.
- Hiệu năng tốt với bài toán phân loại đặc trưng tần số [1].

| Thành phần | Nội dung |
|---|---|
| **Input** | Vector 133 đặc trưng từ Spectral Analysis (accX), window 2000 ms, tần số 12,004.8 Hz |
| **Kiến trúc** | Dense[133] → Dense[20] → Dense[10] → Dense[40] → Softmax[4] |
| **Output** | 4 classes: `normal`, `ball_fault`, `inner_race_fault`, `outer_race_fault` + Anomaly Score |
| **Metrics** | Accuracy, Loss, Confusion Matrix, Latency (ms) |

### 2.3.2. Hàm mất mát và tối ưu

- **Loss function**: Categorical Cross-Entropy (phân loại đa lớp).
- **Optimizer**: Adam (adaptive moment estimation) — hội tụ nhanh, phù hợp với dataset không quá lớn.

### 2.3.3. Anomaly Detection — K-Means Clustering

K-Means phân cụm dữ liệu training thành K cụm trong không gian đặc trưng. Khi có sample mới:
- Tính khoảng cách đến cụm gần nhất.
- Nếu khoảng cách vượt ngưỡng → phát hiện **anomaly** (bất thường).

Trong Edge Impulse, kết hợp với **Feature Importance** để chọn các đặc trưng có tính phân biệt cao nhất.

### 2.3.4. Float32 vs. Int8 Quantization

| | Float32 (Unoptimized) | Int8 (Quantized) |
|---|---|---|
| **Mục tiêu triển khai** | Điện thoại / WebAssembly | MCU nhúng (Cortex-M, ARM) |
| **Độ chính xác** | Cao nhất | Giảm nhẹ (~1-3%) |
| **Tốc độ** | Phụ thuộc CPU thiết bị | Rất nhanh trên MCU có CMSIS-NN |
| **Kích thước model** | Lớn hơn | Nhỏ hơn ~4 lần |

Trong đề tài này, demo trên điện thoại sử dụng **Float32 Unoptimized** qua WebAssembly.

## 2.4. Phần cứng sử dụng

| Linh kiện | Thông số chính | Vai trò trong hệ thống |
|---|---|---|
| **Điện thoại Android/iOS** | Cảm biến gia tốc 3 trục (MEMS), CPU ARM Cortex | Chạy mô hình Edge Impulse qua WebAssembly, thu thập dữ liệu rung động, demo live classification |

> **Lưu ý**: Cảm biến gia tốc tích hợp trong điện thoại thay thế cho cảm biến rung động gắn trực tiếp vào động cơ. Trong triển khai thực tế, cần sử dụng MCU chuyên dụng với accelerometer MEMS có độ nhạy cao gắn trực tiếp vào thân máy quạt.

---

**Tài liệu tham khảo chương này:**

[1] P. Warden and D. Situnayake, *TinyML: Machine Learning with TensorFlow Lite on Arduino and Ultra-Low-Power Microcontrollers*. Sebastopol, CA, USA: O'Reilly Media, 2020.

[2] Edge Impulse, "Edge Impulse Documentation," Edge Impulse Docs. Available: https://docs.edgeimpulse.com/

[3] TensorFlow, "TensorFlow Lite for Microcontrollers," TensorFlow Documentation. Available: https://www.tensorflow.org/lite/microcontrollers

[10] M. Banbury et al., "MLPerf Tiny Benchmark," in *Proc. Neural Information Processing Systems (NeurIPS) Datasets and Benchmarks Track*, 2021.
