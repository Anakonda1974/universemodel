#!/usr/bin/env node
/**
 * Simple HTTP server for serving the soccer demo files.
 * This solves CORS issues when loading ES modules.
 * 
 * Usage:
 *     node serve.js
 * 
 * Then open: http://localhost:8000/index.html (for 2D version)
 *        or: http://localhost:8000/index3d.html (for 3D version)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8000;
const HOST = 'localhost';

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
    // Parse URL and remove query parameters
    let filePath = req.url.split('?')[0];
    
    // Default to index.html
    if (filePath === '/') {
        filePath = '/index.html';
    }
    
    // Construct full file path
    const fullPath = path.join(__dirname, filePath);
    
    // Security check - prevent directory traversal
    if (!fullPath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }
    
    // Check if file exists
    fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }
        
        // Read and serve file
        fs.readFile(fullPath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal server error');
                return;
            }
            
            // Set headers
            const mimeType = getMimeType(fullPath);
            res.writeHead(200, {
                'Content-Type': mimeType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            
            res.end(data);
        });
    });
});

server.listen(PORT, HOST, () => {
    console.log('🚀 Starting Soccer Demo Server...');
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🌐 Server URL: http://${HOST}:${PORT}`);
    console.log('');
    console.log('📋 Available demos:');
    console.log(`   2D Version: http://${HOST}:${PORT}/index.html`);
    console.log(`   3D Version: http://${HOST}:${PORT}/index3d.html`);
    console.log('');
    console.log('⚠️  Press Ctrl+C to stop the server');
    console.log('');
    
    // Try to open browser automatically
    const url = `http://${HOST}:${PORT}/index.html`;
    console.log('🌐 Opening browser...');
    
    // Cross-platform browser opening
    const command = process.platform === 'win32' ? 'start' : 
                   process.platform === 'darwin' ? 'open' : 'xdg-open';
    
    exec(`${command} ${url}`, (err) => {
        if (err) {
            console.log('⚠️  Could not open browser automatically');
            console.log(`   Please open ${url} manually`);
        }
    });
    
    console.log('✅ Server started successfully!');
    console.log(`   Listening on http://${HOST}:${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is already in use`);
        console.log('   Try a different port or stop the other server');
    } else {
        console.log(`❌ Server error: ${err.message}`);
    }
});

process.on('SIGINT', () => {
    console.log('\n🛑 Server stopped by user');
    process.exit(0);
});
