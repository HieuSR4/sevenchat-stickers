#!/usr/bin/env node

/**
 * SigStick Enhanced Crawler Wrapper - Tải cả PNG và WebP animated
 * Usage: node crawl-sigstick-enhanced.js [pack-name]
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🎨 SigStick Enhanced Crawler - SevenChat Stickers');
console.log('=====================================');
console.log('🎬 Hỗ trợ tải WebP animated và PNG');
console.log('📊 Ưu tiên WebP animated nếu có');
console.log('');

// Chạy script crawler enhanced từ thư mục scripts
const scriptPath = path.join(__dirname, 'scripts', 'sigstick-crawler-enhanced.js');
const args = process.argv.slice(2);

console.log(`🚀 Chạy enhanced crawler với arguments: ${args.join(' ')}`);

const child = spawn('node', [scriptPath, ...args], {
    stdio: 'inherit',
    cwd: __dirname
});

child.on('close', (code) => {
    if (code === 0) {
        console.log('\n✅ Enhanced crawler hoàn thành thành công!');
        console.log('📁 Kiểm tra thư mục stickers/ để xem kết quả');
        console.log('🎬 Nếu có WebP animated, bạn sẽ thấy file .webp');
    } else {
        console.error(`\n❌ Enhanced crawler thất bại với mã lỗi: ${code}`);
        process.exit(code);
    }
});

child.on('error', (error) => {
    console.error('❌ Lỗi khi chạy enhanced crawler:', error.message);
    process.exit(1);
});
