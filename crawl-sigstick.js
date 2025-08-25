#!/usr/bin/env node

/**
 * SigStick Crawler Wrapper - Chạy crawler từ thư mục gốc
 * Usage: node crawl-sigstick.js [pack-name]
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🎨 SigStick Crawler - SevenChat Stickers');
console.log('=====================================');

// Chạy script crawler từ thư mục scripts
const scriptPath = path.join(__dirname, 'scripts', 'sigstick-crawler.js');
const args = process.argv.slice(2);

console.log(`🚀 Chạy crawler với arguments: ${args.join(' ')}`);

const child = spawn('node', [scriptPath, ...args], {
    stdio: 'inherit',
    cwd: __dirname
});

child.on('close', (code) => {
    if (code === 0) {
        console.log('\n✅ Crawler hoàn thành thành công!');
        console.log('📁 Kiểm tra thư mục stickers/ để xem kết quả');
    } else {
        console.error(`\n❌ Crawler thất bại với mã lỗi: ${code}`);
        process.exit(code);
    }
});

child.on('error', (error) => {
    console.error('❌ Lỗi khi chạy crawler:', error.message);
    process.exit(1);
});
