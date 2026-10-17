# SIT – Sistem Informasi Terintegrasi

Aplikasi web mahasiswa: kalender kegiatan, iuran, rekrutmen, dan tugas (Flask + SQLite).

## Struktur

```
sit/
├── api/index.py        # pintu masuk Vercel (mengimpor app Flask)
├── backend/app.py      # server Flask & REST API
├── frontend/           # HTML, CSS, JS (satu-satunya folder yang disajikan ke publik)
├── seed_uploads/       # contoh PDF untuk data awal admin
├── uploads/            # tempat upload saat jalan lokal (tidak di-commit)
├── vercel.json         # konfigurasi Vercel
├── requirements.txt    # dependensi Python
├── run.py / start.bat  # menjalankan secara lokal
```

## Jalankan lokal

```bash
pip install -r requirements.txt
py run.py          # atau klik ganda start.bat
```
Buka http://localhost:5000

## Deploy ke Vercel

1. Upload isi folder ini ke repository GitHub baru.
2. Di vercel.com: **Add New → Project → Import** repository tersebut.
3. Framework Preset: **Other**. Biarkan Build/Output kosong.
4. Buka **Environment Variables**, tambahkan `SECRET_KEY` dengan teks acak yang panjang.
5. Klik **Deploy**.

## Catatan penting

- Di Vercel, database dan file upload disimpan di `/tmp` yang **bersifat sementara**.
  Akun baru, event, dan upload bisa hilang saat server restart. Cocok untuk demo.
  Untuk pemakaian sungguhan, pindahkan ke database online (mis. Neon/Supabase) dan Vercel Blob.
- Akun bawaan: mahasiswa `2210XXXXXX` / `password123`, admin `12345678` / `12345678`.
  **Ganti sebelum dipakai publik.**
