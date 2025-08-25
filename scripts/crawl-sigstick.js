#!/usr/bin/env node

/**
 * Script crawler để tải sticker từ SigStick
 * Usage: node crawl-sigstick.js [pack-name]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CONFIG = {
    baseUrl: 'https://sigstick.com',
    outputDir: '../stickers',
    maxConcurrent: 3,
    timeout: 10000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Tạo thư mục nếu chưa tồn tại
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Tạo thư mục: ${dir}`);
    }
}

// Download file từ URL
function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        
        const request = protocol.get(url, {
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache'
            },
            timeout: CONFIG.timeout
        }, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${url}`));
                return;
            }

            const file = fs.createWriteStream(outputPath);
            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve(outputPath);
            });

            file.on('error', (err) => {
                fs.unlink(outputPath, () => {}); // Xóa file lỗi
                reject(err);
            });
        });

        request.on('error', (err) => {
            reject(err);
        });

        request.on('timeout', () => {
            request.destroy();
            reject(new Error(`Timeout: ${url}`));
        });
    });
}

// Crawl sticker pack từ SigStick
async function crawlStickerPack(packName) {
    console.log(`🎨 Bắt đầu crawl sticker pack: ${packName}`);
    
    const packDir = path.join(CONFIG.outputDir, packName);
    ensureDir(packDir);
    
    // URL mẫu cho SigStick (cần điều chỉnh theo cấu trúc thực tế)
    const packUrl = `${CONFIG.baseUrl}/pack/${packName}`;
    
    try {
        // Tạo danh sách sticker URLs (cần điều chỉnh theo cấu trúc thực tế của SigStick)
        const stickerUrls = await getStickerUrls(packName);
        
        console.log(`📦 Tìm thấy ${stickerUrls.length} stickers`);
        
        // Download từng sticker
        for (let i = 0; i < stickerUrls.length; i++) {
            const url = stickerUrls[i];
            const fileName = `${packName}-${i + 1}.png`;
            const outputPath = path.join(packDir, fileName);
            
            try {
                console.log(`⬇️  Downloading: ${fileName} (${i + 1}/${stickerUrls.length})`);
                await downloadFile(url, outputPath);
                console.log(`✅ Downloaded: ${fileName}`);
                
                // Delay để tránh spam server
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`❌ Lỗi download ${fileName}:`, error.message);
            }
        }
        
        console.log(`🎉 Hoàn thành crawl pack: ${packName}`);
        
    } catch (error) {
        console.error(`❌ Lỗi crawl pack ${packName}:`, error.message);
    }
}

// Lấy danh sách URL stickers (cần điều chỉnh theo API thực tế của SigStick)
async function getStickerUrls(packName) {
    // Đây là placeholder - cần implement theo cấu trúc thực tế của SigStick
    // Có thể cần:
    // 1. Parse HTML của trang pack
    // 2. Gọi API của SigStick
    // 3. Extract URLs từ JavaScript
    
    console.log(`🔍 Đang tìm sticker URLs cho pack: ${packName}`);
    
    // Ví dụ URLs mẫu (cần thay thế bằng URLs thực tế)
    const sampleUrls = [
        `https://sigstick.com/stickers/${packName}/sticker1.png`,
        `https://sigstick.com/stickers/${packName}/sticker2.png`,
        `https://sigstick.com/stickers/${packName}/sticker3.png`
    ];
    
    return sampleUrls;
}

// Crawl nhiều packs
async function crawlMultiplePacks(packNames) {
    console.log(`🚀 Bắt đầu crawl ${packNames.length} packs...`);
    
    for (const packName of packNames) {
        await crawlStickerPack(packName);
        console.log('---');
    }
    
    console.log('🎉 Hoàn thành crawl tất cả packs!');
}

// Crawl pack mẫu từ SigStick
async function crawlSamplePacks() {
    const samplePacks = [
        'quby',           // Pack Quby từ hình ảnh
        'cute-animals',   // Pack động vật dễ thương
        'emotions',       // Pack biểu cảm
        'food',          // Pack đồ ăn
        'nature'         // Pack thiên nhiên
    ];
    
    await crawlMultiplePacks(samplePacks);
}

// Main function
async function main() {
    const packName = process.argv[2];
    
    if (packName === 'help') {
        console.log(`
🎨 SigStick Crawler

Usage:
  node crawl-sigstick.js [pack-name]  # Crawl một pack cụ thể
  node crawl-sigstick.js sample       # Crawl các pack mẫu
  node crawl-sigstick.js help         # Hiển thị help

Examples:
  node crawl-sigstick.js quby
  node crawl-sigstick.js cute-animals
  node crawl-sigstick.js sample

Output:
  stickers/[pack-name]/ - Thư mục chứa stickers đã tải
        `);
        return;
    }
    
    if (packName === 'sample') {
        await crawlSamplePacks();
    } else if (packName) {
        await crawlStickerPack(packName);
    } else {
        console.log('❌ Vui lòng chỉ định tên pack hoặc dùng "sample" để crawl pack mẫu');
        console.log('💡 Sử dụng: node crawl-sigstick.js help để xem hướng dẫn');
    }
}

// Xử lý lỗi
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Chạy script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    crawlStickerPack,
    crawlMultiplePacks,
    downloadFile
};
