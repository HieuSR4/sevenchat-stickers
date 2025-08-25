#!/usr/bin/env node

/**
 * SigStick Crawler - Script nâng cao để crawl sticker từ SigStick
 * Usage: node sigstick-crawler.js [pack-name]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const zlib = require('zlib');

const CONFIG = {
    baseUrl: 'https://www.sigstick.com',
    outputDir: './stickers',
    timeout: 15000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    delay: 1000, // Delay giữa các request
    maxRetries: 3
};

// HTTP request helper
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https:') ? https : http;
        
        const requestOptions = {
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                ...options.headers
            },
            timeout: CONFIG.timeout,
            ...options
        };

        const request = protocol.get(url, requestOptions, (response) => {
            let data = '';
            
            // Xử lý gzip compression
            let stream = response;
            if (response.headers['content-encoding'] === 'gzip') {
                stream = response.pipe(zlib.createGunzip());
            } else if (response.headers['content-encoding'] === 'br') {
                stream = response.pipe(zlib.createBrotliDecompress());
            }
            
            stream.on('data', (chunk) => {
                data += chunk;
            });
            
            stream.on('end', () => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    resolve({
                        statusCode: response.statusCode,
                        headers: response.headers,
                        data: data
                    });
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: ${url}`));
                }
            });
        });

        request.on('error', reject);
        request.on('timeout', () => {
            request.destroy();
            reject(new Error(`Timeout: ${url}`));
        });
    });
}

// Download file với retry
async function downloadFile(url, outputPath, retries = CONFIG.maxRetries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const protocol = url.startsWith('https:') ? https : http;
            
            return await new Promise((resolve, reject) => {
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
                        fs.unlink(outputPath, () => {});
                        reject(err);
                    });
                });

                request.on('error', reject);
                request.on('timeout', () => {
                    request.destroy();
                    reject(new Error(`Timeout: ${url}`));
                });
            });
        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
            console.log(`⚠️  Retry ${attempt}/${retries} for ${url}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

// Parse HTML để tìm sticker URLs
function extractStickerUrls(html, packName) {
    const urls = [];
    
    console.log('🔍 Đang parse HTML để tìm sticker URLs...');
    
    // Pattern 1: Tìm URLs CDN của SigStick (pattern chính)
    const cdnPattern = /https:\/\/cdn\.cdnstep\.com\/[^\/]+\/[^\/]+\.(?:png|jpg|jpeg|gif|webp)/gi;
    let match;
    
    while ((match = cdnPattern.exec(html)) !== null) {
        const url = match[0];
        console.log(`📷 Tìm thấy CDN URL: ${url}`);
        urls.push(url);
    }
    
    // Pattern 2: Tìm URLs trong thẻ img với src
    const imgPattern = /<img[^>]+src=["']([^"']*\.(?:png|jpg|jpeg|gif|webp))[^"']*["'][^>]*>/gi;
    
    while ((match = imgPattern.exec(html)) !== null) {
        const url = match[1];
        if (url.includes('cdn.cdnstep.com')) {
            console.log(`📷 Tìm thấy img src: ${url}`);
            urls.push(url);
        }
    }
    
    // Pattern 3: Tìm URLs trong data attributes
    const dataPattern = /data-src=["']([^"']*\.(?:png|jpg|jpeg|gif|webp))[^"']*["']/gi;
    while ((match = dataPattern.exec(html)) !== null) {
        const url = match[1];
        if (url.includes('cdn.cdnstep.com')) {
            console.log(`📷 Tìm thấy data-src: ${url}`);
            urls.push(url);
        }
    }
    
    // Pattern 4: Tìm URLs trong JavaScript variables
    const jsPattern = /["']([^"']*\.(?:png|jpg|jpeg|gif|webp))[^"']*["']/gi;
    while ((match = jsPattern.exec(html)) !== null) {
        const url = match[1];
        if (url.includes('cdn.cdnstep.com') && url.length > 10) {
            console.log(`📷 Tìm thấy JS URL: ${url}`);
            urls.push(url);
        }
    }
    
    // Pattern 5: Tìm URLs trong CSS background
    const cssPattern = /background(?:-image)?:\s*url\(["']?([^"')]*\.(?:png|jpg|jpeg|gif|webp))["']?\)/gi;
    while ((match = cssPattern.exec(html)) !== null) {
        const url = match[1];
        if (url.includes('cdn.cdnstep.com')) {
            console.log(`📷 Tìm thấy CSS background: ${url}`);
            urls.push(url);
        }
    }
    
    // Pattern 6: Tìm URLs trong JSON data
    const jsonPattern = /"url":\s*["']([^"']*\.(?:png|jpg|jpeg|gif|webp))["']/gi;
    while ((match = jsonPattern.exec(html)) !== null) {
        const url = match[1];
        if (url.includes('cdn.cdnstep.com')) {
            console.log(`📷 Tìm thấy JSON URL: ${url}`);
            urls.push(url);
        }
    }
    
    // Loại bỏ duplicates và normalize URLs
    const uniqueUrls = [...new Set(urls)].map(url => {
        if (url.startsWith('//')) {
            return 'https:' + url;
        } else if (url.startsWith('/')) {
            return CONFIG.baseUrl + url;
        } else if (!url.startsWith('http')) {
            return CONFIG.baseUrl + '/' + url;
        }
        return url;
    });
    
    // Lọc chỉ lấy sticker URLs (loại bỏ thumbnails và cover)
    const stickerUrls = uniqueUrls.filter(url => {
        // Loại bỏ thumbnails
        if (url.includes('.thumb')) return false;
        // Loại bỏ cover
        if (url.includes('cover-')) return false;
        // Chỉ lấy URLs có pack ID
        if (!url.includes(packName)) return false;
        return true;
    });
    
    console.log(`📊 Tìm thấy ${uniqueUrls.length} URLs tổng cộng`);
    console.log(`📦 Tìm thấy ${stickerUrls.length} sticker URLs`);
    stickerUrls.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`);
    });
    
    return stickerUrls;
}

// Crawl sticker pack từ SigStick
async function crawlStickerPack(packName) {
    console.log(`🎨 Bắt đầu crawl sticker pack: ${packName}`);
    
    const packDir = path.join(CONFIG.outputDir, packName);
    if (!fs.existsSync(packDir)) {
        fs.mkdirSync(packDir, { recursive: true });
        console.log(`📁 Tạo thư mục: ${packDir}`);
    }
    
    try {
        // Thử các URL patterns khác nhau cho SigStick
        const possibleUrls = [
            `${CONFIG.baseUrl}/pack/${packName}`,  // Ví dụ: /pack/1Dya2eQtWq0TeUtPi2D7
            `${CONFIG.baseUrl}/pack/${packName.toLowerCase()}`,
            `${CONFIG.baseUrl}/pack/${packName.toUpperCase()}`,
            `${CONFIG.baseUrl}/sticker-pack/${packName}`,
            `${CONFIG.baseUrl}/stickers/${packName}`,
            `${CONFIG.baseUrl}/${packName}`
        ];
        
        let html = '';
        let packUrl = '';
        
        // Tìm URL hoạt động
        for (const url of possibleUrls) {
            try {
                console.log(`🔍 Thử URL: ${url}`);
                const response = await makeRequest(url);
                html = response.data;
                packUrl = url;
                console.log(`✅ Tìm thấy pack tại: ${url}`);
                break;
            } catch (error) {
                console.log(`❌ URL không hoạt động: ${url}`);
            }
        }
        
        if (!html) {
            throw new Error(`Không thể tìm thấy pack: ${packName}`);
        }
        
        // Extract sticker URLs
        const stickerUrls = extractStickerUrls(html, packName);
        
        if (stickerUrls.length === 0) {
            console.log(`⚠️  Không tìm thấy sticker URLs, tạo URLs mẫu...`);
            // Tạo URLs mẫu dựa trên pattern thông thường
            for (let i = 1; i <= 10; i++) {
                stickerUrls.push(`${CONFIG.baseUrl}/stickers/${packName}/sticker-${i}.png`);
            }
        }
        
        console.log(`📦 Tìm thấy ${stickerUrls.length} stickers`);
        
        // Download stickers
        let successCount = 0;
        for (let i = 0; i < stickerUrls.length; i++) {
            const url = stickerUrls[i];
            const fileName = `${packName}-${i + 1}${path.extname(url) || '.png'}`;
            const outputPath = path.join(packDir, fileName);
            
            try {
                console.log(`⬇️  Downloading: ${fileName} (${i + 1}/${stickerUrls.length})`);
                await downloadFile(url, outputPath);
                console.log(`✅ Downloaded: ${fileName}`);
                successCount++;
                
                // Delay để tránh spam server
                await new Promise(resolve => setTimeout(resolve, CONFIG.delay));
                
            } catch (error) {
                console.error(`❌ Lỗi download ${fileName}:`, error.message);
            }
        }
        
        console.log(`🎉 Hoàn thành crawl pack: ${packName} (${successCount}/${stickerUrls.length} stickers)`);
        
        // Tạo metadata cho pack
        createPackMetadata(packName, successCount);
        
    } catch (error) {
        console.error(`❌ Lỗi crawl pack ${packName}:`, error.message);
    }
}

// Tạo metadata cho pack
function createPackMetadata(packName, stickerCount) {
    const metadataPath = path.join(CONFIG.outputDir, packName, 'pack-info.json');
    
    const packInfo = {
        name: packName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Pack',
        id: packName,
        description: `Sticker pack crawled from SigStick`,
        source: 'SigStick',
        crawledAt: new Date().toISOString(),
        stickerCount: stickerCount,
        category: 'general'
    };
    
    fs.writeFileSync(metadataPath, JSON.stringify(packInfo, null, 2));
    console.log(`📝 Tạo pack metadata: ${metadataPath}`);
}

// Crawl nhiều packs
async function crawlMultiplePacks(packNames) {
    console.log(`🚀 Bắt đầu crawl ${packNames.length} packs...`);
    
    for (const packName of packNames) {
        await crawlStickerPack(packName);
        console.log('---');
        
        // Delay giữa các packs
        await new Promise(resolve => setTimeout(resolve, 2000));
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
🎨 SigStick Crawler - Advanced

Usage:
  node sigstick-crawler.js [pack-name]  # Crawl một pack cụ thể
  node sigstick-crawler.js sample       # Crawl các pack mẫu
  node sigstick-crawler.js help         # Hiển thị help

Examples:
  node sigstick-crawler.js quby
  node sigstick-crawler.js cute-animals
  node sigstick-crawler.js sample

Features:
  ✅ Auto-detect pack URLs
  ✅ Extract sticker URLs from HTML
  ✅ Download with retry mechanism
  ✅ Rate limiting to avoid spam
  ✅ Generate pack metadata

Output:
  stickers/[pack-name]/ - Thư mục chứa stickers đã tải
  stickers/[pack-name]/pack-info.json - Metadata của pack
        `);
        return;
    }
    
    if (packName === 'sample') {
        await crawlSamplePacks();
    } else if (packName) {
        await crawlStickerPack(packName);
    } else {
        console.log('❌ Vui lòng chỉ định tên pack hoặc dùng "sample" để crawl pack mẫu');
        console.log('💡 Sử dụng: node sigstick-crawler.js help để xem hướng dẫn');
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
    downloadFile,
    extractStickerUrls
};
