/* ============================================
   EventPulse — Auth Page Logic (auth.js)
   Handles: Login, Register, Tab switching,
            Password strength, JWT storage
   ============================================ */

(function () {
  'use strict';

  /* ── Token helpers ── */
  const AUTH_KEY = 'ep_token';
  const USER_KEY = 'ep_user';

  function saveAuth(token, user) {
    localStorage.setItem(AUTH_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearAuth() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getToken()   { return localStorage.getItem(AUTH_KEY); }
  function getUser()    {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  }

  /* ── If already logged in, redirect home ── */
  if (getToken() && getUser()) {
    window.location.replace('index.html');
    return;
  }

  /* ── DOM refs ── */
  const tabLogin    = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const tabInd      = document.getElementById('tab-indicator');
  const panelLogin  = document.getElementById('panel-login');
  const panelReg    = document.getElementById('panel-register');
  const panelForgot = document.getElementById('panel-forgot');
  const loginForm   = document.getElementById('login-form');
  const regForm     = document.getElementById('register-form');
  const forgotForm  = document.getElementById('forgot-form');
  const loginErr    = document.getElementById('login-error');
  const regErr      = document.getElementById('register-error');
  const forgotErr   = document.getElementById('forgot-error');
  const successDiv  = document.getElementById('auth-success');
  const forgotSuccessMsg = document.getElementById('forgot-success-msg');

  /* ── Tab switching ── */
  function switchTab(tab) {
    const tabsContainer = document.querySelector('.auth-tabs');
    if (tab === 'forgot') {
      tabsContainer.style.display = 'none';
      panelLogin.classList.remove('active');
      panelReg.classList.remove('active');
      panelForgot.classList.add('active');
      hideError(forgotErr);
      if (forgotSuccessMsg) forgotSuccessMsg.style.display = 'none';
    } else {
      tabsContainer.style.display = 'flex';
      panelForgot.classList.remove('active');
      if (tab === 'login') {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        tabInd.classList.remove('right');
        panelLogin.classList.add('active');
        panelReg.classList.remove('active');
      } else {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        tabInd.classList.add('right');
        panelReg.classList.add('active');
        panelLogin.classList.remove('active');
      }
    }
    // Clear errors on tab switch
    hideError(loginErr);
    hideError(regErr);
  }

  tabLogin.addEventListener('click', () => switchTab('login'));
  tabRegister.addEventListener('click', () => switchTab('register'));

  // Switch links inside forms
  document.querySelectorAll('.auth-switch-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(btn.dataset.switch);
    });
  });

  /* ── Password toggle ── */
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.style.color = input.type === 'text' ? '#818cf8' : '';
    });
  });

  /* ── Password strength meter ── */
  const regPassword = document.getElementById('reg-password');
  const strengthDiv = document.getElementById('password-strength');
  const strengthFill  = document.getElementById('strength-fill');
  const strengthLabel = document.getElementById('strength-label');

  if (regPassword) {
    regPassword.addEventListener('input', () => {
      const val = regPassword.value;
      if (!val) {
        strengthDiv.style.display = 'none';
        return;
      }
      strengthDiv.style.display = 'flex';

      let score = 0;
      if (val.length >= 6)  score++;
      if (val.length >= 10) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      strengthFill.className  = 'strength-fill';
      strengthLabel.className = 'strength-label';

      if (score <= 2) {
        strengthFill.classList.add('weak');
        strengthLabel.classList.add('weak');
        strengthLabel.textContent = 'Weak';
      } else if (score <= 3) {
        strengthFill.classList.add('medium');
        strengthLabel.classList.add('medium');
        strengthLabel.textContent = 'Fair';
      } else {
        strengthFill.classList.add('strong');
        strengthLabel.classList.add('strong');
        strengthLabel.textContent = 'Strong';
      }
    });
  }

  /* ── Error helpers ── */
  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'flex';
  }

  function hideError(el) {
    if (!el) return;
    el.style.display = 'none';
    el.textContent = '';
  }

  /* ── Button loading state ── */
  function setLoading(btn, loading) {
    const textEl = btn.querySelector('.auth-btn-text');
    btn.disabled = loading;
    if (loading) {
      btn.dataset.originalText = textEl ? textEl.textContent : btn.textContent;
      if (textEl) textEl.textContent = 'Please wait…';
      btn.style.opacity = '0.8';
    } else {
      if (textEl && btn.dataset.originalText) textEl.textContent = btn.dataset.originalText;
      btn.style.opacity = '';
    }
  }

  /* ── Show Success ── */
  function showSuccess(title, desc) {
    // Hide forms
    panelLogin.classList.remove('active');
    panelReg.classList.remove('active');
    document.querySelector('.auth-tabs').style.display = 'none';

    // Show success
    successDiv.style.display = 'block';
    document.getElementById('success-title').textContent = title;
    document.getElementById('success-desc').textContent = desc;

    // Redirect after progress bar completes
    setTimeout(() => { window.location.replace('index.html'); }, 2400);
  }

  /* ── LOGIN ── */
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError(loginErr);

      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btn      = document.getElementById('login-submit');

      // Client-side validation
      if (!email)    { showError(loginErr, 'Please enter your email address.'); return; }
      if (!password) { showError(loginErr, 'Please enter your password.'); return; }

      setLoading(btn, true);

      try {
        const res  = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          saveAuth(data.token, data.user);
          showSuccess(`Welcome back, ${data.user.name}!`, 'Taking you to the home page…');
        } else {
          showError(loginErr, data.message || (data.errors ? data.errors.join('. ') : 'Login failed. Please try again.'));
        }
      } catch (err) {
        showError(loginErr, 'Cannot connect to server. Make sure the backend is running.');
        console.error(err);
      } finally {
        setLoading(btn, false);
      }
    });
  }

  /* ── REGISTER ── */
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError(regErr);

      const name     = document.getElementById('reg-name').value.trim();
      const email    = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirm  = document.getElementById('reg-confirm').value;
      const btn      = document.getElementById('register-submit');

      // Client-side validation
      if (!name)     { showError(regErr, 'Please enter your full name.'); return; }
      if (!email)    { showError(regErr, 'Please enter your email address.'); return; }
      if (!password) { showError(regErr, 'Please enter a password.'); return; }
      if (password.length < 6) { showError(regErr, 'Password must be at least 6 characters.'); return; }
      if (password !== confirm) { showError(regErr, 'Passwords do not match.'); return; }

      setLoading(btn, true);

      try {
        const res  = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          saveAuth(data.token, data.user);
          showSuccess('Account created!', 'Welcome to EventPulse. Taking you home…');
        } else {
          showError(regErr, data.message || (data.errors ? data.errors.join('. ') : 'Registration failed.'));
        }
      } catch (err) {
        showError(regErr, 'Cannot connect to server. Make sure the backend is running.');
        console.error(err);
      } finally {
        setLoading(btn, false);
      }
    });
  }

  /* ── FORGOT PASSWORD ── */
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError(forgotErr);
      if (forgotSuccessMsg) forgotSuccessMsg.style.display = 'none';

      const email = document.getElementById('forgot-email').value.trim();
      const btn   = document.getElementById('forgot-submit');

      if (!email) { showError(forgotErr, 'Please enter your email address.'); return; }

      setLoading(btn, true);

      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          if (forgotSuccessMsg) {
            forgotSuccessMsg.textContent = data.message || 'If that email exists, a reset link was sent.';
            forgotSuccessMsg.style.display = 'block';
          }
          document.getElementById('forgot-email').value = '';
        } else {
          showError(forgotErr, data.message || 'Request failed. Please try again.');
        }
      } catch (err) {
        showError(forgotErr, 'Cannot connect to server. Make sure the backend is running.');
        console.error(err);
      } finally {
        setLoading(btn, false);
      }
    });
  }

  /* ── Load live stats on left panel ── */
  async function loadAuthStats() {
    try {
      const res  = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        const s = data.stats;
        const tf = document.getElementById('auth-total-feedback');
        const tu = document.getElementById('auth-total-users');
        const ar = document.getElementById('auth-avg-rating');
        if (tf) tf.textContent = s.totalFeedback;
        if (tu) tu.textContent = s.totalUsers;
        if (ar) ar.textContent = s.avgRating > 0 ? s.avgRating + '★' : '—';
      }
    } catch (_) {}
  }

  loadAuthStats();

})();
