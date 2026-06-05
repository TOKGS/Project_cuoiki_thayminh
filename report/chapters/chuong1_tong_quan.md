# CHƯƠNG 1. TỔNG QUAN VỀ ĐỀ TÀI

## 1.1. Lý do chọn đề tài

Trong các nhà máy công nghiệp hiện đại, hệ thống quạt gió (industrial fan) đóng vai trò thiết yếu trong việc thông gió, tản nhiệt, vận chuyển khí và duy trì điều kiện làm việc an toàn cho thiết bị và con người. Khi động cơ quạt gió gặp sự cố — chẳng hạn lỗi vòng bi (bearing fault), mất cân bằng rotor (imbalance) hay quá nhiệt (overheating) — toàn bộ dây chuyền sản xuất có thể bị gián đoạn, gây tổn thất kinh tế lớn và tiềm ẩn nguy cơ an toàn lao động.

Theo thống kê từ các nghiên cứu về bảo trì công nghiệp, chi phí bảo trì sửa chữa (reactive maintenance) có thể cao gấp 3-10 lần so với bảo trì dự đoán (predictive maintenance) [1]. Phương pháp bảo trì truyền thống dựa trên lịch định kỳ (preventive maintenance) không tối ưu vì có thể thay thế linh kiện quá sớm (lãng phí) hoặc quá muộn (hỏng hóc bất ngờ). Bảo trì dự đoán — sử dụng dữ liệu cảm biến và trí tuệ nhân tạo để dự đoán thời điểm hỏng hóc — là giải pháp tiên tiến giúp giảm thiểu thời gian ngừng máy và tối ưu chi phí vận hành.

Sự phát triển của TinyML (Tiny Machine Learning) và Edge AI đã mở ra khả năng triển khai mô hình học máy trực tiếp trên các thiết bị có tài nguyên hạn chế, thay vì phụ thuộc vào máy chủ đám mây [1]. Điều này đặc biệt quan trọng trong môi trường nhà máy, nơi yêu cầu:
- **Thời gian đáp ứng nhanh**: Phát hiện lỗi trong mili-giây, không chờ truyền dữ liệu lên cloud.
- **Hoạt động offline**: Nhiều khu vực nhà máy không có kết nối internet ổn định.
- **Bảo mật dữ liệu**: Dữ liệu vận hành nhạy cảm được xử lý tại chỗ.
- **Tiết kiệm năng lượng**: Thiết bị nhúng tiêu thụ rất ít điện năng so với máy tính.

Nền tảng Edge Impulse Studio [2] cung cấp quy trình toàn diện từ thu thập dữ liệu, thiết kế mô hình, huấn luyện, tối ưu đến triển khai lên thiết bị nhúng hoặc điện thoại, phù hợp cho việc xây dựng hệ thống dự đoán hỏng hóc ngay trên thiết bị đích.

Từ các lý do trên, đề tài **"Dự đoán hỏng hóc động cơ quạt gió trong nhà máy"** được lựa chọn nhằm nghiên cứu và xây dựng hệ thống nhận dạng trạng thái động cơ dựa trên phân tích rung động, sử dụng Edge Impulse, demo phân loại trực tiếp trên điện thoại di động.

## 1.2. Mục đích nghiên cứu

Đề tài đặt ra các mục tiêu cụ thể, có thể đo lường được:

| Mục tiêu | Chỉ tiêu đánh giá | Minh chứng cần có |
|---|---|---|
| Xây dựng dataset từ public dataset phù hợp | Tối thiểu 4 lớp (Normal, Ball Fault, Inner Race Fault, Outer Race Fault), tỉ lệ train/test 80/20 | Ảnh Data Acquisition trên Edge Impulse và bảng mô tả dữ liệu |
| Huấn luyện mô hình phân loại trạng thái vòng bi | Accuracy ≥ 85%, F1-score ≥ 0.80 | Ảnh training results, confusion matrix, classification report |
| Triển khai mô hình lên điện thoại | Model size < 100 KB, latency < 100 ms | Ảnh deployment, ảnh điện thoại chạy demo live classification |
| Phát hiện bất thường (Anomaly Detection) | Anomaly score phản ánh đúng tình trạng bất thường | Kết quả K-Means anomaly trên tập test |

## 1.3. Đối tượng và phạm vi nghiên cứu

**Đối tượng nghiên cứu:**
- Dữ liệu rung động từ vòng bi động cơ (accelerometer, single axis).
- Mô hình học máy phân loại trạng thái hoạt động và phát hiện bất thường.
- Ứng dụng TinyML trên thiết bị di động.

**Phạm vi nghiên cứu:**
- **Dữ liệu**: Sử dụng CWRU Bearing Dataset từ Kaggle (`brjapon/cwru-bearing-datasets`), tập trung vào dữ liệu rung động (vibration) kênh Drive End.
- **Phần cứng mục tiêu**: Điện thoại di động (sử dụng cảm biến gia tốc tích hợp) để demo live classification.
- **Nền tảng AI**: Edge Impulse Studio cho toàn bộ quy trình ML pipeline.

**Giới hạn:**
- Đề tài sử dụng public dataset, không thu thập dữ liệu thực tế từ nhà máy.
- Demo trên điện thoại thay vì vi điều khiển chuyên dụng, do đó latency và power consumption chưa phản ánh chính xác điều kiện triển khai thực tế.

## 1.4. Phương pháp nghiên cứu

Đề tài được thực hiện theo quy trình 5 bước:

1. **Khảo sát lý thuyết và tài liệu liên quan**: Nghiên cứu về TinyML, Edge AI, Edge Impulse, các phương pháp phân tích rung động và bảo trì dự đoán. Tham khảo tutorial "Motion Recognition with Anomaly Detection" trên Edge Impulse [2].

2. **Xác định yêu cầu hệ thống**: Xác định dữ liệu (vibration 1-axis), số lớp phân loại (4 classes: normal, ball_fault, inner_race_fault, outer_race_fault), chỉ tiêu hiệu năng (accuracy, latency, RAM/Flash).

3. **Thu thập và tiền xử lý dữ liệu**: Tải CWRU Bearing Dataset từ Kaggle, gán nhãn, tiền xử lý (chuẩn hóa, chia window 2000 ms), upload lên Edge Impulse Studio và chia tập train/test theo tỉ lệ 80/20.

4. **Thiết kế impulse và huấn luyện mô hình**: Chọn Spectral Analysis làm processing block (trích xuất đặc trưng tần số FFT từ dữ liệu rung động), Classification (Keras) làm learning block, kết hợp Anomaly Detection (K-Means) để phát hiện trạng thái bất thường chưa biết.

5. **Tối ưu, triển khai và đánh giá**: Triển khai mô hình lên điện thoại qua Edge Impulse live classification. Phân tích confusion matrix, classification report, latency, RAM/Flash. Viết báo cáo theo mẫu tiểu luận cuối kỳ.

---

**Tài liệu tham khảo chương này:**

[1] P. Warden and D. Situnayake, *TinyML: Machine Learning with TensorFlow Lite on Arduino and Ultra-Low-Power Microcontrollers*. Sebastopol, CA, USA: O'Reilly Media, 2020.

[2] Edge Impulse, "Motion recognition with anomaly detection," Edge Impulse Documentation. Available: https://docs.edgeimpulse.com/tutorials/end-to-end/motion-recognition
