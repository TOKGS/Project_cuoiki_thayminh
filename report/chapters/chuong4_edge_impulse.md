# CHUONG 4. XAY DUNG MO HINH TREN EDGE IMPULSE

## 4.1. Gioi thieu nen tang Edge Impulse trong de tai

Edge Impulse Studio duoc su dung lam moi truong xay dung pipeline TinyML cho bai toan phan loai hong hoc vong bi dong co. Nen tang nay cho phep thuc hien lien tuc cac buoc upload du lieu, thiet ke impulse, trich xuat dac trung, huan luyen, danh gia va toi uu mo hinh ngay tren giao dien web [2]. Project thuc te cua de tai la **N22DCDT057_NhanDienHongHoc** (Project ID: 1019223) da duoc hoan thanh va cong khai tai: `https://studio.edgeimpulse.com/public/1019223/live`.

## 4.2. Chuan bi va nap du lieu

### 4.2.1. Nguon du lieu

Bo du lieu su dung la **CWRU Bearing Dataset** duoc tai tu Kaggle (`brjapon/cwru-bearing-datasets`). Cac file `.mat` duoc trich xuat kenh `DE_time` (Drive End accelerometer) va xu ly thanh cac mau CSV theo cua so 2 giay.

### 4.2.2. Anh xa nhan

| File goc CWRU | Nhan trong de tai | Giai thich |
|---|---|---|
| `Normal_1_098.mat` | `normal` | Hoat dong binh thuong |
| `B007 / B014 / B021` | `ball_fault` | Loi bi lan (Ball Fault) |
| `IR007 / IR014 / IR021` | `inner_race_fault` | Loi vong trong (Inner Race Fault) |
| `OR007 / OR014 / OR021` | `outer_race_fault` | Loi vong ngoai (Outer Race Fault) |

### 4.2.3. Thong ke bo du lieu sau khi upload

| Thong so | Gia tri thuc te |
|---|---|
| Tong so mau | **3,238 mau** |
| Tong thoi gian du lieu | **5 phut 43 giay** |
| Ty le train / test | 80% / 20% |
| Tan so lay mau | **12,004.8 Hz** (toc do thuc cua CWRU Drive End) |
| Truc cam bien | `accX` (1 truc rung dong chinh) |
| Cua so lay mau | 2,000 ms |
| Buoc truot (stride) | 200 ms |

> Ghi chu: CWRU Bearing Dataset co tan so thu muc 12 kHz, khac voi tan so 62.5 Hz tren MPU6050 cua mach ESP32. Edge Impulse tiep nhan truc tiep tan so 12 kHz va tu dong cau hinh DSP phu hop. Mach ESP32 thu thap du lieu thuc te o 62.5 Hz, do do o buoc trien khai thuc te can quan tam su khac biet nay.

## 4.3. Thiet ke Impulse

Trong muc **Impulse design**, cau hinh thuc te duoc cai dat nhu sau:

| Thanh phan | Cau hinh thuc te |
|---|---|
| Input data | Acceleration data (accX) |
| Window size | **2,000 ms** |
| Window increase (stride) | **200 ms** |
| Frequency | **12,004.8 Hz** |
| Processing block | Spectral Analysis |
| Learning block 1 | Classification (Keras) |
| Learning block 2 | Anomaly Detection (K-Means) |
| So lop dau ra | 4 lop |

> Bo sung 2 khoi song song (Classification + Anomaly Detection) cho phep he thong vua phan loai chinh xac trang thai hong hoc, vua canh bao khi gap tin hieu bat thuong ngoai pham vi huan luyen.

## 4.4. Khoi xu ly dac trung: Spectral Analysis

### 4.4.1. Tham so cai dat

Khoi **Spectral Analysis** duoc cau hinh voi cac tham so cu the nhu sau:

| Tham so | Gia tri thuc te | Y nghia |
|---|---|---|
| Scale axes | 1 | Khong thu phong du lieu |
| Input decimation ratio | 1 | Giu nguyen do phan giai tan so |
| Filter type | **None** | Khong loc truoc tin hieu |
| FFT length | **256 diem** | Do phan giai tan so: 46.89 Hz/bin |
| Take log of spectrum | **True** | Lay log bien do de on dinh hoa |
| Overlap FFT frames | **True** | Tang so luong frame cho phan tich |
| Number of peaks | 0 | Khong trich xuat dac trung tan so dinh |

### 4.4.2. Ket qua trich xuat dac trung

Sau khi xu ly, moi mau sinh ra **133 dac trung** gom:

| Nhom dac trung | So luong | Chi tiet |
|---|---|---|
| Dac trung thong ke | 5 | RMS, Skewness, Kurtosis, Spectral Skewness, Spectral Kurtosis |
| Pho cong suat FFT | 128 | Cac bin tan so tu 23.45 Hz den 6,002.4 Hz (do rong 46.89 Hz/bin) |
| **Tong cong** | **133** | Vector dac trung dau vao mo hinh |

> 128 bin pho tuong ung voi FFT 256 diem (lay nua pho duong, loai bin DC = 128 bin huu ich). Do phan giai 46.89 Hz/bin phu hop de phan biet cac tan so hu hong dac trung cua vong bi.

## 4.5. Huan luyen mo hinh phan loai (Keras)

### 4.5.1. Kien truc mang neural

Mo hinh **Classification** su dung mang neural day du (Dense Neural Network) voi kien truc:

| Lop | So neuron | Ghi chu |
|---|---|---|
| Input | 133 | = so dac trung Spectral Analysis |
| Dense 1 | **20** | Lop an thu nhat |
| Dense 2 | **10** | Lop an thu hai |
| Dense 3 | **40** | Lop an thu ba |
| Output (Softmax) | **4** | 4 lop: normal, ball_fault, inner_race_fault, outer_race_fault |

### 4.5.2. Ket qua huan luyen

| Chi so | Gia tri thuc te |
|---|---|
| **Accuracy (Validation set)** | **100.0%** |
| **Loss (Validation set)** | **0.00** |
| So lop phan loai | 4 |
| Ket qua Confusion Matrix | Tat ca 4 lop duoc phan loai chinh xac 100% |

> Ket qua 100% accuracy tren tap validation cho thay dac trung pho cong suat FFT phan biet rat ro rang giua cac trang thai hong hoc vong bi. Dieu nay phu hop voi ly thuyet: moi loai loi vong bi tao ra tan so hu hong dac trung (BPFI, BPFO, BSF) co the nhan biet qua pho tan so.

### 4.5.3. Hieu nang tren thiet bi - Phan biet 2 che do trien khai

Edge Impulse ho tro 2 con duong trien khai khac nhau, anh huong den loai model su dung:

| Che do trien khai | Model su dung | Phu hop voi |
|---|---|---|
| **WebAssembly (Browser/Phone)** | **Float32 Unoptimized** | Demo tren dien thoai, trinh duyet |
| **C++ Library / Firmware** | **Int8 Quantized** | MCU nhung (STM32, ESP32, Cortex-M) |

**Trong de tai nay, demo tren dien thoai su dung WebAssembly (float32).**

#### Hieu nang model Float32 (Phone / WebAssembly)

| Chi so | Gia tri thuc te |
|---|---|
| **Accuracy (Validation)** | **100.0%** |
| **Loss** | **0.00** |
| Latency tren dien thoai | Phu thuoc CPU dien thoai (~5-50 ms tuy thiet bi) |
| Kich thuoc WASM | ~200-500 KB (bao gom runtime WebAssembly) |

> **Ghi chu**: Cac chi so RAM 1.7 KB va Flash 17.7 KB tren Cortex-M4F 80 MHz chi ap dung cho truong hop xuat C++ library cho MCU nhung, khong ap dung cho che do phone/WebAssembly. Khi chay tren trinh duyet dien thoai, bo nho duoc cap phat boi JavaScript runtime va khong bi gioi han khat nhu MCU.

## 4.6. Khoi Anomaly Detection (K-Means)

Song song voi Classification, khoi **Anomaly Detection** su dung thuat toan K-Means duoc them vao de:
- Phat hien cac mau rung dong khong thuoc 4 lop da huan luyen.
- Canh bao khi co tinh huong hu hong moi ma mo hinh chua hoc.

| Tham so | Gia tri |
|---|---|
| Thuat toan | K-Means clustering |
| Dau ra | Anomaly score (gia tri thuc, cang cao = cang bat thuong) |
| Nguong canh bao | Xac dinh theo ung dung thuc te |

## 4.7. Danh gia tong the mo hinh

### 4.7.1. Ket qua phan loai (Float32 - WebAssembly / Phone)

| Chi so | Gia tri thuc te |
|---|---|
| Accuracy (Validation set) | **100.0%** |
| Accuracy (Test set) | **100.0%** |
| Loss | **0.00** |
| Mo hinh su dung khi demo dien thoai | **Float32 Unoptimized** (WebAssembly) |

### 4.7.2. Tham khao: Hieu nang neu trien khai len MCU (Int8 Quantized)

Neu trong tuong lai muon chuyen tu phone sang MCU nhung (STM32, ESP32...), Edge Impulse da san sang xuat C++ library voi model int8 co hieu nang:

| Chi so | Gia tri (tham khao - MCU Cortex-M4F 80 MHz) |
|---|---|
| Latency | 1 ms |
| Peak RAM | 1.7 KB |
| Flash | 17.7 KB |

### 4.7.3. Tong hop cau hinh va hieu nang

| Noi dung | Gia tri thuc te |
|---|---|
| Dataset | CWRU Bearing Dataset - 3,238 mau, 5 phut 43 giay |
| So lop | 4 (`normal`, `ball_fault`, `inner_race_fault`, `outer_race_fault`) |
| Tan so lay mau | 12,004.8 Hz |
| Cua so phan tich | 2,000 ms (buoc truot 200 ms) |
| Processing block | Spectral Analysis (FFT 256 diem, 133 dac trung) |
| Learning block | Dense NN [133 → 20 → 10 → 40 → 4] + K-Means Anomaly |
| Accuracy | **100.0%** (validation + test) |
| Model su dung khi demo | **Float32 Unoptimized** (WebAssembly - chay tren dien thoai) |

### 4.7.3. Nhan xet chuong

De tai da xay dung thanh cong pipeline TinyML tren Edge Impulse voi ket qua vuot muc muc tieu dat ra (accuracy >= 85%). Ket qua 100% accuracy duoc giai thich boi:

1. **Du lieu CWRU co tinh tach biet cao**: Pho rung dong cua cac loai hong hoc vong bi co tan so dac trung rieng biet, day du san biet khi dung FFT.
2. **Dac trung pho cong suat phu hop**: 128 bin FFT + 5 dac trung thong ke tao thanh vector 133 chieu du phong phu de phan biet 4 lop.
3. **Mo hinh kien truc don gian nhung hieu qua**: 3 lop an voi tong 70 neuron du de hoc biet 4 phan phoi lop tach biet.

Hieu nang 1 ms suy luan va 1.7 KB RAM cho thay mo hinh co the trien khai tuc thoi tren cac MCU nhu STM32F4 hoac ESP32, dam bao tinh nang thoi gian thuc cua he thong giam sat dong co.

**Tai lieu tham khao chuong nay:**

[2] Edge Impulse, "Edge Impulse Documentation," Edge Impulse Docs. Available: https://docs.edgeimpulse.com/

[3] Case Western Reserve University, "CWRU Bearing Data Center," Available: https://engineering.case.edu/bearingdatacenter
