# CHƯƠNG 1. TỔNG QUAN VỀ ĐỀ TÀI

## 1.1. Lý do chọn đề tài

Trong các nhà máy công nghiệp hiện đại, hệ thống quạt gió (industrial fan) đóng vai trò thiết yếu trong việc thông gió, tản nhiệt, vận chuyển khí và duy trì điều kiện làm việc an toàn cho thiết bị và con người. Khi động cơ quạt gió gặp sự cố — chẳng hạn lỗi vòng bi (bearing fault), mất cân bằng rotor (imbalance) hay quá nhiệt (overheating) — toàn bộ dây chuyền sản xuất có thể bị gián đoạn, gây tổn thất kinh tế lớn và tiềm ẩn nguy cơ an toàn lao động.

Theo thống kê từ các nghiên cứu về bảo trì công nghiệp, chi phí bảo trì sửa chữa (reactive maintenance) có thể cao gấp 3-10 lần so với bảo trì dự đoán (predictive maintenance) [1]. Phương pháp bảo trì truyền thống dựa trên lịch định kỳ (preventive maintenance) không tối ưu vì có thể thay thế linh kiện quá sớm (lãng phí) hoặc quá muộn (hỏng hóc bất ngờ). Bảo trì dự đoán — sử dụng dữ liệu cảm biến và trí tuệ nhân tạo để dự đoán thời điểm hỏng hóc — là giải pháp tiên tiến giúp giảm thiểu thời gian ngừng máy và tối ưu chi phí vận hành.

Sự phát triển của TinyML (Tiny Machine Learning) và Edge AI đã mở ra khả năng triển khai mô hình học máy trực tiếp trên các thiết bị nhúng có tài nguyên hạn chế, thay vì phụ thuộc vào máy chủ đám mây [1]. Điều này đặc biệt quan trọng trong môi trường nhà máy, nơi yêu cầu:
- **Thời gian đáp ứng nhanh**: Phát hiện lỗi trong mili-giây, không chờ truyền dữ liệu lên cloud.
- **Hoạt động offline**: Nhiều khu vực nhà máy không có kết nối internet ổn định.
- **Bảo mật dữ liệu**: Dữ liệu vận hành nhạy cảm được xử lý tại chỗ.
- **Tiết kiệm năng lượng**: Vi điều khiển tiêu thụ rất ít điện năng so với máy tính.

Nền tảng Edge Impulse Studio [2] cung cấp quy trình toàn diện từ thu thập dữ liệu, thiết kế mô hình, huấn luyện, tối ưu đến triển khai lên thiết bị nhúng hoặc điện thoại, phù hợp cho việc xây dựng hệ thống dự đoán hỏng hóc ngay trên thiết bị đích.

Ngoài ra, việc áp dụng hệ điều hành thời gian thực FreeRTOS [4] cho phép quản lý đa nhiệm hiệu quả: thu thập dữ liệu cảm biến, chạy suy luận AI, hiển thị kết quả và gửi cảnh báo được thực hiện song song, đảm bảo tính đáp ứng và ổn định của hệ thống nhúng.

Từ các lý do trên, đề tài **"Dự đoán hỏng hóc động cơ quạt gió trong nhà máy"** được lựa chọn nhằm nghiên cứu và xây dựng hệ thống nhận dạng trạng thái động cơ dựa trên phân tích rung động, sử dụng Edge Impulse và FreeRTOS, demo trên điện thoại di động.

## 1.2. Mục đích nghiên cứu

Đề tài đặt ra các mục tiêu cụ thể, có thể đo lường được:

| Mục tiêu | Chỉ tiêu đánh giá | Minh chứng cần có |
|---|---|---|
| Xây dựng dataset từ public dataset phù hợp | Tối thiểu 4 lớp (Normal, Bearing Fault, Imbalance, Overheating), tỉ lệ train/test 80/20 | Ảnh Data Acquisition trên Edge Impulse và bảng mô tả dữ liệu |
| Huấn luyện mô hình phân loại trạng thái quạt gió | Accuracy ≥ 85%, F1-score ≥ 0.80 | Ảnh training results, confusion matrix, classification report |
| Triển khai mô hình lên điện thoại | Model size < 100 KB, latency < 100 ms | Ảnh deployment, serial log, ảnh điện thoại chạy demo |
| Áp dụng FreeRTOS quản lý đa nhiệm | Tối thiểu 5 task chạy song song (Sensor, Inference, Alert, Display, Log) | Sơ đồ task, log Serial Monitor chứng minh |
| Mô phỏng hệ thống trên nền tảng phù hợp | Tối thiểu 4 test case (bình thường, biên, lỗi, hiệu năng), ≥ 75% đạt | Ảnh Wokwi và bảng test case |

## 1.3. Đối tượng và phạm vi nghiên cứu

**Đối tượng nghiên cứu:**
- Dữ liệu rung động 3 trục (accelerometer X, Y, Z) từ động cơ quạt gió công nghiệp.
- Mô hình học máy phân loại trạng thái hoạt động và phát hiện bất thường.
- Hệ thống nhúng đa nhiệm sử dụng FreeRTOS.

**Phạm vi nghiên cứu:**
- **Dữ liệu**: Sử dụng public dataset "Rotating Equipment Multi-Sensor Fault Dataset" từ Kaggle, tập trung vào dữ liệu rung động (vibration).
- **Phần cứng mục tiêu**: Điện thoại di động (sử dụng cảm biến gia tốc tích hợp) để demo.
- **Nền tảng AI**: Edge Impulse Studio cho toàn bộ quy trình ML pipeline.
- **RTOS**: FreeRTOS mô phỏng trên Wokwi (ESP32).
- **Mô phỏng**: Wokwi (chính), có so sánh với QEMU và Renode.

**Giới hạn:**
- Đề tài sử dụng public dataset, không thu thập dữ liệu thực tế từ nhà máy.
- Demo trên điện thoại thay vì vi điều khiển chuyên dụng, do đó latency và power consumption chưa phản ánh chính xác điều kiện triển khai thực tế.
- Mô phỏng FreeRTOS trên Wokwi có giới hạn về tương thích peripheral so với phần cứng thật.

## 1.4. Phương pháp nghiên cứu

Đề tài được thực hiện theo quy trình 7 bước:

1. **Khảo sát lý thuyết và tài liệu liên quan**: Nghiên cứu về TinyML, Edge AI, Edge Impulse, FreeRTOS, các phương pháp phân tích rung động và bảo trì dự đoán. Tham khảo tutorial "Motion Recognition with Anomaly Detection" trên Edge Impulse [2].

2. **Xác định yêu cầu hệ thống**: Xác định phần cứng (phone), dữ liệu (vibration 3-axis), số lớp phân loại (4 classes), chỉ tiêu hiệu năng (accuracy, latency, RAM/Flash) và các test case cần kiểm thử.

3. **Thu thập và tiền xử lý dữ liệu**: Tải public dataset từ Kaggle, gán nhãn, tiền xử lý (chuẩn hóa, chia window), upload lên Edge Impulse Studio và chia tập train/validation/test theo tỉ lệ 80/20.

4. **Thiết kế impulse và huấn luyện mô hình**: Chọn Spectral Analysis làm processing block (trích xuất đặc trưng tần số từ dữ liệu rung động), Classification (Keras) làm learning block, kết hợp Anomaly Detection (K-Means) để phát hiện trạng thái bất thường chưa biết.

5. **Tối ưu và triển khai mô hình**: Quantization (int8), sử dụng EON Compiler để giảm model size. Triển khai lên điện thoại qua Edge Impulse mobile deployment.

6. **Thiết kế FreeRTOS và mô phỏng**: Phân chia 5 task (Sensor, Inference, Alert, Display, Log), mô phỏng trên Wokwi với ESP32. Kiểm thử multitasking qua Serial Monitor log.

7. **Đánh giá kết quả và viết báo cáo**: Phân tích confusion matrix, classification report, latency, RAM/Flash. So sánh kết quả mô phỏng và thực tế. Viết báo cáo theo mẫu tiểu luận cuối kỳ.

---

**Tài liệu tham khảo chương này:**

[1] P. Warden and D. Situnayake, *TinyML: Machine Learning with TensorFlow Lite on Arduino and Ultra-Low-Power Microcontrollers*. Sebastopol, CA, USA: O'Reilly Media, 2020.

[2] Edge Impulse, "Motion recognition with anomaly detection," Edge Impulse Documentation. Available: https://docs.edgeimpulse.com/tutorials/end-to-end/motion-recognition

[4] FreeRTOS, "FreeRTOS Documentation," Amazon Web Services. Available: https://www.freertos.org/Documentation/
