/* SIT – data, penyimpanan lokal, REST API, dan helper bersama */
const SIT = (() => {
  const KINDS = {
    event:   { label: 'Event',     cls: 'event',   btn: 'Ikuti acara',       done: 'Kamu terdaftar di acara ini' },
    recruit: { label: 'Rekrutmen', cls: 'recruit', btn: 'Kirim pendaftaran', done: 'Pendaftaran terkirim' },
    assign:  { label: 'Tugas',     cls: 'assign',  btn: 'Kumpulkan',         done: 'Tugas terkumpul' },
    pay:     { label: 'Iuran',     cls: 'pay',     btn: 'Kirim bukti',       done: 'Bukti pembayaran terkirim' }
  };
  const BANK = { name: 'Bank Mandiri', no: '137-000-8821-9921', an: 'BEM FASILKOM UNSOED' };
  const TODAY = 17; // simulasi: Sabtu, 17 Okt 2026
  const MONTH = { first: 3, days: 31, label: 'Oktober 2026' }; // 1 Okt 2026 = Kamis (indeks 3, Senin = 0)

  const DEFAULTS = {
    items: [
      { id: 1, k: 'event',   t: 'Cloud Workshop',          s: 5,  e: 5,  p: 'Lab Fasilkom',          d: 'AWS Cloud fundamentals and hands-on session.' },
      { id: 2, k: 'event',   t: 'Informatics Championship', s: 10, e: 12, p: 'Fasilkom Unsoed',       d: 'Annual sports and e-sports event.' },
      { id: 3, k: 'recruit', t: 'BEM Recruitment 2026',    s: 16, e: 16, p: 'Student Center Unsoed', d: 'Student Executive Board open recruitment for tech & PR division.' },
      { id: 5, k: 'pay',     t: 'Kas Himpunan',            s: 18, e: 31, p: 'Online Portal',         d: 'Monthly dues utilized for upcoming national seminar logistics.', amt: 'Rp 50.000' },
      { id: 4, k: 'assign',  t: 'Web Dev Assignment',      s: 28, e: 28, p: 'E-Learning Portal',     d: 'Final project web development submission deadline.' }
    ],
    verif: [
      { id: 1, t: 'J. Doe · 2210XXXX',     p: 'bukti_doe.pdf',    st: 'Menunggu' },
      { id: 2, t: 'A. Putri · 2210YYYY',   p: 'bukti_putri.pdf',  st: 'Terverifikasi' },
      { id: 3, t: 'R. Pratama · 2210ZZZZ', p: 'bukti_rafi.pdf',   st: 'Menunggu' }
    ],
    profile: { n: 'J. Doe', nim: '2210XXXXXX', prodi: 'Informatika', ang: '2026', photo: '', role: 'mahasiswa' },
    sent: {},
    dues: []
  };

  const KEY = 'sit.v1';
  let mem = null;

  const load = () => {
    if (mem) return mem;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        mem = Object.assign({}, DEFAULTS, JSON.parse(raw));
        return mem;
      }
    } catch (e) {}
    mem = JSON.parse(JSON.stringify(DEFAULTS));
    return mem;
  };

  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(mem));
    } catch (e) {}
    // Background sync to backend if online
    if (window.location.protocol.startsWith('http')) {
      try {
        fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-NIM': mem?.profile?.nim || ''
          },
          body: JSON.stringify({ profile: mem?.profile, items: mem?.items })
        }).catch(() => {});
      } catch (e) {}
    }
  };

  const get = () => load();
  const reset = () => {
    try { localStorage.removeItem(KEY); } catch (e) {}
    mem = null;
  };

  // Helper API fetcher
  const api = async (endpoint, opts = {}) => {
    if (!window.location.protocol.startsWith('http')) {
      return { ok: false, offline: true };
    }
    const currentNim = mem?.profile?.nim || '';
    const headers = Object.assign({}, opts.headers || {});
    if (currentNim && !headers['X-User-NIM']) {
      headers['X-User-NIM'] = currentNim;
    }
    if (!(opts.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    try {
      const res = await fetch(endpoint, Object.assign({}, opts, { headers }));
      const data = await res.json().catch(() => ({}));
      return Object.assign({ ok: res.ok, status: res.status }, data);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  // Initial Sync from backend
  const syncWithBackend = async () => {
    if (!window.location.protocol.startsWith('http')) return;
    try {
      const res = await api('/api/data');
      if (res && res.ok) {
        const local = load();
        if (res.profile) local.profile = Object.assign({}, local.profile, res.profile);
        if (Array.isArray(res.items) && res.items.length) local.items = res.items;
        if (Array.isArray(res.verif)) local.verif = res.verif;
        if (res.sent) local.sent = Object.assign({}, local.sent, res.sent);
        if (Array.isArray(res.dues) && res.dues.length) local.dues = res.dues;
        try { localStorage.setItem(KEY, JSON.stringify(local)); } catch (e) {}
        paintUser();
        window.dispatchEvent(new CustomEvent('sit:sync', { detail: local }));
      }
    } catch (e) {}
  };

  const dateLabel = a => 'Okt ' + a.s + (a.e > a.s ? ' – ' + a.e : '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = n => (n || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'JD';
  const shortNim = nim => (nim || '').slice(0, 4) + 'XXXX';

  let toastTimer;
  const toast = msg => {
    let el = document.getElementById('sitToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sitToast';
      el.className = 'sit-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  };

  // nama pengguna di navigasi (desktop & mobile)
  const paintUser = () => {
    const p = get().profile;
    const isAdmin = p && (p.role === 'admin' || p.nim === '12345678');
    document.querySelectorAll('[data-user-label]').forEach(el => el.textContent = p.n + ' · ' + shortNim(p.nim));
    document.querySelectorAll('[data-user-initials]').forEach(el => el.textContent = initials(p.n));
    document.querySelectorAll('a[href="admin.html"], a[href="/admin"], a[href="/admin.html"], a[href="admin"], .admin-only').forEach(el => {
      if (isAdmin) {
        el.style.removeProperty('display');
        el.classList.remove('d-none');
      } else {
        el.style.setProperty('display', 'none', 'important');
        el.classList.add('d-none');
      }
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    paintUser();
    syncWithBackend();
  });

  return { KINDS, BANK, TODAY, MONTH, get, save, reset, api, syncWithBackend, dateLabel, esc, initials, shortNim, toast, paintUser };
})();
