#!/usr/bin/env node

/**
 * Script kiểm tra file WebP animated trong pack
 */

const https = require('https');
const zlib = require('zlib');
const fs = require('fs');

const CONFIG = {
    baseUrl: 'https://www.sigstick.com',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    timeout: 15000
};

// HTTP request helper
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const requestOptions = {
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: CONFIG.timeout
        };

        const request = https.get(url, requestOptions, (response) => {
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

async function checkWebP(packId) {
    console.log(`🔍 Kiểm tra WebP animated cho pack: ${packId}`);
    console.log(`URL: ${CONFIG.baseUrl}/pack/${packId.toUpperCase()}`);
    console.log('=====================================');
    
    try {
        const url = `${CONFIG.baseUrl}/pack/${packId.toUpperCase()}`;
        const response = await makeRequest(url);
        
        console.log(`✅ Status: ${response.statusCode}`);
        console.log(`📏 Content Length: ${response.data.length} characters`);
        
        // Tìm tất cả CDN URLs
        console.log('\n🔍 Tìm kiếm tất cả CDN URLs...');
        
        // Pattern cho PNG
        const pngPattern = /https:\/\/cdn\.cdnstep\.com\/[^\/]+\/[^\/]+\.png/gi;
        // Pattern cho WebP
        const webpPattern = /https:\/\/cdn\.cdnstep\.com\/[^\/]+\/[^\/]+\.webp/gi;
        // Pattern cho GIF
        const gifPattern = /https:\/\/cdn\.cdnstep\.com\/[^\/]+\/[^\/]+\.gif/gi;
        
        let pngUrls = [];
        let webpUrls = [];
        let gifUrls = [];
        
        let match;
        
        // Tìm PNG
        while ((match = pngPattern.exec(response.data)) !== null) {
            const url = match[0];
            if (url.includes(packId)) {
                pngUrls.push(url);
            }
        }
        
        // Tìm WebP
        while ((match = webpPattern.exec(response.data)) !== null) {
            const url = match[0];
            if (url.includes(packId)) {
                webpUrls.push(url);
            }
        }
        
        // Tìm GIF
        while ((match = gifPattern.exec(response.data)) !== null) {
            const url = match[0];
            if (url.includes(packId)) {
                gifUrls.push(url);
            }
        }
        
        console.log(`📊 Kết quả tìm kiếm:`);
        console.log(`  📷 PNG files: ${pngUrls.length}`);
        console.log(`  🎬 WebP files: ${webpUrls.length}`);
        console.log(`  🎞️  GIF files: ${gifUrls.length}`);
        
        if (webpUrls.length > 0) {
            console.log('\n🎬 Tìm thấy WebP files:');
            webpUrls.forEach((url, index) => {
                console.log(`  ${index + 1}. ${url}`);
            });
        }
        
        if (gifUrls.length > 0) {
            console.log('\n🎞️  Tìm thấy GIF files:');
            gifUrls.forEach((url, index) => {
                console.log(`  ${index + 1}. ${url}`);
            });
        }
        
        // Kiểm tra xem có file nào không có extension .png không
        const allImagePattern = /https:\/\/cdn\.cdnstep\.com\/[^\/]+\/[^\/]+\.(png|webp|gif|jpg|jpeg)/gi;
        let allImageUrls = [];
        
        while ((match = allImagePattern.exec(response.data)) !== null) {
            const url = match[0];
            if (url.includes(packId)) {
                allImageUrls.push(url);
            }
        }
        
        console.log('\n📋 Tất cả image URLs cho pack này:');
        allImageUrls.forEach((url, index) => {
            const ext = url.split('.').pop().toLowerCase();
            console.log(`  ${index + 1}. ${url} (${ext})`);
        });
        
        // Lưu HTML để phân tích thêm
        const htmlFile = `debug-${packId}-webp.html`;
        fs.writeFileSync(htmlFile, response.data);
        console.log(`\n💾 Đã lưu HTML vào: ${htmlFile}`);
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    }
}

// Chạy kiểm tra
const packId = process.argv[2] || 'tzXSD73h6C5OSxoDSmGC';
checkWebP(packId).catch(console.error);
