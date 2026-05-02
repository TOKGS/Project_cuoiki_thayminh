# BÀI HỌC RÚT RA (Lessons Learned)

## Đồ án: Dự đoán hỏng hóc động cơ quạt gió trong nhà máy

---

*(Cập nhật sau mỗi lần có correction từ user hoặc phát hiện lỗi)*

### Quy tắc chung
- Luôn đọc đúng thư mục dự án trước khi làm việc
- Theo đúng workflow trong CLAUDE.md: Plan → Verify → Execute → Track → Document

### Lỗi đã mắc
1. **[2026-05-02]** Đọc nhầm thư mục dự án (`MAIN_PROJECT_THAYKIEN` thay vì `Project_thay_minh`)
   - **Nguyên nhân**: Không kiểm tra workspace URI, đọc file từ thư mục đang mở trong editor thay vì workspace
   - **Quy tắc**: Luôn kiểm tra workspace path trong user_information TRƯỚC khi đọc file

---
