# Dự Án Dự Đoán Hỏng Hóc Động Cơ Quạt Gió Trong Nhà Máy (TinyML & Edge AI)

> **Tiểu luận cuối kỳ môn học: Hệ Điều Hành Nhúng**  
> **Học viện Công nghệ Bưu chính Viễn thông - Cơ sở TP. Hồ Chí Minh (PTIT HCM)**  
> **Sinh viên thực hiện**: Trần Nguyễn An Sơn  
> **Mã số sinh viên**: N22DCDT057  

---

## 📋 Giới Thiệu Đề Tài

Dự án tập trung vào bài toán **Bảo trì dự đoán (Predictive Maintenance)** cho hệ thống quạt gió công nghiệp bằng phương pháp phân tích rung động (Vibration Analysis). Sử dụng công nghệ **TinyML / Edge AI** và nền tảng **Edge Impulse Studio**, mô hình học máy được huấn luyện và triển khai trực tiếp xuống thiết bị biên (điện thoại di động) để nhận dạng hỏng hóc trong thời gian thực mà không cần kết nối internet hay xử lý trên Cloud.

### Các trạng thái phân loại động cơ:
1. **Normal (`normal`)**: Động cơ hoạt động bình thường, không lỗi.
2. **Bearing Fault (`bearing_fault`)**: Lỗi vòng bi (hỏng hóc cơ học phổ biến nhất).
3. **Imbalance (`imbalance`)**: Lệch tâm cơ khí / mất cân bằng rotor.
4. **Overheating (`overheating`)**: Quá nhiệt cuộn dây stator hoặc quá tải động cơ.

---

## 🗂️ Cấu Trúc Thư Mục Dự Án

```text
EDGEIMPULSE/
├── data/                            # Thư mục chứa mã nguồn tải và xử lý dataset
│   ├── preprocess_cwru.py           # Tiền xử lý CWRU Bearing Dataset từ file .mat sang CSV
│   └── download_logo.js             # Script tự động tải PTIT logo cho bìa báo cáo
├── report/                          # Nội dung chi tiết báo cáo tiểu luận bằng Markdown
│   └── chapters/                    # Các chương từ Chương 1 đến Chương 5
│       ├── chuong1_tong_quan.md
│       ├── chuong2_ly_thuyet.md
│       ├── chuong3_quytrinhdemotrendienthoai.md
│       ├── chuong4_edge_impulse.md
│       └── chuong5_mophong.md
├── src/                             # Mã nguồn ứng dụng demo
│   └── edge_impulse/
│       └── live_classifier/         # Web App phân loại rung động thời gian thực trên điện thoại
│           ├── wasm/                # File WebAssembly (mô hình đã biên dịch EON Compiler)
│           ├── index.html & style.css
│           ├── app.js               # Logic điều khiển, thu mẫu gia tốc kế và suy luận
│           └── README.md            # Hướng dẫn chi tiết chạy Web App qua HTTPS
├── .gitignore                       # Cấu hình bỏ qua các thư mục node_modules, temp, .skill...
├── generate_docx.js                 # Script Node.js tự động compile các chương Markdown thành Word
├── TranNguyenAnSon_hedieuhanhnhung.docx # Báo cáo tiểu luận hoàn chỉnh (định dạng Word)
└── TranNguyenAnSon_hedieuhanhnhung.pdf  # Báo cáo tiểu luận hoàn chỉnh (định dạng PDF)
```

---

## ⚙️ Quy Trình Thực Hiện & Cài Đặt

### 1. Chuẩn bị Dữ liệu
* **Dataset**: Sử dụng **CWRU Bearing Dataset** từ Đại học Case Western Reserve.
* Chạy script để tự động tải, gán nhãn và cắt cửa sổ tín hiệu rung động (2000ms, bước trượt 200ms) xuất ra tệp CSV để chuẩn bị nạp vào Edge Impulse:
  ```bash
  python data/preprocess_cwru.py
  ```

### 2. Thiết kế và Huấn luyện Mô hình (Edge Impulse)
* Thiết kế **Impulse** trên Edge Impulse Studio (Project ID: `1019223`):
  * **Processing Block**: *Spectral Analysis* (Phân tích quang phổ, tính toán FFT 128 bins để trích xuất đặc trưng tần số).
  * **Learning Block**: *Classification (Dense Neural Network)* kết hợp *K-Means Anomaly Detection* để phát hiện các sự cố bất thường chưa được học.
* **Kết quả**: Mô hình đạt độ chính xác **100.0% Accuracy** trên cả tập kiểm thử (Test Set) và tập Validation.

### 3. Chạy Web App Demo Real-time trên Điện thoại
Do trình duyệt di động yêu cầu bảo mật nghiêm ngặt để cấp quyền truy cập cảm biến gia tốc (`DeviceMotionEvent`), ứng dụng web bắt buộc phải chạy qua giao thức **HTTPS**.

Thực hiện chạy cục bộ bằng cách:
1. Mở Terminal trong `src/edge_impulse/live_classifier` và chạy Server HTTP:
   ```bash
   python -m http.server 8080
   ```
2. Mở Terminal thứ 2 để tạo đường hầm bảo mật HTTPS (SSH Tunnel) trỏ ra Internet:
   ```bash
   ssh -o StrictHostKeyChecking=no -R 80:localhost:8080 nokey@localhost.run
   ```
3. Truy cập vào địa chỉ dạng `https://xxxx.lhr.life` hiển thị ở Terminal bằng điện thoại của bạn (khuyến nghị dùng Tab Ẩn danh để tránh lưu cache), cấp quyền cảm biến và bắt đầu kiểm thử nhận dạng!

---

## 📊 Kết Quả Huấn Luyện Mô Hình

| Chỉ số | Kết quả thực tế | Trạng thái mục tiêu | Đạt? |
|---|---|---|---|
| **Độ chính xác (Accuracy)** | **100.0%** | $\ge 85\%$ | ✅ Vượt mục tiêu |
| **Độ trễ suy luận (Latency)** | **< 1 ms** (on-device) | $< 100$ ms | ✅ Đạt |
| **Kích thước mô hình** | **~25 KB** (WebAssembly) | $< 100$ KB | ✅ Đạt |
| **Phát hiện bất thường** | Đang chạy tốt (K-Means) | Hoạt động ổn định | ✅ Đạt |

---

## 📄 Tài Liệu Báo Cáo Đính Kèm

Toàn bộ báo cáo tiểu luận đã được xuất bản trực tiếp trong thư mục gốc của repository này:
* 📘 Tệp Word chính thức: [TranNguyenAnSon_hedieuhanhnhung.docx](file:///c:/StudyStuff/EDGEIMPULSE/TranNguyenAnSon_hedieuhanhnhung.docx) (Được tạo tự động bằng Node.js script qua thư viện `docx`).
* 📕 Tệp PDF chính thức: [TranNguyenAnSon_hedieuhanhnhung.pdf](file:///c:/StudyStuff/EDGEIMPULSE/TranNguyenAnSon_hedieuhanhnhung.pdf) (Bản xuất trực tiếp chuẩn in ấn).
