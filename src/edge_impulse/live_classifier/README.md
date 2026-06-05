# Hướng dẫn chạy Web App nhận diện trên điện thoại

Do hệ thống sử dụng cảm biến trên điện thoại (gia tốc kế) và yêu cầu bảo mật, bạn bắt buộc phải truy cập qua **HTTPS** thì trình duyệt web trên điện thoại mới cho phép cấp quyền truy cập cảm biến. Để có HTTPS từ máy tính tới điện thoại mà không cần thiết lập mạng lằng nhằng, chúng ta sử dụng `localhost.run`.

## 1. Khởi động hệ thống

Bạn cần bật 2 Terminal (Cmd / PowerShell) trong thư mục `src/edge_impulse/live_classifier`:

**Terminal 1: Chạy Local HTTP Server (Chứa source code web)**
```powershell
python -m http.server 8080
```
*(Cửa sổ này cứ để chạy ẩn, không tắt)*

**Terminal 2: Mở đường hầm HTTPS (Tunnel) ra Internet**
```powershell
ssh -o StrictHostKeyChecking=no -R 80:localhost:8080 nokey@localhost.run
```
*(Nếu Terminal báo lỗi SSH, hãy chắc chắn máy bạn đã cài OpenSSH Client)*

Màn hình Terminal 2 sẽ in ra một đường link có đuôi `lhr.life` (ví dụ: `https://8e2ff513396140.lhr.life`). Lấy điện thoại của bạn truy cập vào đường link này (nên mở bằng Tab Ẩn Danh để tránh lỗi lưu cache code cũ).

---

## 2. Xử lý lỗi "no tunnel here :("

Lỗi này xảy ra khi đường link `lhr.life` đã **hết hạn**. `localhost.run` bản miễn phí chỉ giữ đường hầm HTTPS kết nối từ 5 đến 15 phút. Nếu bạn không tương tác một lúc hoặc phiên hết hạn, điện thoại sẽ hiện lỗi chữ xanh dương `no tunnel here :(`.

### Cách khắc phục:
Rất đơn giản, bạn chỉ cần tạo lại tunnel mới.

1. Vào lại **Terminal 2** trên máy tính (Terminal chạy lệnh ssh).
2. Bấm tổ hợp phím **`Ctrl + C`** để tắt tunnel cũ bị lỗi.
3. Chạy lại đúng câu lệnh cũ:
   ```powershell
   ssh -o StrictHostKeyChecking=no -R 80:localhost:8080 nokey@localhost.run
   ```
4. Terminal sẽ in ra một **đường link `lhr.life` hoàn toàn mới**.
5. Mở điện thoại, nhập đường link mới này (nhớ dùng tab ẩn danh để tránh bị cache nếu có update code).

*(Terminal 1 chạy Python server vẫn giữ nguyên không cần khởi động lại).*
