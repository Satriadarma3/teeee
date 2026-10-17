import os
import sqlite3
import json
import uuid
from datetime import datetime
import re
try:
    from werkzeug.utils import secure_filename
except ImportError:
    def secure_filename(filename):
        return re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)

from flask import Flask, request, jsonify, send_from_directory, session, redirect

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..'))
ROOT_DIR = os.path.join(PROJECT_DIR, 'frontend')      # hanya folder ini yang boleh diakses publik
SEED_DIR = os.path.join(PROJECT_DIR, 'seed_uploads')  # contoh PDF bawaan untuk data awal

if os.environ.get('VERCEL'):
    UPLOADS_DIR = '/tmp/uploads'
    DB_PATH = '/tmp/sit.db'
else:
    UPLOADS_DIR = os.path.join(PROJECT_DIR, 'uploads')
    DB_PATH = os.path.join(BASE_DIR, 'sit.db')

os.makedirs(UPLOADS_DIR, exist_ok=True)

# Salin contoh PDF bawaan (dipakai data awal admin) bila belum ada.
# Di Vercel folder /tmp kosong tiap cold start, jadi ini perlu diulang.
if os.path.isdir(SEED_DIR):
    import shutil
    for _name in os.listdir(SEED_DIR):
        _dst = os.path.join(UPLOADS_DIR, _name)
        if not os.path.exists(_dst):
            shutil.copy2(os.path.join(SEED_DIR, _name), _dst)

app = Flask(__name__, static_folder=ROOT_DIR, static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'sit-secret-key-unsoed-2026')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

_db_initialized = False

def get_db():
    global _db_initialized
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    if not _db_initialized:
        init_db_conn(conn)
        _db_initialized = True
    return conn

def init_db():
    conn = get_db()
    conn.close()

def init_db_conn(conn):
    c = conn.cursor()

    c.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nim TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        prodi TEXT DEFAULT 'Informatika',
        angkatan TEXT DEFAULT '2026',
        photo TEXT DEFAULT '',
        role TEXT DEFAULT 'mahasiswa',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    c.execute('''
    CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        k TEXT NOT NULL,
        t TEXT NOT NULL,
        s INTEGER NOT NULL,
        e INTEGER NOT NULL,
        p TEXT,
        d TEXT,
        amt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    c.execute('''
    CREATE TABLE IF NOT EXISTS verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        t TEXT NOT NULL,
        p TEXT NOT NULL,
        st TEXT NOT NULL DEFAULT 'Menunggu',
        kind TEXT,
        item_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    c.execute('''
    CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, item_id)
    )
    ''')

    c.execute('''
    CREATE TABLE IF NOT EXISTS dues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        t TEXT NOT NULL,
        s TEXT NOT NULL,
        a TEXT NOT NULL,
        pill TEXT NOT NULL,
        pc TEXT NOT NULL,
        can_pay INTEGER DEFAULT 0
    )
    ''')

    # Seed Default User
    c.execute("SELECT COUNT(*) FROM users WHERE nim = '2210XXXXXX'")
    if c.fetchone()[0] == 0:
        c.execute('''
            INSERT INTO users (nim, password, name, prodi, angkatan, role)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('2210XXXXXX', 'password123', 'J. Doe', 'Informatika', '2026', 'mahasiswa'))
        default_user_id = c.lastrowid
    else:
        c.execute("SELECT id FROM users WHERE nim = '2210XXXXXX'")
        default_user_id = c.fetchone()['id']

    # Seed / Ensure Admin User with NIM 12345678
    c.execute("SELECT COUNT(*) FROM users WHERE nim = '12345678'")
    if c.fetchone()[0] == 0:
        c.execute('''
            INSERT INTO users (nim, password, name, prodi, angkatan, role)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('12345678', '12345678', 'Satria adidarma', 'Informatika', '2026', 'admin'))
    else:
        c.execute("UPDATE users SET role = 'admin' WHERE nim = '12345678'")

    # Seed Default Items
    c.execute("SELECT COUNT(*) FROM items")
    if c.fetchone()[0] == 0:
        default_items = [
            (1, 'event', 'Cloud Workshop', 5, 5, 'Lab Fasilkom', 'AWS Cloud fundamentals and hands-on session.', None),
            (2, 'event', 'Informatics Championship', 10, 12, 'Fasilkom Unsoed', 'Annual sports and e-sports event.', None),
            (3, 'recruit', 'BEM Recruitment 2026', 16, 16, 'Student Center Unsoed', 'Student Executive Board open recruitment for tech & PR division.', None),
            (5, 'pay', 'Kas Himpunan', 18, 31, 'Online Portal', 'Monthly dues utilized for upcoming national seminar logistics.', 'Rp 50.000'),
            (4, 'assign', 'Web Dev Assignment', 28, 28, 'E-Learning Portal', 'Final project web development submission deadline.', None)
        ]
        c.executemany('''
            INSERT INTO items (id, k, t, s, e, p, d, amt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', default_items)

    # Seed Default Verifications
    c.execute("SELECT COUNT(*) FROM verifications")
    if c.fetchone()[0] == 0:
        default_verifs = [
            (1, default_user_id, 'J. Doe · 2210XXXX', 'bukti_doe.pdf', 'Menunggu', 'pay', 5),
            (2, None, 'A. Putri · 2210YYYY', 'bukti_putri.pdf', 'Terverifikasi', 'pay', 5),
            (3, None, 'R. Pratama · 2210ZZZZ', 'bukti_rafi.pdf', 'Menunggu', 'pay', 5)
        ]
        c.executemany('''
            INSERT INTO verifications (id, user_id, t, p, st, kind, item_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', default_verifs)

    # Seed Default Dues
    c.execute("SELECT COUNT(*) FROM dues")
    if c.fetchone()[0] == 0:
        default_dues = [
            (default_user_id, 'Kas Agustus', 'Dibayar 5 Agu', 'Rp 50.000', 'Lunas', 'ok', 0),
            (default_user_id, 'Kas September', 'Dibayar 9 Sep', 'Rp 50.000', 'Menunggu verifikasi', 'wait', 0),
            (default_user_id, 'Kas Oktober', 'Jatuh tempo 31 Okt', 'Rp 50.000', 'Belum lunas', 'bad', 1)
        ]
        c.executemany('''
            INSERT INTO dues (user_id, t, s, a, pill, pc, can_pay)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', default_dues)

    conn.commit()

def get_current_user():
    user_id = session.get('user_id')
    nim = request.headers.get('X-User-NIM')
    conn = get_db()
    c = conn.cursor()
    user = None
    if user_id:
        c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user = c.fetchone()
    elif nim:
        c.execute("SELECT * FROM users WHERE nim = ?", (nim,))
        user = c.fetchone()

    if not user:
        # Fallback to default user
        c.execute("SELECT * FROM users WHERE nim = '2210XXXXXX'")
        user = c.fetchone()
    conn.close()
    return user

# ----------------- STATIC / FRONTEND ROUTES -----------------
@app.route('/')
def route_index():
    return send_from_directory(ROOT_DIR, 'index.html')

@app.route('/kalender')
@app.route('/kalender.html')
def route_kalender():
    return send_from_directory(ROOT_DIR, 'kalender.html')

@app.route('/profil')
@app.route('/profil.html')
def route_profil():
    return send_from_directory(ROOT_DIR, 'profil.html')

@app.route('/admin')
@app.route('/admin.html')
def route_admin():
    user = get_current_user()
    if not user or user['role'] != 'admin':
        return redirect('/kalender.html')
    return send_from_directory(ROOT_DIR, 'admin.html')

@app.route('/uploads/<path:filename>')
def route_uploads(filename):
    return send_from_directory(UPLOADS_DIR, filename)

@app.route('/<path:filename>')
def route_static(filename):
    file_path = os.path.join(ROOT_DIR, filename)
    if os.path.isfile(file_path):
        return send_from_directory(ROOT_DIR, filename)
    return send_from_directory(ROOT_DIR, 'index.html')

# ----------------- REST API ROUTES -----------------

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    nim = (data.get('nim') or '').strip()
    pw = data.get('pw') or ''

    if not nim or not pw:
        return jsonify({'ok': False, 'msg': 'NIM dan password harus diisi.'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE nim = ?", (nim,))
    user = c.fetchone()

    if not user:
        conn.close()
        return jsonify({
            'ok': False,
            'not_registered': True,
            'msg': 'Akun tidak terdaftar di database. Silakan daftar akun terlebih dahulu.'
        }), 404
    elif user['password'] != pw:
        conn.close()
        return jsonify({'ok': False, 'msg': 'Password salah. Periksa kembali password Anda.'}), 401

    session['user_id'] = user['id']
    profile = {
        'id': user['id'],
        'n': user['name'],
        'nim': user['nim'],
        'prodi': user['prodi'],
        'ang': user['angkatan'],
        'photo': user['photo'],
        'role': user['role']
    }
    conn.close()
    return jsonify({'ok': True, 'profile': profile})

@app.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    nim = (data.get('nim') or '').strip()
    pw = data.get('pw') or ''
    name = (data.get('name') or '').strip() or nim
    prodi = (data.get('prodi') or 'Informatika').strip()
    angkatan = (data.get('angkatan') or '2026').strip()
    role = 'admin' if nim == '12345678' else 'mahasiswa'

    if not nim or not pw:
        return jsonify({'ok': False, 'msg': 'NIM dan password harus diisi.'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id FROM users WHERE nim = ?", (nim,))
    existing = c.fetchone()
    if existing:
        c.execute('''
            UPDATE users SET password = ?, name = ?, prodi = ?, angkatan = ?, role = ?
            WHERE id = ?
        ''', (pw, name, prodi, angkatan, role, existing['id']))
        user_id = existing['id']
    else:
        c.execute('''
            INSERT INTO users (nim, password, name, prodi, angkatan, role)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (nim, pw, name, prodi, angkatan, role))
        user_id = c.lastrowid
    conn.commit()
    session['user_id'] = user_id
    conn.close()
    return jsonify({
        'ok': True,
        'profile': {
            'id': user_id,
            'n': name,
            'nim': nim,
            'prodi': prodi,
            'ang': angkatan,
            'photo': '',
            'role': role
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    session.pop('user_id', None)
    return jsonify({'ok': True})

@app.route('/api/data', methods=['GET'])
def api_get_data():
    user = get_current_user()
    conn = get_db()
    c = conn.cursor()

    # Profile
    profile = {
        'id': user['id'] if user else 1,
        'n': user['name'] if user else 'J. Doe',
        'nim': user['nim'] if user else '2210XXXXXX',
        'prodi': user['prodi'] if user else 'Informatika',
        'ang': user['angkatan'] if user else '2026',
        'photo': user['photo'] if user else '',
        'role': user['role'] if user else 'mahasiswa'
    }

    # Items
    c.execute("SELECT id, k, t, s, e, p, d, amt FROM items ORDER BY s ASC, id ASC")
    items_rows = c.fetchall()
    items = []
    for r in items_rows:
        item = {
            'id': r['id'],
            'k': r['k'],
            't': r['t'],
            's': r['s'],
            'e': r['e'],
            'p': r['p'] or '',
            'd': r['d'] or ''
        }
        if r['amt']:
            item['amt'] = r['amt']
        items.append(item)

    # Verifications
    c.execute("SELECT id, t, p, st, kind, item_id FROM verifications ORDER BY id DESC")
    verif_rows = c.fetchall()
    verif = [{'id': r['id'], 't': r['t'], 'p': r['p'], 'st': r['st']} for r in verif_rows]

    # Sent submissions
    sent = {}
    if user:
        c.execute("SELECT item_id FROM submissions WHERE user_id = ?", (user['id'],))
        for row in c.fetchall():
            sent[str(row['item_id'])] = 1

    # Dues
    dues = []
    if user:
        c.execute("SELECT id, t, s, a, pill, pc, can_pay FROM dues WHERE user_id = ? ORDER BY id ASC", (user['id'],))
        for r in c.fetchall():
            d_dict = {
                'id': r['id'],
                't': r['t'],
                's': r['s'],
                'a': r['a'],
                'pill': r['pill'],
                'pc': r['pc']
            }
            if r['can_pay']:
                d_dict['pay'] = True
            dues.append(d_dict)

    conn.close()
    return jsonify({
        'ok': True,
        'profile': profile,
        'items': items,
        'verif': verif,
        'sent': sent,
        'dues': dues
    })

@app.route('/api/profile', methods=['GET', 'POST'])
def api_profile():
    user = get_current_user()
    if not user:
        return jsonify({'ok': False, 'msg': 'User tidak ditemukan'}), 404

    conn = get_db()
    c = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        name = data.get('n', user['name']).strip()
        prodi = data.get('prodi', user['prodi']).strip()
        ang = data.get('ang', user['angkatan']).strip()
        photo = data.get('photo', user['photo'])

        c.execute('''
            UPDATE users SET name = ?, prodi = ?, angkatan = ?, photo = ?
            WHERE id = ?
        ''', (name, prodi, ang, photo, user['id']))
        conn.commit()

        c.execute("SELECT * FROM users WHERE id = ?", (user['id'],))
        user = c.fetchone()

    profile = {
        'id': user['id'],
        'n': user['name'],
        'nim': user['nim'],
        'prodi': user['prodi'],
        'ang': user['angkatan'],
        'photo': user['photo'],
        'role': user['role']
    }
    conn.close()
    return jsonify({'ok': True, 'profile': profile})

@app.route('/api/items', methods=['GET', 'POST'])
def api_items():
    conn = get_db()
    c = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        k = data.get('k')
        t = (data.get('t') or '').strip()
        s = int(data.get('s', 1))
        e = int(data.get('e', s))
        p = (data.get('p') or '').strip()
        d = (data.get('d') or '').strip()
        amt = data.get('amt')

        if not t or not (1 <= s <= 31) or not (s <= e <= 31):
            conn.close()
            return jsonify({'ok': False, 'msg': 'Data item tidak valid'}), 400

        c.execute('''
            INSERT INTO items (k, t, s, e, p, d, amt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (k, t, s, e, p, d, amt))
        item_id = c.lastrowid
        conn.commit()
        conn.close()
        return jsonify({'ok': True, 'id': item_id, 'item': {'id': item_id, 'k': k, 't': t, 's': s, 'e': e, 'p': p, 'd': d, 'amt': amt}})

    c.execute("SELECT * FROM items ORDER BY s ASC, id ASC")
    rows = c.fetchall()
    items = []
    for r in rows:
        item = {'id': r['id'], 'k': r['k'], 't': r['t'], 's': r['s'], 'e': r['e'], 'p': r['p'], 'd': r['d']}
        if r['amt']:
            item['amt'] = r['amt']
        items.append(item)
    conn.close()
    return jsonify({'ok': True, 'items': items})

@app.route('/api/items/<int:item_id>', methods=['PUT', 'DELETE'])
def api_item_detail(item_id):
    conn = get_db()
    c = conn.cursor()

    if request.method == 'DELETE':
        c.execute("DELETE FROM items WHERE id = ?", (item_id,))
        conn.commit()
        conn.close()
        return jsonify({'ok': True, 'msg': 'Item dihapus'})

    # PUT
    data = request.get_json() or {}
    k = data.get('k')
    t = (data.get('t') or '').strip()
    s = int(data.get('s', 1))
    e = int(data.get('e', s))
    p = (data.get('p') or '').strip()
    d = (data.get('d') or '').strip()
    amt = data.get('amt')

    c.execute('''
        UPDATE items
        SET k = ?, t = ?, s = ?, e = ?, p = ?, d = ?, amt = ?
        WHERE id = ?
    ''', (k, t, s, e, p, d, amt, item_id))
    conn.commit()
    conn.close()
    return jsonify({'ok': True, 'msg': 'Item diperbarui'})

@app.route('/api/verif', methods=['GET'])
def api_verif_list():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM verifications ORDER BY id DESC")
    rows = c.fetchall()
    verifs = [{'id': r['id'], 't': r['t'], 'p': r['p'], 'st': r['st']} for r in rows]
    conn.close()
    return jsonify({'ok': True, 'verif': verifs})

@app.route('/api/verif/<int:verif_id>/status', methods=['POST'])
def api_verif_status(verif_id):
    data = request.get_json() or {}
    status = data.get('status')
    if not status:
        return jsonify({'ok': False, 'msg': 'Status required'}), 400

    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE verifications SET st = ? WHERE id = ?", (status, verif_id))

    # Jika admin menerima (Terverifikasi), update status terkait
    if status == 'Terverifikasi':
        # Ambil info verifikasi: kind dan user_id
        c.execute("SELECT kind, user_id, item_id FROM verifications WHERE id = ?", (verif_id,))
        row = c.fetchone()
        if row:
            kind = row['kind']
            vuser_id = row['user_id']
            item_id = row['item_id']

            if kind == 'pay' and vuser_id:
                # Update dues jadi Lunas
                c.execute('''
                    UPDATE dues SET pill = 'Lunas', pc = 'ok', can_pay = 0
                    WHERE user_id = ? AND (t LIKE '%Oktober%' OR t LIKE '%September%' OR t LIKE '%Agustus%')
                    AND pill IN ('Menunggu verifikasi', 'Belum lunas')
                    ORDER BY id DESC
                    LIMIT 1
                ''', (vuser_id,))
                # Lebih spesifik: update berdasarkan item_id jika tersedia
                if item_id:
                    c.execute('''
                        UPDATE dues SET pill = 'Lunas', pc = 'ok', can_pay = 0
                        WHERE user_id = ? AND pill IN ('Menunggu verifikasi', 'Belum lunas')
                    ''', (vuser_id,))

            elif kind == 'assign' and vuser_id:
                # Tandai submission sebagai dinilai
                if item_id:
                    c.execute('''
                        UPDATE submissions SET data = json_set(COALESCE(data, '{}'), '$.graded', 1)
                        WHERE user_id = ? AND item_id = ?
                    ''', (vuser_id, item_id))

    conn.commit()
    conn.close()
    return jsonify({'ok': True, 'id': verif_id, 'status': status})

@app.route('/api/upload', methods=['POST'])
def api_upload_file():
    if 'file' not in request.files:
        return jsonify({'ok': False, 'msg': 'File tidak ditemukan'}), 400

    f = request.files['file']
    if f.filename == '':
        return jsonify({'ok': False, 'msg': 'Nama file kosong'}), 400

    if f and allowed_file(f.filename):
        ext = f.filename.rsplit('.', 1)[1].lower()
        clean_name = secure_filename(f.filename.rsplit('.', 1)[0]) or 'file'
        unique_name = f"{clean_name}_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}.{ext}"
        save_path = os.path.join(UPLOADS_DIR, unique_name)
        f.save(save_path)
        url = f"/uploads/{unique_name}"
        return jsonify({'ok': True, 'url': url, 'filename': unique_name, 'original_name': f.filename})

    return jsonify({'ok': False, 'msg': 'Format file tidak didukung'}), 400

@app.route('/api/submit', methods=['POST'])
def api_submit():
    user = get_current_user()
    if not user:
        return jsonify({'ok': False, 'msg': 'User tidak ditemukan'}), 404

    item_id = request.form.get('item_id') or (request.get_json() or {}).get('item_id')
    if not item_id:
        return jsonify({'ok': False, 'msg': 'Item ID required'}), 400

    item_id = int(item_id)
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM items WHERE id = ?", (item_id,))
    item = c.fetchone()
    if not item:
        conn.close()
        return jsonify({'ok': False, 'msg': 'Item tidak ditemukan'}), 404

    uploaded_filename = None
    if 'file' in request.files:
        f = request.files['file']
        if f and allowed_file(f.filename):
            ext = f.filename.rsplit('.', 1)[1].lower()
            clean_name = secure_filename(f.filename.rsplit('.', 1)[0]) or 'upload'
            unique_name = f"{clean_name}_{int(datetime.now().timestamp())}.{ext}"
            f.save(os.path.join(UPLOADS_DIR, unique_name))
            uploaded_filename = unique_name

    submission_data = {
        'divisi': request.form.get('divisi', ''),
        'motivasi': request.form.get('motivasi', ''),
        'file': uploaded_filename
    }

    c.execute('''
        INSERT INTO submissions (user_id, item_id, data)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, item_id) DO UPDATE SET data = excluded.data
    ''', (user['id'], item_id, json.dumps(submission_data)))

    # If payment or assignment or recruitment, create verification entry for admin
    short_nim = user['nim'][:4] + 'XXXX' if len(user['nim']) >= 4 else user['nim']
    label = f"{user['name']} · {short_nim}"
    doc_label = uploaded_filename or f"{item['k']}_{item_id}.pdf"

    c.execute('''
        INSERT INTO verifications (user_id, t, p, st, kind, item_id)
        VALUES (?, ?, ?, 'Menunggu', ?, ?)
    ''', (user['id'], label, doc_label, item['k'], item_id))

    # If it was kas iuran, update dues list
    if item['k'] == 'pay':
        c.execute('''
            UPDATE dues SET pill = 'Menunggu verifikasi', pc = 'wait', can_pay = 0
            WHERE user_id = ? AND t LIKE '%Oktober%'
        ''', (user['id'],))

    conn.commit()
    conn.close()
    return jsonify({'ok': True, 'item_id': item_id, 'file': uploaded_filename})

@app.route('/api/sync', methods=['POST'])
def api_sync():
    """Bulk save or sync state if frontend sends snapshot"""
    data = request.get_json() or {}
    user = get_current_user()
    conn = get_db()
    c = conn.cursor()

    if 'profile' in data and user:
        p = data['profile']
        c.execute('''
            UPDATE users SET name = ?, prodi = ?, angkatan = ?, photo = ?
            WHERE id = ?
        ''', (p.get('n', user['name']), p.get('prodi', user['prodi']), p.get('ang', user['angkatan']), p.get('photo', user['photo']), user['id']))

    if 'items' in data and isinstance(data['items'], list):
        # We can update or replace
        for item in data['items']:
            item_id = item.get('id')
            if item_id:
                c.execute('''
                    INSERT INTO items (id, k, t, s, e, p, d, amt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                    k = excluded.k, t = excluded.t, s = excluded.s, e = excluded.e,
                    p = excluded.p, d = excluded.d, amt = excluded.amt
                ''', (item_id, item.get('k'), item.get('t'), item.get('s'), item.get('e'), item.get('p'), item.get('d'), item.get('amt')))

    conn.commit()
    conn.close()
    return jsonify({'ok': True, 'msg': 'Data tersinkron'})

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    print(f"==================================================")
    print(f" SIT (Sistem Informasi Terintegrasi) Backend ")
    print(f" Server berjalan di: http://localhost:{port}")
    print(f" Akses Jaringan Lokal: http://0.0.0.0:{port}")
    print(f"==================================================")
    app.run(host='0.0.0.0', port=port, debug=True)

