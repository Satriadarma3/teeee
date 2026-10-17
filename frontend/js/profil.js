(() => {
  const { esc, BANK } = SIT;
  const $ = id => document.getElementById(id);
  const sheet = new bootstrap.Modal($('sheet'));
  const st = { tab: 'acara', sh: null };
  const C = { ok: 'pill-ok', wait: 'pill-wait', bad: 'pill-bad', info: 'pill-info' };

  const acara = [
    { tag: 'Akademik', tc: 'info', pill: 'Hadir', pc: 'ok', t: 'Cloud Workshop', sub: 'Okt 5 · Lab Fasilkom' },
    { tag: 'Lomba Non-Akademik', tc: 'wait', pill: 'Terdaftar', pc: 'info', t: 'Informatics Championship', sub: 'Okt 10 – 12 · Fasilkom Unsoed' },
    { tag: 'Rekrutmen', tc: 'recruit', pill: 'Panitia: menunggu', pc: 'wait', t: 'BEM Recruitment 2026', sub: 'Okt 16 · Student Center Unsoed' }
  ];
  const iconPending = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" class="me-1" style="vertical-align:-1px"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>';

  const tugas = [
    { id: 4, pill: 'Belum dikumpulkan', pc: 'bad', t: 'Web Dev Assignment', sub: 'Tenggat 28 Okt · E-Learning Portal', main: 'Unggah', act: () => open('up', 4) },
    { id: 91, pill: `${iconPending}Sedang dinilai`, pc: 'wait', t: 'Tugas Ospek Jurusan', sub: 'Tenggat 14 Okt · Dikumpulkan 13 Okt', main: 'Ganti file', act: () => open('up', 91) },
    { id: 92, pill: 'Dinilai', pc: 'info', t: 'Tugas Rekrutmen BEM', sub: 'Tenggat 12 Okt · Nilai 88/100', main: 'Lihat nilai', act: () => SIT.toast('Nilai: 88/100') }
  ].map(x => Object.assign({ tag: 'Tugas', tc: 'assign' }, x));

  const defaultDues = [
    { id: 5, t: 'Kas Agustus', s: 'Dibayar 5 Agu', a: 'Rp 50.000', pill: 'Lunas', pc: 'ok' },
    { id: 5, t: 'Kas September', s: 'Dibayar 9 Sep', a: 'Rp 50.000', pill: 'Menunggu verifikasi', pc: 'wait' },
    { id: 5, t: 'Kas Oktober', s: 'Jatuh tempo 31 Okt', a: 'Rp 50.000', pill: 'Belum lunas', pc: 'bad', pay: true }
  ];

  const getDues = () => {
    const list = SIT.get().dues;
    return (list && list.length) ? list : defaultDues;
  };

  const stats = [{ l: 'Acara diikuti', v: '2', c: '#1D4ED8' }, { l: 'Tugas', v: '1/3', c: '#92400E' }, { l: 'Iuran lunas', v: '1/3', c: '#166534' }];
  const tagCls = c => c === 'recruit' || c === 'assign' ? 'pill-' + c : C[c];

  const renderProfile = () => {
    const p = SIT.get().profile;
    const isAdmin = p && (p.role === 'admin' || p.nim === '12345678');
    $('avatar').innerHTML = p.photo ? `<img src="${p.photo}" alt="Foto profil" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : SIT.initials(p.n);
    $('pName').textContent = p.n;
    $('pMeta').textContent = `NIM ${p.nim} · ${p.prodi} · Angkatan ${p.ang}`;
    const rEl = $('pRole') || document.querySelector('.sit-card .pill-info');
    if (rEl) {
      rEl.textContent = isAdmin ? 'Admin' : 'Mahasiswa';
      rEl.className = isAdmin ? 'pill pill-recruit' : 'pill pill-info';
    }
    SIT.paintUser();
  };

  const renderStats = () => {
    $('statsSide').innerHTML = stats.map(s => `<div class="stat-row"><span>${s.l}</span><b style="color:${s.c}">${s.v}</b></div>`).join('');
    $('statsMini').innerHTML = stats.map(s => `<div class="col-4"><div class="sit-card stat-mini" style="border-radius:18px"><div class="l">${s.l}</div><div class="v" style="color:${s.c}">${s.v}</div></div></div>`).join('');
  };

  const renderSeg = () => {
    $('seg').innerHTML = [['acara', 'Acara'], ['tugas', 'Tugas']].map(([k, l]) => `<button class="${st.tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('');
  };

  const getTugasList = () => {
    const sentMap = SIT.get().sent || {};
    return tugas.map(t => {
      if (sentMap[t.id]) {
        return Object.assign({}, t, {
          pill: `${iconPending}Sedang dinilai`,
          pc: 'wait',
          main: 'Ganti file'
        });
      }
      return t;
    });
  };

  let actions = [];
  const renderItems = () => {
    const list = st.tab === 'acara' ? acara : getTugasList();
    actions = list;
    $('items').innerHTML = list.map((i, ix) => `<div class="col-12 col-md-6 col-xl-4"><div class="sit-card p-3 p-md-4 h-100">
      <div class="d-flex justify-content-between align-items-center gap-2"><span class="pill ${tagCls(i.tc)}">${i.tag}</span><span class="pill ${C[i.pc]}">${i.pill}</span></div>
      <div class="fw-bold fs-5 mt-3 mb-1">${i.t}</div><div class="small muted">${i.sub}</div>
      ${i.main ? `<div class="row g-2 mt-3"><div class="col-6"><button class="btn btn-sit-o w-100" data-dl>Unduh ToR</button></div><div class="col-6"><button class="btn btn-sit w-100" data-act="${ix}">${i.main}</button></div></div>` : ''}
    </div></div>`).join('');
  };

  const renderDues = () => {
    const dues = getDues();
    $('dues').innerHTML = dues.map(d => `<div class="due-row"><div><b>${d.t}</b><div class="small muted">${d.s}</div></div>
      <div class="d-flex align-items-center gap-3 flex-wrap justify-content-end"><b>${d.a}</b><span class="pill ${C[d.pc]}">${d.pill}</span>
      ${d.pay ? '<button class="btn btn-sit" data-pay>Bayar</button>' : ''}</div></div>`).join('');
  };

  /* ----- sheet / modal ----- */
  const T = {
    edit: ['Edit profil', 'Simpan perubahan', 'Profil diperbarui'],
    up:   ['Unggah tugas', 'Kumpulkan', 'Tugas terkumpul'],
    pay:  ['Bayar kas Oktober', 'Kirim bukti', 'Bukti pembayaran terkirim']
  };

  let currentTargetId = null;
  const open = (k, itemId = null) => {
    st.sh = k;
    currentTargetId = itemId;
    const p = SIT.get().profile;
    $('shTitle').textContent = T[k][0];
    $('shSave').textContent = T[k][1];
    $('shBody').innerHTML = k === 'edit'
      ? `<label class="form-label" for="e1">Nama lengkap</label><input id="e1" class="form-control" value="${esc(p.n)}">
         <label class="form-label" for="e2">Program studi</label><input id="e2" class="form-control" value="${esc(p.prodi)}">
         <label class="form-label" for="e3">Angkatan</label><input id="e3" class="form-control" inputmode="numeric" value="${esc(p.ang)}">`
      : k === 'up'
      ? `<label class="form-label" for="uf">Unggah file (PDF)</label><input id="uf" type="file" accept="application/pdf" class="form-control">`
      : `<div class="d-flex justify-content-between align-items-center mt-3"><b>Kas Himpunan</b><b style="color:#166534;font-size:20px">Rp 50.000</b></div>
         <p class="small muted my-2">Logistik seminar Rp 30.000 · Honor &amp; transport Rp 15.000 · Dokumentasi Rp 5.000</p>
         <div class="bank-box">${BANK.name}<br><b style="color:#1D4ED8">${BANK.no}</b><br>a.n. ${BANK.an}</div>
         <label class="form-label" for="uf">Bukti transfer (PDF)</label><input id="uf" type="file" accept="application/pdf" class="form-control">`;
    sheet.show();
  };

  $('shSave').addEventListener('click', async () => {
    const k = st.sh;
    if (k === 'edit') {
      const n = $('e1').value.trim(), pr = $('e2').value.trim(), a = $('e3').value.trim();
      if (!n) { $('e1').classList.add('is-invalid'); return SIT.toast('Nama wajib diisi'); }
      const prof = SIT.get().profile;
      Object.assign(prof, { n, prodi: pr || 'Informatika', ang: a || '2026' });
      SIT.save();
      if (window.location.protocol.startsWith('http')) {
        await SIT.api('/api/profile', { method: 'POST', body: JSON.stringify(prof) });
      }
      renderProfile();
    } else {
      if (!$('uf').files.length) { $('uf').classList.add('is-invalid'); return SIT.toast('Pilih file PDF terlebih dahulu'); }
      if (window.location.protocol.startsWith('http')) {
        const fd = new FormData();
        const itemId = currentTargetId || (k === 'pay' ? 5 : 4);
        fd.append('item_id', itemId);
        fd.append('file', $('uf').files[0]);
        await SIT.api('/api/submit', { method: 'POST', body: fd });
      }
      if (k === 'pay') {
        const d = getDues().find(x => x.t.includes('Oktober'));
        if (d) { d.pill = 'Menunggu verifikasi'; d.pc = 'wait'; d.pay = false; }
        renderDues();
      } else if (k === 'up') {
        const targetId = currentTargetId || 4;
        const d = SIT.get();
        d.sent[targetId] = 1;
        SIT.save();
        renderItems();
      }
    }
    sheet.hide();
    SIT.toast(T[k][2]);
  });

  /* ----- event ----- */
  $('ph').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 1.5e6) return SIT.toast('Foto maksimal 1,5 MB');

    // Online upload
    if (window.location.protocol.startsWith('http')) {
      const fd = new FormData();
      fd.append('file', f);
      const res = await SIT.api('/api/upload', { method: 'POST', body: fd });
      if (res && res.ok && res.url) {
        SIT.get().profile.photo = res.url;
        await SIT.api('/api/profile', {
          method: 'POST',
          body: JSON.stringify({ photo: res.url })
        });
        SIT.save();
        renderProfile();
        return SIT.toast('Foto profil berhasil diunggah dan disimpan!');
      }
    }

    // Fallback DataURL preview
    const r = new FileReader();
    r.onload = () => {
      SIT.get().profile.photo = r.result;
      SIT.save();
      renderProfile();
      SIT.toast('Foto profil diperbarui');
    };
    r.readAsDataURL(f);
  });

  $('btnEdit').addEventListener('click', () => open('edit'));

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-tab],[data-act],[data-dl],[data-pay]');
    if (!t) return;
    if (t.dataset.tab) { st.tab = t.dataset.tab; renderSeg(); renderItems(); }
    else if (t.dataset.act) actions[+t.dataset.act].act();
    else if ('dl' in t.dataset) SIT.toast('ToR diunduh');
    else if ('pay' in t.dataset) open('pay');
  });

  window.addEventListener('sit:sync', () => {
    renderProfile();
    renderStats();
    renderDues();
  });

  renderProfile();
  renderStats();
  renderSeg();
  renderItems();
  renderDues();
})();
