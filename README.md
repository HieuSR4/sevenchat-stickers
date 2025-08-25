# SevenChat Stickers 🎨

Bộ sưu tập sticker cho ứng dụng SevenChat, bao gồm công cụ tự động crawl sticker từ các nguồn khác nhau.

## 📁 Cấu trúc dự án

```
sevenchat-stickers/
├── generate-metadata.js          # Script tạo metadata
├── crawl-sigstick.js            # Script crawl từ SigStick
├── scripts/
│   ├── generate-metadata.js      # Script chính tạo metadata
│   └── sigstick-crawler.js      # Script crawler nâng cao
├── stickers/
│   └── pig/                     # Thư mục chứa stickers
│       ├── pig-1.gif
│       └── pig-2.gif
├── metadata.json                # File metadata chính
└── README.md
```

## 🚀 Cách sử dụng

### 1. Tạo metadata từ stickers hiện có

```bash
# Từ thư mục gốc
node generate-metadata.js

# Hoặc từ thư mục scripts
cd scripts
node generate-metadata.js
```

### 2. Crawl sticker từ SigStick

```bash
# Crawl một pack cụ thể
node crawl-sigstick.js quby

# Crawl các pack mẫu
node crawl-sigstick.js sample

# Xem hướng dẫn
node crawl-sigstick.js help
```

### 3. Các lệnh khác

```bash
# Validate metadata
node generate-metadata.js validate

# Tạo cấu trúc thư mục mẫu
node generate-metadata.js init

# Xem help
node generate-metadata.js help
```

## 🎯 Tính năng

### Generate Metadata
- ✅ Tự động quét thư mục stickers/
- ✅ Tạo metadata.json với thông tin chi tiết
- ✅ Validate tất cả files tồn tại
- ✅ Tạo thumbnails tự động
- ✅ Hỗ trợ nhiều định dạng (PNG, JPG, GIF, SVG)

### SigStick Crawler
- ✅ Auto-detect pack URLs
- ✅ Extract sticker URLs từ HTML
- ✅ Download với retry mechanism
- ✅ Rate limiting để tránh spam server
- ✅ Tạo metadata cho từng pack
- ✅ Hỗ trợ nhiều định dạng ảnh

## 📦 Cấu trúc metadata

```json
{
  "name": "SevenChat Stickers",
  "description": "Collection of stickers for SevenChat app",
  "version": "1.0.0",
  "author": "SevenChat Team",
  "packs": [
    {
      "id": "pig",
      "name": "Pig Pack",
      "description": "Collection of pig stickers",
      "stickers": [
        {
          "id": "pig-1",
          "name": "Pig 1",
          "url": "stickers/pig/pig-1.gif",
          "tags": ["pig", "sticker", "emoji", "cute", "fun"],
          "size": 22457
        }
      ]
    }
  ]
}
```

## 🔧 Cấu hình

### Generate Metadata
Có thể chỉnh sửa cấu hình trong `scripts/generate-metadata.js`:

```javascript
const CONFIG = {
    stickersDir: './stickers',
    outputFile: './metadata.json',
    defaultCategory: 'general',
    supportedFormats: ['.png', '.jpg', '.jpeg', '.svg', '.gif'],
    maxFileSize: 1024 * 1024, // 1MB
    thumbnailSize: 128
};
```

### SigStick Crawler
Có thể chỉnh sửa cấu hình trong `scripts/sigstick-crawler.js`:

```javascript
const CONFIG = {
    baseUrl: 'https://sigstick.com',
    outputDir: '../stickers',
    timeout: 15000,
    delay: 1000, // Delay giữa các request
    maxRetries: 3
};
```

## 📝 Lưu ý

1. **Rate Limiting**: Crawler có delay giữa các request để tránh spam server
2. **Retry Mechanism**: Tự động retry khi download thất bại
3. **Error Handling**: Xử lý lỗi gracefully và log chi tiết
4. **File Validation**: Kiểm tra tất cả files tồn tại trước khi tạo metadata

## 🤝 Đóng góp

1. Fork dự án
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

MIT License - xem file LICENSE để biết thêm chi tiết.

---

**SevenChat Team** 🚀