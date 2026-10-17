(() => {
  const curUser = SIT.get().profile;
  const isAdmin = curUser && (curUser.role === 'admin' || curUser.nim === '12345678');
  if (!isAdmin) {
    location.replace('kalender.html');
    return;
  }

  const { esc } = SIT;
  const $ = id => document.getElementById(id);
  const modal = new bootstrap.Modal($('formModal'));
  const TABS = { vf: ['Verifikasi', ''], pay: ['Iuran', 'Buat iuran baru'], event: ['Event', 'Tambah event'], recruit: ['Rekrutmen', 'Tambah rekrutmen'], assign: ['Tugas', 'Tambah tugas'] };
  const HEAD = { vf: ['Mahasiswa', 'Bukti (PDF)', 'Status'], pay: ['Judul', 'Tanggal', 'Lokasi'], event: ['Judul', 'Tanggal', 'Lokasi'], recruit: ['Judul', 'Tanggal', 'Lokasi'], assign: ['Judul', 'Tenggat', 'Lokasi'] };
  const st = { tab: 'vf', editId: null };
  const D = () => SIT.get();
  const pillOf = s => s === 'Menunggu' ? 'pill-wait' : s === 'Ditolak' ? 'pill-bad' : 'pill-ok';
  const rowsOf = () => st.tab === 'vf' ? D().verif : D().items.filter(i => i.k === st.tab);
  const when = it => 'Okt ' + it.s + (it.e && it.e !== it.s ? ' – ' + it.e : '');

  const setStatus = async (id, s) => {
    const item = D().verif.find(v => v.id === id);
    if (item) item.st = s;
    SIT.save();
    if (window.location.protocol.startsWith('http')) {
      await SIT.api(`/api/verif/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: s })
      });
    }
    SIT.toast('Status: ' + s);
    render();
  };

  const actions = it => {
    if (st.tab === 'vf') {
      const pend = it.st === 'Menunggu';
      return [{ l: pend ? 'Terima' : 'Batalkan', f: () => setStatus(it.id, pend ? 'Terverifikasi' : 'Menunggu') }]
        .concat(pend ? [{ l: 'Tolak', f: () => setStatus(it.id, 'Ditolak'), danger: true }] : []);
    }
    return [
      { l: 'Edit', f: () => openForm(it) },
      {
        l: 'Hapus',
        danger: true,
        f: async () => {
          if (!confirm('Hapus "' + it.t + '"?')) return;
          const d = D();
          d.items = d.items.filter(z => z.id !== it.id);
          SIT.save();
          if (window.location.protocol.startsWith('http')) {
            await SIT.api(`/api/items/${it.id}`, { method: 'DELETE' });
          }
          SIT.toast('Item dihapus');
          render();
        }
      }
    ];
  };

  let handlers = [];
  const fileLink = p => {
    if (!p) return '-';
    if (window.location.protocol.startsWith('http')) {
      return `<a href="/uploads/${esc(p)}" target="_blank" rel="noopener" style="color:#1D4ED8;text-decoration:underline">${esc(p)}</a>`;
    }
    return esc(p);
  };

  const render = () => {
    const rows = rowsOf();
    handlers = [];
    $('tabs').innerHTML = Object.keys(TABS).map(k => `<button class="chip${st.tab === k ? ' on' : ''}" data-tab="${k}">${TABS[k][0]}</button>`).join('');
    $('btnAdd').textContent = TABS[st.tab][1];
    $('btnAdd').classList.toggle('d-none', st.tab === 'vf');
    $('empty').classList.toggle('d-none', rows.length > 0);
    $('tableWrap').classList.toggle('invisible', !rows.length);
    $('thead').innerHTML = HEAD[st.tab].map(h => `<th>${h}</th>`).join('') + '<th class="act" style="width:240px;padding-right:10px">Aksi</th>';
    const btns = it => actions(it).map(a => {
      handlers.push(a.f);
      return `<button class="btn btn-sit-o${a.danger ? ' danger' : ''}" data-h="${handlers.length - 1}">${a.l}</button>`;
    });

    $('tbody').innerHTML = rows.map(it => {
      const b = btns(it);
      const col2 = st.tab === 'vf' ? fileLink(it.p) : when(it);
      const c3 = st.tab === 'vf' ? `<span class="pill ${pillOf(it.st)}">${it.st}</span>` : `<span class="pill" style="background:#F4F9FF;color:#33507A">${esc(it.p)}</span>`;
      return `<tr><td>${esc(it.t)}</td><td>${col2}</td><td>${c3}</td><td class="act">${b.join(' ')}</td></tr>`;
    }).join('');

    $('cards').innerHTML = rows.map(it => {
      const b = btns(it);
      const sub = st.tab === 'vf' ? fileLink(it.p) : when(it) + ' · ' + esc(it.p) + (it.amt ? ' · ' + esc(it.amt) : '');
      return `<div class="sit-card p-3 mb-2" style="border-radius:18px"><div class="d-flex justify-content-between align-items-start gap-2"><b>${esc(it.t)}</b>
        ${st.tab === 'vf' ? `<span class="pill ${pillOf(it.st)}">${it.st}</span>` : ''}</div><div class="small muted mt-1 mb-3">${sub}</div>
        <div class="row g-2">${b.map(x => `<div class="col">${x.replace('class="btn', 'class="w-100 btn')}</div>`).join('')}</div></div>`;
    }).join('');
  };

  /* ----- form tambah / edit ----- */
  const openForm = it => {
    st.editId = it ? it.id : null;
    $('fmHead').textContent = it ? 'Edit ' + TABS[st.tab][0] : TABS[st.tab][1];
    ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].forEach(i => $(i).classList.remove('is-invalid'));
    $('a1').value = it ? it.t : '';
    $('a2').value = it ? it.s : '';
    $('a3').value = it ? it.e : '';
    $('a4').value = it ? it.p : '';
    $('a5').value = it ? it.d : '';
    $('amtWrap').classList.toggle('d-none', st.tab !== 'pay');
    $('a6').value = it && it.amt ? it.amt : 'Rp 50.000';
    modal.show();
  };

  $('btnAdd').addEventListener('click', () => openForm(null));

  $('fmSave').addEventListener('click', async () => {
    const t = $('a1').value.trim(), s = parseInt($('a2').value, 10), e = parseInt($('a3').value || $('a2').value, 10);
    let bad = false;
    if (!t) { $('a1').classList.add('is-invalid'); bad = true; }
    if (!(s >= 1 && s <= 31)) { $('a2').classList.add('is-invalid'); bad = true; }
    if (!(e >= s && e <= 31)) { $('a3').classList.add('is-invalid'); bad = true; }
    if (bad) return SIT.toast(!t ? 'Judul wajib diisi' : 'Tanggal harus 1–31 dan selesai ≥ mulai');

    const rec = { k: st.tab, t, s, e, p: $('a4').value.trim(), d: $('a5').value.trim() };
    if (st.tab === 'pay') rec.amt = $('a6').value.trim();

    const d = D();
    if (st.editId) {
      d.items = d.items.map(z => z.id === st.editId ? Object.assign({}, z, rec) : z);
      if (window.location.protocol.startsWith('http')) {
        await SIT.api(`/api/items/${st.editId}`, { method: 'PUT', body: JSON.stringify(rec) });
      }
    } else {
      let newId = Date.now();
      if (window.location.protocol.startsWith('http')) {
        const res = await SIT.api('/api/items', { method: 'POST', body: JSON.stringify(rec) });
        if (res && res.id) newId = res.id;
      }
      d.items.push(Object.assign({ id: newId }, rec));
    }

    SIT.save();
    modal.hide();
    SIT.toast('Tersimpan');
    render();
  });

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-tab],[data-h]');
    if (!t) return;
    if (t.dataset.tab) {
      st.tab = t.dataset.tab;
      render();
    } else {
      handlers[+t.dataset.h]();
    }
  });

  window.addEventListener('sit:sync', render);
  render();
})();
