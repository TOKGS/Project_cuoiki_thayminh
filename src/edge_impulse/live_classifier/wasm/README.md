# Hướng Dẫn Copy WASM Files

## Để kích hoạt chế độ WASM Local (⚡):

### Bước 1: Export từ Edge Impulse Studio
1. Vào https://studio.edgeimpulse.com/studio/1019223
2. Click **Deployment** (menu trái)
3. Chọn **WebAssembly**
4. Nhấn **Build**
5. Download file ZIP

### Bước 2: Giải nén và copy vào đây
Sau khi giải nén ZIP, copy 2 files vào thư mục `wasm/`:

```
live_classifier/
└── wasm/
    ├── edge-impulse-standalone.js    ← copy vào đây
    └── edge-impulse-standalone.wasm  ← copy vào đây
```

### Bước 3: Reload app
Mở lại `index.html` qua local server, chế độ WASM sẽ tự động kích hoạt.

---

## Không có WASM không sao!

App vẫn hoạt động đầy đủ với:
- **📊 Mô phỏng**: Demo các lớp phân loại với dữ liệu mẫu thực tế
- **🌐 API Live**: Phân loại thật qua Edge Impulse REST API (cần API key)
