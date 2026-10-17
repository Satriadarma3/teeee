#!/usr/bin/env python3
"""
SIT - Runner Script
Menjalankan server backend Flask dan menyajikan seluruh frontend (HTML, CSS, JS, upload).
"""
import os
import sys
import socket

# Tambahkan direktori backend ke path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from app import app, init_db

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    lan_ip = get_lan_ip()

    print("=" * 60)
    print(" 🚀 SIT (Sistem Informasi Terintegrasi) - Server Aktif!")
    print("=" * 60)
    print(f" ▶ Localhost:       http://localhost:{port}")
    print(f" ▶ Akses Jaringan:  http://{lan_ip}:{port}")
    print("   (Gunakan URL jaringan di atas untuk akses dari HP / laptop lain)")
    print("=" * 60)
    print(" Tekan CTRL+C untuk menghentikan server.")
    print("=" * 60)

    app.run(host='0.0.0.0', port=port, debug=True)

