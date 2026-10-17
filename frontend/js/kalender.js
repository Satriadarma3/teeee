(() => {
  const { KINDS, BANK, TODAY, MONTH, esc, dateLabel } = SIT;
  const $ = id => document.getElementById(id);
  const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const st = { f: 'all', sel: null, v: 'week', ws: 12, open: null };
  const items = () => SIT.get().items.slice().sort((a, b) => a.s - b.s);
  const ok = a => st.f === 'all' || st.f === a.k;
  const sent = () => SIT.get().sent;
  const dayOf = n => DOW[(n + MONTH.first - 1) % 7];
  const modal = new bootstrap.Modal($('detailModal'));

  const paintUserInfo = () => {
    document.querySelectorAll('[data-user-name]').forEach(e => e.textContent = SIT.get().profile.n);
    document.querySelectorAll('[data-user-nim]').forEach(e => e.textContent = SIT.get().profile.nim);
  };
  paintUserInfo();

  /* ----- kalender desktop ----- */
  const renderDesk = () => {
    let h = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('');
    for (let i = 0; i < 35; i++) {
      const n = i - (MONTH.first - 1), valid = n >= 1 && n <= MONTH.days;
      let chips = '';
      if (valid) items().filter(a => n >= a.s && n <= a.e && ok(a)).forEach(a => {
        chips += `<button class="cal-chip k-${a.k}" data-open="${a.id}" title="${esc(a.t)}">${(n === a.s || i % 7 === 0) ? esc(a.t) : '&nbsp;'}</button>`;
      });
      h += `<div class="cal-cell${n === TODAY ? ' today' : ''}"><div class="n">${valid ? n : ''}</div>${chips}</div>`;
    }
    $('calDesk').innerHTML = h;
  };

  /* ----- kalender mobile ----- */
  const renderMob = () => {
    const week = st.v === 'week', N = week ? 7 : 35;
    $('mLabel').textContent = week ? `${Math.max(1, st.ws)} – ${Math.min(31, st.ws + 6)} Oktober 2026` : MONTH.label;
    $('mNav').classList.toggle('d-none', !week);
    document.querySelectorAll('#mViews .chip').forEach(b => b.classList.toggle('on', b.dataset.v === st.v));
    let h = DOW.map(d => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < N; i++) {
      const n = week ? st.ws + i : i - (MONTH.first - 1), valid = n >= 1 && n <= MONTH.days;
      const acts = valid ? items().filter(a => n >= a.s && n <= a.e && ok(a)) : [];
      const sel = st.sel === n;
      const dots = acts.map(a => `<i style="background:${sel ? '#fff' : `var(--k-${KINDS[a.k].cls}-fg)`}"></i>`).join('');
      h += `<button class="m-day${valid ? '' : ' empty'}${sel ? ' sel' : n === TODAY ? ' today' : ''}" data-day="${n}" aria-label="${valid ? n + ' Oktober' : ''}" ${valid ? '' : 'tabindex="-1"'}>${valid ? n : ''}<span class="dots">${dots}</span></button>`;
    }
    $('calMob').innerHTML = h;
  };

  /* ----- filter + agenda ----- */
  const renderFilters = () => {
    $('filters').innerHTML = [['all', 'Semua'], ['event', 'Event'], ['recruit', 'Rekrutmen'], ['assign', 'Tugas'], ['pay', 'Iuran']]
      .map(([k, l]) => `<button class="chip${st.f === k ? ' on' : ''}" data-f="${k}">${l}</button>`).join('');
  };
  const renderAgenda = () => {
    const mobile = matchMedia('(max-width:767.98px)').matches;
    const sel = mobile ? st.sel : null;
    const list = items().filter(a => ok(a) && (!sel || (sel >= a.s && sel <= a.e)));
    $('agTitle').textContent = sel ? `Agenda ${dayOf(sel)}, ${sel} Okt` : (mobile ? 'Semua agenda Oktober' : 'Aktivitas & Iuran');
    $('agClear').classList.toggle('d-none', !sel);
    $('agenda').innerHTML = list.length ? list.map(a => {
      const k = KINDS[a.k];
      return `<button class="agenda-item" data-open="${a.id}"><div class="d-flex gap-3">
        <span class="day-badge d-md-none k-${a.k}">${a.s}</span>
        <span class="flex-grow-1"><span class="pill pill-${k.cls} d-md-none">${k.label}</span>
        ${sent()[a.id] ? (a.k === 'assign' ? '<span class="pill pill-wait"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" class="me-1" style="vertical-align:-1px"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>Sedang dinilai</span>' : '<span class="pill pill-ok">Terkirim</span>') : ''}
        <span class="d-none d-md-block small muted">${dateLabel(a)}</span>
        <b class="d-block">${esc(a.t)}</b>
        <span class="small muted"><span class="d-md-none">${dateLabel(a)} · ${esc(a.p)}</span><span class="d-none d-md-inline">${esc(a.d)}</span></span></span></div></button>`;
    }).join('') : '<div class="soft-box text-center muted small">Tidak ada agenda pada filter ini.</div>';
  };
  const renderAll = () => { renderDesk(); renderMob(); renderFilters(); renderAgenda(); };

  /* ----- detail modal ----- */
  const openDetail = id => {
    const a = SIT.get().items.find(x => x.id === +id); if (!a) return;
    st.open = a; const k = KINDS[a.k];
    $('dmKind').className = 'pill pill-' + k.cls; $('dmKind').textContent = k.label;
    $('dmDate').textContent = dateLabel(a); $('dmTitle').textContent = a.t;
    $('dmPlace').textContent = 'Lokasi: ' + a.p; $('dmDesc').textContent = a.d;
    $('dmSubmit').textContent = k.btn;
    let f = '';
    if (a.k === 'recruit') f = `<div class="soft-box"><b>Formulir pendaftaran</b>
      <label class="form-label" for="dv">Divisi</label><select id="dv" class="form-select"><option>Technology &amp; Information</option><option>Public Relations</option></select>
      <label class="form-label" for="mo">Motivasi</label><textarea id="mo" class="form-control" style="min-height:90px" placeholder="Kenapa ingin bergabung?"></textarea></div>`;
    if (a.k === 'assign') f = `<div class="soft-box"><b>Kumpulkan tugas</b><label class="form-label" for="fl">Unggah file (PDF)</label>
      <input id="fl" type="file" accept="application/pdf" class="form-control"></div>`;
    if (a.k === 'pay') f = `<div class="soft-box"><div class="d-flex justify-content-between"><b>Pembayaran kas</b><b style="color:#166534;font-size:20px">${esc(a.amt || 'Rp 50.000')}</b></div>
      <p class="small muted my-2">Logistik seminar Rp 30.000 · Transport &amp; honor pembicara Rp 15.000 · Dokumentasi Rp 5.000</p>
      <div class="bank-box">${BANK.name}<br><b style="color:#1D4ED8">${BANK.no}</b><br>a.n. ${BANK.an}</div>
      <label class="form-label" for="fl">Bukti transfer (PDF)</label><input id="fl" type="file" accept="application/pdf" class="form-control"></div>`;
    $('dmForm').innerHTML = f;
    modal.show();
  };

  $('dmSubmit').addEventListener('click', async () => {
    const a = st.open; if (!a) return;
    if (a.k === 'recruit' && !$('mo').value.trim()) { $('mo').classList.add('is-invalid'); return SIT.toast('Motivasi wajib diisi'); }
    if ((a.k === 'assign' || a.k === 'pay') && !$('fl').files.length) { $('fl').classList.add('is-invalid'); return SIT.toast('Pilih file PDF terlebih dahulu'); }

    if (window.location.protocol.startsWith('http')) {
      const fd = new FormData();
      fd.append('item_id', a.id);
      if (a.k === 'recruit') {
        fd.append('divisi', $('dv').value);
        fd.append('motivasi', $('mo').value.trim());
      } else if (a.k === 'assign' || a.k === 'pay') {
        fd.append('file', $('fl').files[0]);
      }
      await SIT.api('/api/submit', { method: 'POST', body: fd });
    }

    const d = SIT.get();
    d.sent[a.id] = 1;
    SIT.save();
    modal.hide();
    SIT.toast(KINDS[a.k].done);
    renderAgenda();
  });

  /* ----- event ----- */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open],[data-f],[data-day],[data-v]'); if (!t) return;
    if (t.dataset.open) openDetail(t.dataset.open);
    else if (t.dataset.f) { st.f = t.dataset.f; renderAll(); }
    else if (t.dataset.day) { const n = +t.dataset.day; if (n >= 1 && n <= 31) { st.sel = st.sel === n ? null : n; renderMob(); renderAgenda(); } }
    else if (t.dataset.v) { st.v = t.dataset.v; renderMob(); }
  });
  $('mPrev').addEventListener('click', () => { st.ws = Math.max(-2, st.ws - 7); renderMob(); });
  $('mNext').addEventListener('click', () => { st.ws = Math.min(26, st.ws + 7); renderMob(); });
  $('agClear').addEventListener('click', () => { st.sel = null; renderMob(); renderAgenda(); });
  matchMedia('(max-width:767.98px)').addEventListener('change', renderAgenda);

  window.addEventListener('sit:sync', () => {
    paintUserInfo();
    renderAll();
  });

  renderAll();
})();
