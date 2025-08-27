#!/usr/bin/env node

/**
 * SigStick Enhanced Crawler - Tải cả PNG và WebP animated
 * Usage: node sigstick-crawler-enhanced.js [pack-name]
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
    delay: 1000,
    maxRetries: 3,
    // Ưu tiên WebP animated nếu có
    preferWebP: true,
    // Tải cả PNG và WebP nếu có
    downloadBoth: true
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
                        resolve();
                    });
                    
                    file.on('error', (err) => {
                        fs.unlink(outputPath, () => {}); // Xóa file lỗi
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

// Extract sticker URLs từ HTML với ưu tiên WebP
function extractStickerUrls(html, packName) {
    const urls = [];
    let match;
    
    console.log('🔍 Đang parse HTML để tìm sticker URLs...');
    
    // Pattern 1: Tìm CDN URLs trực tiếp
    const cdnPattern = /https:\/\/cdn\.cdnstep\.com\/[^\/]+\/[^\/]+\.(png|jpg|jpeg|gif|webp)/gi;
    while ((match = cdnPattern.exec(html)) !== null) {
        const url = match[0];
        const ext = match[1].toLowerCase();
        if (url.includes(packName)) {
            console.log(`📷 Tìm thấy CDN URL: ${url} (${ext})`);
            urls.push({ url, ext });
        }
    }
    
    // Pattern 2: Tìm img src
    const imgPattern = /<img[^>]+src=["']([^"']*\.(png|jpg|jpeg|gif|webp))[^"']*["'][^>]*>/gi;
    while ((match = imgPattern.exec(html)) !== null) {
        const url = match[1];
        const ext = match[2].toLowerCase();
        if (url.includes('cdn.cdnstep.com') && url.includes(packName)) {
            console.log(`📷 Tìm thấy img src: ${url} (${ext})`);
            urls.push({ url, ext });
        }
    }
    
    // Pattern 3: Tìm URLs trong JavaScript variables
    const jsPattern = /["']([^"']*\.(png|jpg|jpeg|gif|webp))[^"']*["']/gi;
    while ((match = jsPattern.exec(html)) !== null) {
        const url = match[1];
        const ext = match[2].toLowerCase();
        if (url.includes('cdn.cdnstep.com') && url.includes(packName) && url.length > 10) {
            console.log(`📷 Tìm thấy JS URL: ${url} (${ext})`);
            urls.push({ url, ext });
        }
    }
    
    // Pattern 4: Tìm URLs trong JSON data
    const jsonPattern = /"url":\s*["']([^"']*\.(png|jpg|jpeg|gif|webp))["']/gi;
    while ((match = jsonPattern.exec(html)) !== null) {
        const url = match[1];
        const ext = match[2].toLowerCase();
        if (url.includes('cdn.cdnstep.com') && url.includes(packName)) {
            console.log(`📷 Tìm thấy JSON URL: ${url} (${ext})`);
            urls.push({ url, ext });
        }
    }
    
    // Loại bỏ duplicates và normalize URLs
    const uniqueUrls = [];
    const seen = new Set();
    
    urls.forEach(({ url, ext }) => {
        let normalizedUrl = url;
        if (url.startsWith('//')) {
            normalizedUrl = 'https:' + url;
        } else if (url.startsWith('/')) {
            normalizedUrl = CONFIG.baseUrl + url;
        } else if (!url.startsWith('http')) {
            normalizedUrl = CONFIG.baseUrl + '/' + url;
        }
        
        if (!seen.has(normalizedUrl)) {
            seen.add(normalizedUrl);
            uniqueUrls.push({ url: normalizedUrl, ext });
        }
    });
    
    // Lọc chỉ lấy sticker URLs (loại bỏ thumbnails và cover)
    const stickerUrls = uniqueUrls.filter(({ url }) => {
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
    
    // Phân loại theo định dạng
    const pngUrls = stickerUrls.filter(({ ext }) => ext === 'png');
    const webpUrls = stickerUrls.filter(({ ext }) => ext === 'webp');
    const gifUrls = stickerUrls.filter(({ ext }) => ext === 'gif');
    const otherUrls = stickerUrls.filter(({ ext }) => !['png', 'webp', 'gif'].includes(ext));
    
    console.log(`  📷 PNG: ${pngUrls.length}`);
    console.log(`  🎬 WebP: ${webpUrls.length}`);
    console.log(`  🎞️  GIF: ${gifUrls.length}`);
    console.log(`  📄 Other: ${otherUrls.length}`);
    
    return stickerUrls;
}

// Tạo danh sách URLs để tải với ưu tiên WebP
function createDownloadList(stickerUrls, packName) {
    const downloadList = [];
    const seenNumbers = new Set();
    
    // Nhóm URLs theo số thứ tự sticker
    const groupedUrls = {};
    
    stickerUrls.forEach(({ url, ext }) => {
        // Extract số thứ tự từ URL (ví dụ: 1-1.png -> 1)
        const match = url.match(/(\d+)-?\d*\.(png|webp|gif)$/);
        if (match) {
            const number = parseInt(match[1]);
            if (!groupedUrls[number]) {
                groupedUrls[number] = [];
            }
            groupedUrls[number].push({ url, ext });
        }
    });
    
    // Tạo danh sách tải với ưu tiên WebP
    Object.keys(groupedUrls).forEach(number => {
        const urls = groupedUrls[number];
        
        if (CONFIG.preferWebP) {
            // Ưu tiên WebP trước
            const webpUrl = urls.find(u => u.ext === 'webp');
            const pngUrl = urls.find(u => u.ext === 'png');
            const gifUrl = urls.find(u => u.ext === 'gif');
            
            if (webpUrl) {
                downloadList.push({
                    url: webpUrl.url,
                    fileName: `${packName}-${number}.webp`,
                    ext: 'webp',
                    number: parseInt(number)
                });
            } else if (pngUrl) {
                downloadList.push({
                    url: pngUrl.url,
                    fileName: `${packName}-${number}.png`,
                    ext: 'png',
                    number: parseInt(number)
                });
            } else if (gifUrl) {
                downloadList.push({
                    url: gifUrl.url,
                    fileName: `${packName}-${number}.gif`,
                    ext: 'gif',
                    number: parseInt(number)
                });
            }
        } else {
            // Tải tất cả định dạng nếu có
            urls.forEach(({ url, ext }) => {
                downloadList.push({
                    url,
                    fileName: `${packName}-${number}.${ext}`,
                    ext,
                    number: parseInt(number)
                });
            });
        }
    });
    
    // Sắp xếp theo số thứ tự
    downloadList.sort((a, b) => a.number - b.number);
    
    return downloadList;
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
            `${CONFIG.baseUrl}/pack/${packName}`,
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
            console.log('⚠️  Không tìm thấy sticker URLs, tạo URLs mẫu...');
            // Tạo URLs mẫu nếu không tìm thấy
            const sampleUrls = [];
            for (let i = 1; i <= 10; i++) {
                sampleUrls.push({
                    url: `${CONFIG.baseUrl}/stickers/${packName}/sticker-${i}.png`,
                    ext: 'png'
                });
            }
            const downloadList = createDownloadList(sampleUrls, packName);
            await downloadStickers(downloadList, packDir);
            return;
        }
        
        // Extract sticker URLs
        const stickerUrls = extractStickerUrls(html, packName);
        
        if (stickerUrls.length === 0) {
            console.log('⚠️  Không tìm thấy sticker URLs, tạo URLs mẫu...');
            const sampleUrls = [];
            for (let i = 1; i <= 10; i++) {
                sampleUrls.push({
                    url: `${CONFIG.baseUrl}/stickers/${packName}/sticker-${i}.png`,
                    ext: 'png'
                });
            }
            const downloadList = createDownloadList(sampleUrls, packName);
            await downloadStickers(downloadList, packDir);
            return;
        }
        
        // Tạo danh sách tải
        const downloadList = createDownloadList(stickerUrls, packName);
        console.log(`📦 Tìm thấy ${downloadList.length} stickers`);
        
        // Tải stickers
        await downloadStickers(downloadList, packDir);
        
    } catch (error) {
        console.error(`❌ Lỗi crawl pack ${packName}:`, error.message);
    }
}

// Tải stickers
async function downloadStickers(downloadList, packDir) {
    let successCount = 0;
    
    for (let i = 0; i < downloadList.length; i++) {
        const { url, fileName, ext } = downloadList[i];
        const outputPath = path.join(packDir, fileName);
        
        console.log(`⬇️  Downloading: ${fileName} (${i + 1}/${downloadList.length})`);
        
        try {
            await downloadFile(url, outputPath);
            console.log(`✅ Downloaded: ${fileName}`);
            successCount++;
            
            // Delay giữa các downloads
            if (i < downloadList.length - 1) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.delay));
            }
        } catch (error) {
            console.error(`❌ Lỗi download ${fileName}:`, error.message);
        }
    }
    
    console.log(`🎉 Hoàn thành crawl pack (${successCount}/${downloadList.length} stickers)`);
    
    // Tạo metadata cho pack
    createPackMetadata(packDir.split(path.sep).pop(), successCount, downloadList);
}

// Tạo metadata cho pack
function createPackMetadata(packName, stickerCount, downloadList) {
    const metadataPath = path.join(CONFIG.outputDir, packName, 'pack-info.json');
    
    // Phân tích định dạng files
    const formatStats = {};
    downloadList.forEach(({ ext }) => {
        formatStats[ext] = (formatStats[ext] || 0) + 1;
    });
    
    const packInfo = {
        name: packName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Pack',
        id: packName,
        description: `Sticker pack crawled from SigStick`,
        source: 'SigStick',
        crawledAt: new Date().toISOString(),
        stickerCount: stickerCount,
        category: 'general',
        formats: formatStats,
        hasAnimated: formatStats.webp > 0 || formatStats.gif > 0
    };
    
    fs.writeFileSync(metadataPath, JSON.stringify(packInfo, null, 2));
    console.log(`📝 Tạo pack metadata: ${metadataPath}`);
    console.log(`📊 Định dạng: ${JSON.stringify(formatStats)}`);
    if (packInfo.hasAnimated) {
        console.log(`🎬 Pack có chứa ảnh động!`);
    }
}

// Main function
async function main() {
    const packName = process.argv[2];
    
    if (packName === 'help') {
        console.log(`
🎨 SigStick Enhanced Crawler - Tải cả PNG và WebP animated

Usage:
  node sigstick-crawler-enhanced.js [pack-name]  # Crawl một pack cụ thể
  node sigstick-crawler-enhanced.js help         # Hiển thị help

Examples:
  node sigstick-crawler-enhanced.js quby
  node sigstick-crawler-enhanced.js 1Dya2eQtWq0TeUtPi2D7

Features:
  ✅ Ưu tiên WebP animated nếu có
  ✅ Tải cả PNG và WebP
  ✅ Auto-detect pack URLs
  ✅ Extract sticker URLs từ HTML
  ✅ Download với retry mechanism
  ✅ Rate limiting để tránh spam
  ✅ Generate pack metadata với thông tin định dạng

Configuration:
  preferWebP: ${CONFIG.preferWebP} (ưu tiên WebP)
  downloadBoth: ${CONFIG.downloadBoth} (tải cả hai định dạng)

Output:
  stickers/[pack-name]/ - Thư mục chứa stickers đã tải
  stickers/[pack-name]/pack-info.json - Metadata của pack với thông tin định dạng
        `);
        return;
    }
    
    if (packName) {
        await crawlStickerPack(packName);
    } else {
        console.log('❌ Vui lòng chỉ định tên pack');
        console.log('💡 Sử dụng: node sigstick-crawler-enhanced.js help để xem hướng dẫn');
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
    downloadFile,
    extractStickerUrls,
    createDownloadList
};
