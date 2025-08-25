#!/usr/bin/env node

/**
 * Wrapper script để chạy generate-metadata.js từ thư mục gốc
 * Usage: node generate-metadata.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🎨 Chạy generate-metadata script...');

// Chạy script từ thư mục scripts
const scriptPath = path.join(__dirname, 'scripts', 'generate-metadata.js');
const child = spawn('node', [scriptPath], {
    stdio: 'inherit',
    cwd: __dirname
});

child.on('close', (code) => {
    if (code === 0) {
        console.log('✅ Script hoàn thành thành công!');
    } else {
        console.error(`❌ Script thất bại với mã lỗi: ${code}`);
        process.exit(code);
    }
});

child.on('error', (error) => {
    console.error('❌ Lỗi khi chạy script:', error.message);
    process.exit(1);
});
