

**HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG**

**KHOA KỸ THUẬT ĐIỆN TỬ 2**

**DANH MỤC ĐỀ TÀI NGHIÊN CỨU / ĐỒ ÁN TỐT NGHIỆP**

# **1\. Mẫu đăng ký đề tài**

Sinh viên điền đầy đủ thông tin bên dưới và nộp cho giảng viên hướng dẫn. Nếu đề xuất đề tài mới (không có trong danh mục), cần điền đầy đủ phần Mô tả đề tài.

| PHIẮU ĐĂNG KÝ ĐỀ TÀI |  |
| ----- | :---- |
| **Họ và tên sinh viên** | Trần Nguyễn An Sơn |
| **MSSV** | N22DCDT057 |
| **Lớp** | D22CQDTDT01-N |
| **Email / SĐT liên lạc** | whoask4@gmail.com |
| **Mã đề tài chọn** | (Ví dụ: POSE-01, POSE-03, hoặc đề xuất mới) |
| **Tên đề tài** | Dự đoán hỏng hóc động cơ quạt gió trong nhà máy (public dataset).  |
| **Mô hình dự kiến** | (YOLO11n-pose, YOLO11s-pose, FOMO, ...) |
| **Phần cứng mục tiêu** | Phone |
| **Nguồn dữ liệu** | Public dataset  |
| **Lý do chọn đề tài** | Nghiên cứu ai để dự đoán được hỏng hóc quạt máy sử dụng |
| **Dự kiến kết quả** | Demo bằng điện thoại |
| Link tham khảo: [https://docs.edgeimpulse.com/tutorials/end-to-end/motion-recognition](https://docs.edgeimpulse.com/tutorials/end-to-end/motion-recognition) |  |

# **2\. Hướng dẫn thực hiện**

## **2.1. Quy trình chung**

Mỗi đề tài đều tuân theo quy trình 5 bước:

1. Thu thập dữ liệu: Sử dụng Edge Impulse Studio hoặc các nguồn public dataset, upload lên project.

2. Thiết kế Impulse: Chọn processing block (Image) và learning block (Object Detection / Classification) phù hợp.

3. Huấn luyện mô hình: Sử dụng YOLO-Pose (Ultralytics) hoặc FOMO/Transfer Learning trên Edge Impulse. Đánh giá bằng mAP, F1-score.

4. Tối ưu và xuất mô hình: Quantization (int8/float16), EON Compiler, kiểm tra RAM/Flash/Latency trên phần cứng mục tiêu.

5. Triển khai và demo: Flash firmware lên bo mạch, chạy inference thời gian thực, đo hiệu năng (FPS, độ chính xác, công suất).

## **2.2. Tiêu chí đánh giá**

| Tiêu chí | Trọng số | Mô tả |
| ----- | :---: | ----- |
| **Báo cáo kỹ thuật** | **30%** | Cấu trúc IMRaD, trình bày rõ ràng phương pháp, kết quả định lượng |
| **Demo sản phẩm** | **30%** | Hệ thống chạy thời gian thực trên phần cứng mục tiêu, đo FPS và độ chính xác |
| **Mã nguồn** | **20%** | Code sạch, có chú thích, tái lập được. Repo GitHub public hoặc Edge Impulse public project |
| **Bảo vệ** | **20%** | Trả lời câu hỏi, phân tích ưu/nhược điểm, đề xuất hướng cải tiến |

* 