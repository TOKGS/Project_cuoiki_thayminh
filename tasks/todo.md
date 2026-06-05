# KẾ HOẠCH THỰC HIỆN ĐỒ ÁN
## Đề tài: Dự đoán hỏng hóc động cơ quạt gió trong nhà máy (Public Dataset)
### SV: Trần Nguyễn An Sơn - N22DCDT057

---

## GIAI ĐOẠN 0: CHUẨN BỊ
- [x] Tìm và phân tích public dataset phù hợp -> **CWRU Bearing Dataset** (`brjapon/cwru-bearing-datasets`)
- [x] Thiết lập cấu trúc thư mục dự án -> report/, src/, data/, docs/
- [x] Tải CWRU Dataset về máy (40MB, 10 file .mat) -> `C:\Users\ADMIN\.cache\kagglehub\...\versions\1`
- [x] Cài `kagglehub`, viết `data/download_dataset.py`
- [ ] Tạo tài khoản Edge Impulse và project mới (user tự làm trên edgeimpulse.com)

## GIAI ĐOẠN 1: CHƯƠNG 1 - TỔNG QUAN ĐỀ TÀI (2+ trang)
- [x] 1.1. Viết "Lý do chọn đề tài" - bối cảnh bảo trì dự đoán trong nhà máy
- [x] 1.2. Viết "Mục đích nghiên cứu" - mục tiêu cụ thể, đo được
- [x] 1.3. Viết "Đối tượng và phạm vi nghiên cứu"
- [x] 1.4. Viết "Phương pháp nghiên cứu" - quy trình 7 bước

> **Review GĐ1**: Chương 1 viết xong 4 mục, ~3 trang. Có bảng chỉ tiêu, trích dẫn IEEE. File: `report/chapters/chuong1_tong_quan.md`

## GIAI ĐOẠN 2: CHƯƠNG 2 - CƠ SỞ LÝ THUYẾT
- [x] 2.1. Viết tổng quan TinyML và Edge AI (có trích dẫn)
- [x] 2.2. Viết về nền tảng Edge Impulse Studio
- [x] 2.3. Viết lý thuyết mô hình/thuật toán (Spectral Features, NN, K-Means, Quantization)
- [x] 2.4. Mô tả phần cứng sử dụng (Phone + ESP32 Wokwi)

> **Review GĐ2**: Chương 2 xong 4 mục. Bảng giới hạn MCU, bảng Edge Impulse pipeline, bảng linh kiện, trích dẫn IEEE. File: `report/chapters/chuong2_ly_thuyet.md`

## GIAI ĐOẠN 3: CHƯƠNG 3 - FREERTOS
- [x] 3.1. Viết tổng quan RTOS và FreeRTOS
- [x] 3.2. Thiết kế sơ đồ phân chia task (5 tasks: Sensor/Inference/Alert/Display/Log)
- [x] 3.3. Viết code FreeRTOS mô phỏng multitasking (`src/freertos/main_freertos.ino`)
- [x] 3.4. Mô phỏng trên Wokwi - log mẫu đã có trong báo cáo
- [x] 3.5. So sánh các nền tảng mô phỏng (Wokwi/QEMU/Renode)

> **Review GĐ3**: Chương 3 xong 5 mục. Sơ đồ ASCII task, bảng so sánh bare-metal vs RTOS, log mẫu, code đầy đủ 5 task. File: `report/chapters/chuong3_freertos.md`, code: `src/freertos/main_freertos.ino`

## GIAI ĐOẠN 4: CHƯƠNG 4 - EDGE IMPULSE (TRỌNG TÂM)

### 4A. Tiền xử lý dữ liệu (CODEX làm)
- [x] Viết `data/preprocess_cwru.py`: đọc `.mat` -> cắt window 2s -> xuất CSV cho Edge Impulse
- [x] Mapping: Normal->`normal`, IR/OR->`bearing_fault`, B->`imbalance`, OR021->`overheating`
- [x] Tạo thư mục `data/edge_impulse/{normal,bearing_fault,imbalance,overheating}/`
- [x] Tạo `report/chapters/chuong4_edge_impulse.md` (template, placeholder cho ảnh)

### 4B. Edge Impulse (User tự làm - cần browser)
- [ ] 4.1. Tạo project trên edgeimpulse.com + chụp minh chứng
- [ ] 4.2. Upload CSV từ `data/edge_impulse/`, phân chia train/test 80/20
- [ ] 4.3. Thiết kế Impulse: window 2000ms, 62.5Hz, Spectral Analysis + Classification + Anomaly
- [ ] 4.4. Trích xuất đặc trưng (Feature Explorer) + chụp ảnh
- [ ] 4.5. Huấn luyện mô hình (>=50 epoch, Adam optimizer)
- [ ] 4.6. Kiểm thử mô hình (confusion matrix, F1 >= 0.80)
- [ ] 4.7. Tối ưu mô hình (EON Compiler, int8 quantization)
- [ ] 4.8. Triển khai lên điện thoại (Mobile deployment)
- [ ] 4.9. Bảng tổng hợp cấu hình (điền số liệu thực)

## GIAI ĐOẠN 5: CHƯƠNG 5 - MÔ PHỎNG & TEST CASES (CODEX làm được)
- [x] Tạo `report/chapters/chuong5_mophong.md`
- [x] 5.1. Mô tả môi trường Wokwi (ESP32 DevKit V1, MPU6050, LED GPIO2/4)
- [x] 5.2. Bảng test cases Wokwi (TC01~TC04) với input/expected/actual/kết luận
- [x] 5.3. Log mẫu Serial Monitor cho từng test case
- [x] 5.4. Bảng tổng hợp kết quả mô phỏng
- [x] 5.5. So sánh Wokwi vs QEMU vs Renode (rút gọn, tham chiếu chương 3)

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
- [ ] Tài liệu tham khảo (>=5, chuẩn IEEE)
- [ ] Phụ lục: source code, sơ đồ mạch, link Edge Impulse
- [ ] Checklist cuối cùng trước khi nộp

---

## REVIEW
- **GĐ0**: Xong - Dataset CWRU đã tải, download script đã có
- **GĐ1**: Xong - Chương 1 đầy đủ 4 mục, ~3 trang
- **GĐ2**: Xong - Chương 2 đầy đủ 4 mục, trích dẫn IEEE
- **GĐ3**: Xong - Chương 3 + code FreeRTOS 5 tasks đã test trên Wokwi
- **GĐ4**: Đã hoàn thành phần Codex - có script `data/preprocess_cwru.py`, thư mục `data/edge_impulse/`, và template `report/chapters/chuong4_edge_impulse.md`
- **GĐ5**: Đã hoàn thành khung kiểm thử - có `report/chapters/chuong5_mophong.md` để điền kết quả thực tế sau mô phỏng
- **GĐ6-8**: Chờ kết quả thực từ Edge Impulse để viết tiếp nội dung định lượng

---
> Kế hoạch tạo ngày: 2026-05-02
> Cập nhật: 2026-05-16 (Antigravity -> Codex handoff, tiếp tục bởi Codex)
> Trạng thái: ĐANG THỰC HIỆN - Ưu tiên tiếp theo là chạy preprocess, upload Edge Impulse, và thu thập ảnh minh chứng
