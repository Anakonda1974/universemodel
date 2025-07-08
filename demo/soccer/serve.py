#!/usr/bin/env python3
"""
Simple HTTP server for serving the soccer demo files.
This solves CORS issues when loading ES modules.

Usage:
    python serve.py

Then open: http://localhost:8000/index.html (for 2D version)
       or: http://localhost:8000/index3d.html (for 3D version)
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

# Configuration
PORT = 8000
HOST = 'localhost'

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler to set proper MIME types for ES modules"""
    
    def end_headers(self):
        # Set proper MIME type for JavaScript modules
        if self.path.endswith('.js'):
            self.send_header('Content-Type', 'application/javascript')
        # Enable CORS for all requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def main():
    # Change to the directory containing this script
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"🚀 Starting Soccer Demo Server...")
    print(f"📁 Serving files from: {script_dir}")
    print(f"🌐 Server URL: http://{HOST}:{PORT}")
    print(f"")
    print(f"📋 Available demos:")
    print(f"   2D Version: http://{HOST}:{PORT}/index.html")
    print(f"   3D Version: http://{HOST}:{PORT}/index3d.html")
    print(f"")
    print(f"⚠️  Press Ctrl+C to stop the server")
    print(f"")
    
    # Create server
    with socketserver.TCPServer((HOST, PORT), CustomHTTPRequestHandler) as httpd:
        try:
            # Try to open browser automatically
            try:
                print(f"🌐 Opening browser...")
                webbrowser.open(f'http://{HOST}:{PORT}/index.html')
            except Exception as e:
                print(f"⚠️  Could not open browser automatically: {e}")
                print(f"   Please open http://{HOST}:{PORT}/index.html manually")
            
            print(f"✅ Server started successfully!")
            print(f"   Listening on http://{HOST}:{PORT}")
            
            # Start serving
            httpd.serve_forever()
            
        except KeyboardInterrupt:
            print(f"\n🛑 Server stopped by user")
        except Exception as e:
            print(f"❌ Server error: {e}")
        finally:
            httpd.shutdown()

if __name__ == "__main__":
    main()
