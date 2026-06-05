# CODEX PLAN — Dự đoán hỏng hóc động cơ quạt gió
## (Context handoff từ Antigravity → Codex)
> Ngày tạo: 2026-05-16 | SV: Trần Nguyễn An Sơn — N22DCDT057

---

## 🏗️ TỔNG QUAN DỰ ÁN

**Đề tài**: Dự đoán hỏng hóc động cơ quạt gió trong nhà máy  
**Môn học**: Hệ điều hành nhúng — PTIT HCM  
**GVHD**: ThS. Hồ Nhựt Minh | **Lớp**: D22CQDTDT01-N  
**Stack công nghệ**: Edge Impulse + FreeRTOS + ESP32 (Wokwi) + CWRU Dataset

### Cấu trúc thư mục
```
d:\Project_thay_minh\
├── CLAUDE.md               ← Quy trình làm việc (đọc trước)
├── data/
│   └── download_dataset.py ← Script tải CWRU dataset
├── report/
│   └── chapters/
│       ├── chuong1_tong_quan.md    ✅ XONG
│       ├── chuong2_ly_thuyet.md   ✅ XONG
│       └── chuong3_freertos.md    ✅ XONG
├── src/
│   └── freertos/
│       ├── main_freertos.ino      ✅ XONG (5 FreeRTOS tasks)
│       ├── diagram.json           ✅ XONG (Wokwi ESP32 DevKit V1)
│       └── wokwi.toml             ✅ XONG
├── tasks/
│   ├── todo.md                    ← Checklist tiến độ
│   ├── lessons.md                 ← Bài học đã rút ra
│   └── CODEX_PLAN.md              ← File này
└── Mau_tieu_luan_...docx.md       ← Mẫu báo cáo gốc (666 dòng)
```

---

## ✅ ĐÃ HOÀN THÀNH (ĐỪNG LÀM LẠI)

| Giai đoạn | Nội dung | File |
|---|---|---|
| Chương 1 | Tổng quan đề tài (lý do, mục tiêu, phạm vi, phương pháp) | `report/chapters/chuong1_tong_quan.md` |
| Chương 2 | Cơ sở lý thuyết (TinyML, Edge Impulse, FCNN, K-Means, Quantization) | `report/chapters/chuong2_ly_thuyet.md` |
| Chương 3 | FreeRTOS (lý thuyết + 5 tasks + log mẫu + so sánh Wokwi/QEMU/Renode) | `report/chapters/chuong3_freertos.md` |
| Code FreeRTOS | ESP32 + MPU6050, 5 tasks, Queue, Mutex, Mock inference | `src/freertos/main_freertos.ino` |
| Dataset | Đã tải CWRU Bearing Dataset qua kagglehub | `C:\Users\ADMIN\.cache\kagglehub\datasets\brjapon\cwru-bearing-datasets\versions\1` |

---

## 🎯 VIỆC CẦN LÀM TIẾP THEO

### GIAI ĐOẠN 4: CHƯƠNG 4 — EDGE IMPULSE (ƯU TIÊN CAO NHẤT)

Chương này **bắt buộc có ảnh chụp màn hình** từ Edge Impulse Studio — Codex không thể tự làm thay phần thao tác trình duyệt. Tuy nhiên Codex CÓ THỂ làm được:

#### Task 4A — Tiền xử lý CWRU Dataset thành CSV cho Edge Impulse
**File cần tạo**: `data/preprocess_cwru.py`

Dataset CWRU đã có tại:
```
C:\Users\ADMIN\.cache\kagglehub\datasets\brjapon\cwru-bearing-datasets\versions\1\
├── feature_time_48k_2048_load_1.csv    ← Đặc trưng time-domain (có thể dùng luôn)
├── CWRU_48k_load_1_CNN_data.npz        ← Data đã tiền xử lý cho CNN
└── raw\
    ├── Time_Normal_1_098.mat           ← Normal (không lỗi)
    ├── IR007_1_110.mat                 ← Inner Race fault (lỗi nhỏ)
    ├── IR014_1_175.mat                 ← Inner Race fault (lỗi vừa)
    ├── IR021_1_214.mat                 ← Inner Race fault (lỗi lớn)
    ├── OR007_6_1_136.mat               ← Outer Race fault
    ├── OR014_6_1_202.mat
    ├── OR021_6_1_239.mat
    ├── B007_1_123.mat                  ← Ball fault
    ├── B014_1_190.mat
    └── B021_1_227.mat
```

**Mapping class sang 4 nhãn đề tài**:
| File gốc | Nhãn trong đề tài | Lý do |
|---|---|---|
| `Time_Normal_*.mat` | `normal` | Không lỗi |
| `IR*` (Inner Race) | `bearing_fault` | Lỗi vòng bi |
| `OR*` (Outer Race) | `bearing_fault` | Lỗi vòng bi |
| `B*` (Ball fault) | `imbalance` | Giả lập mất cân bằng |

> **Lưu ý về class "Overheating"**: CWRU không có nhãn overheating thực sự.  
> Giải pháp: Dùng file tải cao nhất (IR021 hoặc OR021) và relabel thành `overheating`,  
> hoặc chấp nhận chỉ dùng 3 class và đề cập trong báo cáo mục giới hạn.

**Script cần viết** (`data/preprocess_cwru.py`):
```python
# Yêu cầu:
# 1. Đọc các file .mat bằng scipy.io.loadmat()
# 2. Trích xuất kênh "DE_time" (Drive End) — mảng 1D tín hiệu rung động
# 3. Cắt thành các window 2 giây (125 samples ở 62.5 Hz HOẶC 2000 samples ở 48kHz)
# 4. Tính 3 "trục" giả (X, Y, Z) bằng cách: X=raw, Y=random noise nhỏ + raw*0.1, Z=raw*0.05
#    (Vì CWRU chỉ có 1 trục, nhưng Edge Impulse cần 3 trục để khớp với impulse design)
# 5. Xuất ra CSV cho Edge Impulse theo format:
#    timestamp, accX, accY, accZ
#    0, 0.123, -0.045, 0.012
#    ...
# 6. Mỗi class → 1 folder: data/edge_impulse/normal/, data/edge_impulse/bearing_fault/, ...
# 7. Tổng cộng: ~300-500 mẫu/class, mỗi mẫu = 1 CSV file 2 giây

# Thư viện cần: scipy, numpy, pandas
# pip install scipy numpy pandas
```

**Format CSV Edge Impulse** (QUAN TRỌNG):
```
timestamp,accX,accY,accZ
0,0.123,-0.045,0.012
16,0.115,-0.038,0.009
32,0.130,-0.052,0.015
...
```
- `timestamp` tính bằng ms
- Mỗi file = 1 sample = 2000ms (125 dòng @ 62.5Hz)
- Tên file: `normal.1.csv`, `normal.2.csv`, `bearing_fault.1.csv`...

---

#### Task 4B — Script upload lên Edge Impulse (tuỳ chọn)
Edge Impulse có CLI tool: `npm install -g edge-impulse-cli`  
Lệnh upload: `edge-impulse-uploader --label normal data/edge_impulse/normal/*.csv`

Hoặc user tự upload thủ công qua giao diện web.

---

### GIAI ĐOẠN 5: CHƯƠNG 5 — MÔ PHỎNG & TEST CASES

**File cần tạo**: `report/chapters/chuong4_edge_impulse.md`  
**File cần tạo**: `report/chapters/chuong5_mophong.md`

#### Task 5A — Viết Chương 4 (template, chờ user điền ảnh)
Tạo file `report/chapters/chuong4_edge_impulse.md` với:
- Structure đầy đủ 9 bước (4.1 đến 4.9)
- Placeholder cho ảnh: `[Chèn ảnh X tại đây]`
- Bảng cấu hình đã điền trước các thông số đã biết:
  - Dataset: CWRU Bearing Dataset (Kaggle: brjapon/cwru-bearing-datasets)
  - Sampling rate: 62.5 Hz
  - Window size: 2000ms
  - Classes: 4 (normal, bearing_fault, imbalance, overheating)
  - Processing block: Spectral Analysis
  - Learning block: Classification (Keras) + Anomaly Detection (K-Means)

#### Task 5B — Viết Chương 5 (Test Cases)
Tạo file `report/chapters/chuong5_mophong.md` với bảng 4 test cases:

| TC | Loại | Input | Expected | Ghi chú |
|---|---|---|---|---|
| TC01 | Bình thường | `az=0` (slider Wokwi = 0) → RMS < 0.20 | class=Normal, LED xanh | Wokwi MPU6050 slider=0 → Z=0 → RMS thấp |
| TC02 | Biên | `az=0.15` → RMS ≈ 0.18-0.22 | Normal hoặc Bearing Fault | Vùng ngưỡng phân loại |
| TC03 | Lỗi | `az=0.5` (slider Wokwi cao) → RMS > 0.45 | class=Imbalance/Overheating, LED đỏ | Mô phỏng lỗi rõ ràng |
| TC04 | Hiệu năng | Chạy 60 giây liên tục | Task không bị stall, log đều 500ms | Kiểm tra stack overflow |

> **Wokwi MPU6050 note** (từ lessons.md):  
> Slider Wokwi = cường độ rung, KHÔNG phải gia tốc tĩnh.  
> Khi slider=0 → ax=ay=az=0 (không phải Z=1g như thực tế).  
> Code đã fix: `az = 0` mặc định thay vì `az = 1`.

---

### GIAI ĐOẠN 6-8: CÁC CHƯƠNG CÒN LẠI

**Cần user làm xong Edge Impulse trước** (Chương 6 cần kết quả thật).

Codex có thể làm trước skeleton:
- `report/chapters/chuong6_ketqua.md` — template với placeholder số liệu
- `report/chapters/chuong7_ketluan.md` — template kết luận

---

## 🔑 THÔNG TIN QUAN TRỌNG CHO CODEX

### FreeRTOS Code đã hoạt động
```
File: src/freertos/main_freertos.ino
Board: ESP32 DevKit V1
Simulator: Wokwi (wokwi.com)
FreeRTOS tasks:
  - vTaskSensor    Priority 5, period 16ms, đọc MPU6050
  - vTaskInference Priority 4, event-driven sau 125 samples
  - vTaskAlert     Priority 3, bật LED dựa trên inference
  - vTaskDisplay   Priority 2, period 500ms, Serial Monitor
  - vTaskLog       Priority 1, period 1000ms, ghi log
Mock inference: Tính RMS(ax,ay,az) → phân ngưỡng:
  RMS < 0.20 → Normal
  RMS < 0.45 → Bearing Fault
  RMS < 0.80 → Imbalance
  else       → Overheating
```

### Báo cáo Style Guide
- Tiếng Việt, có dấu đầy đủ
- Bảng Markdown tiêu chuẩn
- Trích dẫn chuẩn IEEE trong ngoặc vuông [1], [2]...
- Hình chú thích: `*Hình X.Y. Mô tả hình*`
- Mục tiêu: Accuracy ≥ 85%, F1 ≥ 0.80, Latency < 100ms, Model < 100KB

### Dataset đã tải
```
Path: C:\Users\ADMIN\.cache\kagglehub\datasets\brjapon\cwru-bearing-datasets\versions\1
Files:
  - feature_time_48k_2048_load_1.csv  (đặc trưng time-domain, có thể dùng trực tiếp)
  - CWRU_48k_load_1_CNN_data.npz      (data đã xử lý cho CNN)
  - raw/*.mat                          (10 file gốc MATLAB)
```

### Thư viện Python đã cài
- kagglehub ✅
- Cần cài thêm: `pip install scipy numpy pandas matplotlib`

---

## 📋 TASK LIST CHO CODEX (THEO THỨ TỰ ƯU TIÊN)

```
[ ] PRIORITY 1: Viết script data/preprocess_cwru.py
    → Đọc .mat files, cắt window, xuất CSV theo format Edge Impulse
    → Test: chạy thử, in ra số samples/class

[ ] PRIORITY 2: Tạo report/chapters/chuong4_edge_impulse.md
    → Template 9 bước, điền thông số đã biết, placeholder cho ảnh
    → Bảng 4.9 tổng hợp cấu hình

[ ] PRIORITY 3: Tạo report/chapters/chuong5_mophong.md
    → 4 test cases Wokwi (TC01-TC04)
    → Bảng so sánh mô phỏng

[ ] PRIORITY 4: Tạo report/chapters/chuong6_ketqua.md (skeleton)
    → Template chờ user điền số liệu từ Edge Impulse

[ ] PRIORITY 5: Tạo report/chapters/chuong7_ketluan.md
    → Kết luận template + hướng phát triển

[ ] PRIORITY 6: Cập nhật tasks/todo.md sau mỗi task hoàn thành
```

---

## ⚠️ CÁC LỖI ĐÃ BIẾT (KHÔNG LẶP LẠI)

1. **FreeRTOS headers**: Luôn include đầy đủ `freertos/task.h`, `queue.h`, `semphr.h`
2. **Wokwi MPU6050 Z-axis**: KHÔNG trừ 1.0g. Để az=0 mặc định khi slider=0
3. **ESP32 I2C**: `Wire.begin(21, 22)` — SDA=21, SCL=22
4. **Dataset path**: Workspace là `d:\Project_thay_minh`, không phải thư mục khác

---

## 🔗 LINK THAM KHẢO

- Edge Impulse Docs: https://docs.edgeimpulse.com/
- Wokwi ESP32: https://wokwi.com/projects/new/esp32
- CWRU Dataset (Kaggle): https://www.kaggle.com/datasets/brjapon/cwru-bearing-datasets
- FreeRTOS API: https://www.freertos.org/a00106.html
