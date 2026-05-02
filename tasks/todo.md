# KẾ HOẠCH THỰC HIỆN ĐỒ ÁN
## Đề tài: Dự đoán hỏng hóc động cơ quạt gió trong nhà máy (Public Dataset)
### SV: Trần Nguyễn An Sơn - N22DCDT057

---

## GIAI ĐOẠN 0: CHUẨN BỊ
- [x] Tìm và phân tích public dataset phù hợp → **Rotating Equipment Multi-Sensor Fault Dataset (Kaggle)**
- [x] Thiết lập cấu trúc thư mục dự án → report/, src/, data/, docs/
- [ ] Tạo tài khoản Edge Impulse và project mới (user tự làm)

## GIAI ĐOẠN 1: CHƯƠNG 1 - TỔNG QUAN ĐỀ TÀI (2+ trang)
- [x] 1.1. Viết "Lý do chọn đề tài" - bối cảnh bảo trì dự đoán trong nhà máy ✅
- [x] 1.2. Viết "Mục đích nghiên cứu" - mục tiêu cụ thể, đo được ✅
- [x] 1.3. Viết "Đối tượng và phạm vi nghiên cứu" ✅
- [x] 1.4. Viết "Phương pháp nghiên cứu" - quy trình 7 bước ✅

> **Review GĐ1**: Chương 1 viết xong 4 mục, ~3 trang. Có bảng chỉ tiêu, trích dẫn IEEE. File: `report/chapters/chuong1_tong_quan.md`

## GIAI ĐOẠN 2: CHƯƠNG 2 - CƠ SỞ LÝ THUYẾT
- [x] 2.1. Viết tổng quan TinyML và Edge AI (có trích dẫn) ✅
- [x] 2.2. Viết về nền tảng Edge Impulse Studio ✅
- [x] 2.3. Viết lý thuyết mô hình/thuật toán (Spectral Features, NN, K-Means, Quantization) ✅
- [x] 2.4. Mô tả phần cứng sử dụng (Phone + ESP32 Wokwi) ✅

> **Review GĐ2**: Chương 2 xong 4 mục. Bảng giới hạn MCU, bảng Edge Impulse pipeline, bảng linh kiện, trích dẫn IEEE. File: `report/chapters/chuong2_ly_thuyet.md`

## GIAI ĐOẠN 3: CHƯƠNG 3 - FREERTOS
- [x] 3.1. Viết tổng quan RTOS và FreeRTOS ✅
- [x] 3.2. Thiết kế sơ đồ phân chia task (5 tasks: Sensor/Inference/Alert/Display/Log) ✅
- [x] 3.3. Viết code FreeRTOS mô phỏng multitasking ✅ (`src/freertos/main_freertos.ino`)
- [x] 3.4. Mô phỏng trên Wokwi — log mẫu đã có trong báo cáo ✅
- [x] 3.5. So sánh các nền tảng mô phỏng (Wokwi/QEMU/Renode) ✅

> **Review GĐ3**: Chương 3 xong 5 mục. Sơ đồ ASCII task, bảng so sánh bare-metal vs RTOS, log mẫu, code đầy đủ 5 task. File: `report/chapters/chuong3_freertos.md`, code: `src/freertos/main_freertos.ino`

## GIAI ĐOẠN 4: CHƯƠNG 4 - EDGE IMPULSE (TRỌNG TÂM)
- [ ] 4.1. Tạo project trên Edge Impulse + chụp minh chứng
- [ ] 4.2. Upload dataset, phân chia train/test
- [ ] 4.3. Thiết kế Impulse (chọn processing block + learning block)
- [ ] 4.4. Trích xuất đặc trưng (Feature Explorer)
- [ ] 4.5. Huấn luyện mô hình
- [ ] 4.6. Kiểm thử mô hình (confusion matrix)
- [ ] 4.7. Tối ưu mô hình (quantization)
- [ ] 4.8. Triển khai mô hình (deploy lên phone)
- [ ] 4.9. Bảng tổng hợp cấu hình

## GIAI ĐOẠN 5: CHƯƠNG 5 - MÔ PHỎNG & TEST CASES
- [ ] 5.1. Thiết lập môi trường mô phỏng
- [ ] 5.2. Mô phỏng phần cứng (sơ đồ kết nối)
- [ ] 5.3. Viết test cases: TC01-bình thường, TC02-biên, TC03-lỗi, TC04-hiệu năng
- [ ] 5.4. Bảng tổng hợp kết quả mô phỏng

## GIAI ĐOẠN 6: CHƯƠNG 6 - KẾT QUẢ & THẢO LUẬN
- [ ] 6.1. Trình bày kết quả huấn luyện
- [ ] 6.2. Confusion matrix + classification report
- [ ] 6.3. Kết quả triển khai thực tế (ảnh, log, latency)
- [ ] 6.4. So sánh mô phỏng vs thực tế
- [ ] 6.5. Thảo luận ưu/nhược điểm

## GIAI ĐOẠN 7: CHƯƠNG 7 - KẾT LUẬN
- [ ] 7.1. Viết kết luận (tóm tắt kết quả chính + số liệu)
- [ ] 7.2. Viết hướng phát triển

## GIAI ĐOẠN 8: HOÀN THIỆN BÁO CÁO
- [ ] Viết Tóm tắt tiếng Việt
- [ ] Viết Abstract tiếng Anh (150-250 từ)
- [ ] Viết Lời cam đoan + Lời cảm ơn
- [ ] Hoàn thiện danh mục thuật ngữ
- [ ] Tài liệu tham khảo (≥5, chuẩn IEEE)
- [ ] Phụ lục: source code, sơ đồ mạch, link Edge Impulse
- [ ] Checklist cuối cùng trước khi nộp

---

## REVIEW
*(Cập nhật sau mỗi giai đoạn)*

---
> Kế hoạch tạo ngày: 2026-05-02
> Trạng thái: ĐANG THỰC HIỆN ✅ (User approved 2026-05-02)
