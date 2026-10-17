(() => {
  let reg = false;
  const $ = id => document.getElementById(id);
  const form = $('authForm');
  const alertEl = $('loginAlert');

  const showAlert = (msg, isWarning = true, showRegisterLink = false) => {
    if (!alertEl) return;
    alertEl.className = `alert ${isWarning ? 'alert-warning' : 'alert-danger'} py-2 px-3 mt-3 mb-0 small`;
    if (showRegisterLink) {
      alertEl.innerHTML = `${SIT.esc(msg)} <a href="#" id="linkToReg" class="alert-link fw-bold ms-1">Daftar sekarang</a>`;
      const link = $('linkToReg');
      if (link) {
        link.addEventListener('click', e => {
          e.preventDefault();
          if (!reg) {
            reg = true;
            render();
          }
        });
      }
    } else {
      alertEl.textContent = msg;
    }
    alertEl.classList.remove('d-none');
  };

  const hideAlert = () => {
    if (alertEl) {
      alertEl.classList.add('d-none');
      alertEl.innerHTML = '';
    }
  };

  const render = () => {
    hideAlert();
    $('heading').textContent = reg ? 'Buat akun baru' : 'Masuk ke SIT';
    $('cta').textContent = reg ? 'Daftar' : 'Masuk';
    $('ask').textContent = reg ? 'Sudah punya akun?' : 'Belum punya akun?';
    $('swap').textContent = reg ? 'Masuk' : 'Register';
    document.querySelectorAll('.reg-only').forEach(el => el.classList.toggle('d-none', !reg));
    form.classList.remove('was-validated');
    ['nim', 'pw', 'pw2'].forEach(i => $(i).setCustomValidity(''));
  };

  $('swap').addEventListener('click', () => { reg = !reg; render(); });

  ['nim', 'pw', 'n', 'pw2'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', () => hideAlert());
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    hideAlert();
    const nim = $('nim').value.trim(), pw = $('pw').value;
    $('nim').setCustomValidity(/^\d{4}[0-9A-Za-z]{2,10}$/.test(nim) ? '' : 'NIM tidak valid');
    $('pw').setCustomValidity(pw.length >= 8 ? '' : 'Minimal 8 karakter');
    $('n').required = reg; $('pw2').required = reg;
    $('pw2').setCustomValidity(reg && $('pw2').value !== pw ? 'Tidak sama' : '');
    form.classList.add('was-validated');
    if (!form.checkValidity()) return;

    const d = SIT.get();
    const nameVal = $('n').value.trim() || d.profile.n || nim;

    if (window.location.protocol.startsWith('http')) {
      const endpoint = reg ? '/api/auth/register' : '/api/auth/login';
      const payload = { nim, pw, name: nameVal };
      const res = await SIT.api(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        if (!reg && (res.not_registered || res.status === 404)) {
          const msg = res.msg || 'Akun tidak terdaftar di database. Silakan daftar akun terlebih dahulu.';
          showAlert(msg, true, true);
          SIT.toast(msg);
        } else {
          const msg = res.msg || (reg ? 'Gagal mendaftar.' : 'Gagal masuk. Periksa NIM dan password.');
          showAlert(msg, false, false);
          SIT.toast(msg);
        }
        return;
      }
      if (res.profile) {
        d.profile = Object.assign({}, d.profile, res.profile);
      }
    } else {
      // Offline fallback
      if (reg) {
        if ($('n').value.trim()) d.profile.n = $('n').value.trim();
        d.profile.nim = nim;
        d.profile.role = nim === '12345678' ? 'admin' : 'mahasiswa';
      } else {
        if (d.profile.nim && d.profile.nim !== nim) {
          const msg = 'Akun belum terdaftar di database. Silakan daftar akun terlebih dahulu.';
          showAlert(msg, true, true);
          return SIT.toast(msg);
        }
        d.profile.nim = nim;
        if (nim === '12345678') d.profile.role = 'admin';
      }
    }

    SIT.save();
    location.href = 'kalender.html';
  });
  render();
})();
