#!/usr/bin/env node

/**
 * Debug script để xem HTML của pack cụ thể
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

async function debugPack(packId) {
    console.log(`🔍 Debug pack: ${packId}`);
    console.log(`URL: ${CONFIG.baseUrl}/pack/${packId.toUpperCase()}`);
    console.log('=====================================');
    
    try {
        const url = `${CONFIG.baseUrl}/pack/${packId.toUpperCase()}`;
        const response = await makeRequest(url);
        
        console.log(`✅ Status: ${response.statusCode}`);
        console.log(`📏 Content Length: ${response.data.length} characters`);
        console.log(`📄 Content Type: ${response.headers['content-type']}`);
        
        // Lưu HTML để phân tích
        const htmlFile = `debug-${packId}.html`;
        fs.writeFileSync(htmlFile, response.data);
        console.log(`💾 Đã lưu HTML vào: ${htmlFile}`);
        
        // Tìm CDN URLs
        console.log('\n🔍 Tìm kiếm CDN URLs...');
        const cdnPattern = /https:\/\/cdn\.cdnstep\.com\/[^\/]+\/[^\/]+\.(?:png|jpg|jpeg|gif|webp)/gi;
        let match;
        let cdnUrls = [];
        
        while ((match = cdnPattern.exec(response.data)) !== null) {
            const url = match[0];
            if (url.includes(packId)) {
                cdnUrls.push(url);
                console.log(`📷 Tìm thấy CDN URL: ${url}`);
            }
        }
        
        if (cdnUrls.length === 0) {
            console.log('❌ Không tìm thấy CDN URLs cho pack này');
            
            // Tìm tất cả CDN URLs
            console.log('\n🔍 Tìm tất cả CDN URLs trong trang...');
            const allCdnPattern = /https:\/\/cdn\.cdnstep\.com\/[^\/]+\/[^\/]+\.(?:png|jpg|jpeg|gif|webp)/gi;
            let allUrls = [];
            
            while ((match = allCdnPattern.exec(response.data)) !== null) {
                allUrls.push(match[0]);
            }
            
            console.log(`📊 Tìm thấy ${allUrls.length} CDN URLs tổng cộng:`);
            allUrls.forEach((url, index) => {
                console.log(`  ${index + 1}. ${url}`);
            });
        } else {
            console.log(`✅ Tìm thấy ${cdnUrls.length} CDN URLs cho pack ${packId}`);
        }
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    }
}

// Chạy debug
const packId = process.argv[2] || '1qI2dUmv0XQGHScRRLqO';
debugPack(packId).catch(console.error);
