#!/usr/bin/env node

/**
 * Simple HTTP server for serving the demo files
 * Resolves CORS issues when running locally
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

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

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let urlPath = req.url;
  
  // Handle root path
  if (urlPath === '/') {
    urlPath = '/demo/real-time-editor.html';
  }
  
  // Remove query parameters
  urlPath = urlPath.split('?')[0];
  
  // Construct file path
  const filePath = path.join(projectRoot, urlPath);
  
  // Security check - ensure file is within project directory
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(projectRoot)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access denied');
    return;
  }
  
  // Check if file exists
  fs.stat(normalizedPath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }
    
    if (stats.isFile()) {
      serveFile(res, normalizedPath);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not a file');
    }
  });
});

const PORT = process.env.PORT || 3456;

server.listen(PORT, () => {
  console.log('🚀 Procedural Universe Demo Server Started!');
  console.log('='.repeat(50));
  console.log(`📡 Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('🌍 Available Demos:');
  console.log(`   Real-time Editor:    http://localhost:${PORT}/demo/real-time-editor.html`);
  console.log(`   Performance Demo:    http://localhost:${PORT}/demo/performance-demo.html`);
  console.log(`   System Builder:      http://localhost:${PORT}/demo/system-builder.html`);
  console.log('');
  console.log('📁 Available Files:');
  console.log(`   JavaScript Modules:  http://localhost:${PORT}/dist/`);
  console.log(`   Source Code:         http://localhost:${PORT}/src/`);
  console.log(`   Documentation:       http://localhost:${PORT}/PERFORMANCE_UPGRADES.md`);
  console.log('');
  console.log('💡 Tips:');
  console.log('   • Press Ctrl+C to stop the server');
  console.log('   • Refresh browser after code changes');
  console.log('   • Check browser console for any errors');
  console.log('');
  console.log('✨ Ready for interactive procedural universe exploration!');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped successfully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
