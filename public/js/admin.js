/* ============================================================
   EventPulse — Admin Dashboard JS (Premium Overhaul)
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── DOM References ── */
  const accessDeniedEl   = document.getElementById('access-denied');
  const adminLoadingEl   = document.getElementById('admin-loading');
  const adminContainerEl = document.getElementById('admin-container');

  const token = localStorage.getItem('ep_token');
  const user  = JSON.parse(localStorage.getItem('ep_user') || '{}');

  /* ── Quick client-side guard ── */
  if (!token || !user?.isAdmin) {
    adminLoadingEl.style.display = 'none';
    accessDeniedEl.style.display = 'flex';
    return;
  }

  /* ── Server-side admin verification ── */
  try {
    const meRes  = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
    const meData = await meRes.json();
    if (!meRes.ok || !meData.success || !meData.user.isAdmin) {
      adminLoadingEl.style.display = 'none';
      accessDeniedEl.style.display = 'flex';
      return;
    }
    document.getElementById('admin-welcome-msg').textContent =
      `Logged in as ${meData.user.name} · ${meData.user.email}`;
  } catch (err) {
    console.error('Admin verify failed:', err);
    adminLoadingEl.style.display = 'none';
    accessDeniedEl.style.display = 'flex';
    return;
  }

  /* ── Show panel ── */
  adminLoadingEl.style.display  = 'none';
  adminContainerEl.style.display = 'block';

  /* ── State ── */
  let _usersList    = [];
  let _feedbackList = [];
  let _chartDoughnut = null;
  let _chartBar      = null;

  /* Users pagination */
  let _uPage     = 1;
  const _uPer    = 10;

  /* Feedback pagination */
  let _fPage     = 1;
  const _fPer    = 10;

  /* ============================================================
     HELPERS (declared first to avoid temporal dead zone)
  ============================================================ */
  const EVENT_MAP = {
    'tech-summit':            'Tech Innovation Summit 2026',
    'music-fest':             'Neon Nights Music Festival',
    'ux-masterclass':         'UX Design Masterclass',
    'startup-arena':          'Startup Pitch Arena',
    'art-exhibition':         'Modern Art Exhibition',
    'marathon':               'City Marathon Challenge',
    'food-wine':              'Global Food & Wine Festival',
    'ai-robotics':            'AI & Robotics Expo',
    'climate-summit':         'Climate Action Summit',
    'blockchain-conf':        'Blockchain & Web3 Conference',
    'wellness-retreat':       'Corporate Wellness Retreat',
    'photography-workshop':   'Photography Masterclass'
  };

  function translateEventName(slug) {
    return EVENT_MAP[slug] || slug;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }

  function buildStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const duration = 600;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * ease);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function stringToColor(str) {
    const PALETTE = [
      '#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981',
      '#f59e0b','#ef4444','#3b82f6','#84cc16','#f97316'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return PALETTE[Math.abs(hash) % PALETTE.length];
  }

  /* ── Init ── */
  initTabs();
  initConfirmModal();
  initRefreshBtn();
  await loadAll();

  /* ============================================================
     LOAD ALL DATA
  ============================================================ */
  async function loadAll() {
    await Promise.all([
      loadOverview(),
      loadUsers(),
      loadFeedback()
    ]);
  }

  /* ============================================================
     TAB SWITCHING
  ============================================================ */
  function initTabs() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
      });
    });
  }

  /* ============================================================
     REFRESH BUTTON
  ============================================================ */
  function initRefreshBtn() {
    const btn = document.getElementById('admin-refresh-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="animation:spin .6s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Refreshing…`;
      await loadAll();
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Refresh`;
      showToast('Dashboard refreshed!', 'success');
    });
  }

  /* ============================================================
     OVERVIEW TAB
  ============================================================ */
  async function loadOverview() {
    try {
      const res  = await fetch('/api/admin/overview', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) return;

      const over = data.overview;

      /* Stat cards */
      animateNumber('admin-val-users',    over.totalUsers);
      animateNumber('admin-val-verified', over.verifiedUsers ?? over.totalUsers);
      animateNumber('admin-val-feedback', over.totalFeedback);
      document.getElementById('admin-val-avg-rating').textContent =
        over.avgRating ? `${parseFloat(over.avgRating).toFixed(1)} ★` : '—';
      document.getElementById('admin-val-top-event').textContent =
        over.topEvents?.length ? translateEventName(over.topEvents[0].event) : 'None yet';

      /* Top events sidebar */
      buildTopEventsList(over.topEvents || []);

      /* Charts */
      buildOverviewCharts(over.topEvents || []);

    } catch (err) {
      console.error('Overview load failed:', err);
    }
  }

  function buildTopEventsList(events) {
    const listEl = document.getElementById('top-events-list');
    if (!events.length) {
      listEl.innerHTML = '<div class="admin-table-empty">No feedback data yet.</div>';
      return;
    }

    const max = events[0].count;
    const medalClass = (i) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const medalLabel = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

    listEl.innerHTML = events.slice(0, 8).map((item, i) => `
      <div class="event-stat-item">
        <div class="event-stat-rank ${medalClass(i)}">${medalLabel(i)}</div>
        <div class="event-stat-bar-wrap">
          <span class="event-stat-name">${escapeHtml(translateEventName(item.event))}</span>
          <div class="event-stat-bar-track">
            <div class="event-stat-bar-fill" style="width:${Math.round((item.count / max) * 100)}%"></div>
          </div>
        </div>
        <div class="event-stat-meta">
          <span class="event-stat-count">${item.count} review${item.count !== 1 ? 's' : ''}</span>
          <span class="event-stat-rating">${parseFloat(item.avg.toFixed(1))} ★</span>
        </div>
      </div>
    `).join('');

    /* Show total-reviews badge */
    const totalBadge = document.getElementById('overview-chart-total-badge');
    if (totalBadge) {
      const total = events.reduce((s, e) => s + e.count, 0);
      totalBadge.textContent = `${total} reviews`;
    }
  }

  function buildOverviewCharts(events) {
    const isLight  = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLight ? '#475569' : '#94a3b8';
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

    const COLORS = [
      'rgba(99,102,241,0.75)', 'rgba(139,92,246,0.75)', 'rgba(244,114,182,0.75)',
      'rgba(6,182,212,0.75)',  'rgba(251,146,60,0.75)',  'rgba(34,197,94,0.75)',
      'rgba(251,191,36,0.75)', 'rgba(248,113,113,0.75)'
    ];

    const labels = events.map(e => translateEventName(e.event));
    const counts = events.map(e => e.count);
    const avgs   = events.map(e => parseFloat(e.avg.toFixed(2)));

    /* Doughnut Chart */
    const ctx1 = document.getElementById('adminOverviewChart').getContext('2d');
    if (_chartDoughnut) _chartDoughnut.destroy();
    _chartDoughnut = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: counts,
          backgroundColor: COLORS,
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: textColor, font: { size: 10, family: 'Inter' }, boxWidth: 12, padding: 14 }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} reviews`
            }
          }
        }
      }
    });

    /* Bar Chart — Avg Rating */
    const ctx2 = document.getElementById('adminRatingChart').getContext('2d');
    if (_chartBar) _chartBar.destroy();
    _chartBar = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Avg Rating',
          data: avgs,
          backgroundColor: COLORS,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` Rating: ${ctx.parsed.x} / 5`
            }
          }
        },
        scales: {
          x: {
            min: 0, max: 5,
            ticks: { color: textColor, font: { size: 10 }, stepSize: 1 },
            grid: { color: gridColor }
          },
          y: {
            ticks: {
              color: textColor, font: { size: 10 },
              callback: (val, idx) => {
                const lbl = labels[idx] || '';
                return lbl.length > 16 ? lbl.slice(0, 16) + '…' : lbl;
              }
            },
            grid: { display: false }
          }
        }
      }
    });

    /* React to theme toggle */
    const observer = new MutationObserver(() => {
      const light  = document.documentElement.getAttribute('data-theme') === 'light';
      const tc     = light ? '#475569' : '#94a3b8';
      const gc     = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
      if (_chartDoughnut) {
        _chartDoughnut.options.plugins.legend.labels.color = tc;
        _chartDoughnut.update();
      }
      if (_chartBar) {
        _chartBar.options.scales.x.ticks.color = tc;
        _chartBar.options.scales.y.ticks.color = tc;
        _chartBar.options.scales.x.grid.color  = gc;
        _chartBar.update();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ============================================================
     USERS TAB
  ============================================================ */
  async function loadUsers() {
    try {
      const res  = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) return;

      _usersList = data.users;
      document.getElementById('user-count-lbl').textContent = _usersList.length;
      _uPage = 1;
      applyUsersFilter();
    } catch (err) {
      console.error('Load users failed:', err);
    }
  }

  function applyUsersFilter() {
    const q      = (document.getElementById('admin-users-search')?.value || '').trim().toLowerCase();
    const role   = document.getElementById('admin-users-filter')?.value || 'all';

    let filtered = _usersList.filter(u => {
      const matchRole = role === 'all'
        ? true
        : role === 'admin' ? u.isAdmin : !u.isAdmin;
      const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matchRole && matchQ;
    });

    document.getElementById('user-count-lbl').textContent = filtered.length;
    renderUsersPage(filtered);
  }

  function renderUsersPage(list) {
    const totalPages = Math.ceil(list.length / _uPer);
    const page       = Math.min(_uPage, totalPages || 1);
    _uPage           = page;
    const slice      = list.slice((page - 1) * _uPer, page * _uPer);

    const tbody = document.getElementById('admin-users-tbody');

    if (!slice.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="admin-table-empty">No users found.</td></tr>`;
      document.getElementById('users-pagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = slice.map(u => {
      const joined  = new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const isSelf  = u.id === user.id;
      const avatarBg = stringToColor(u.name);
      const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

      return `
        <tr>
          <td><strong style="color:var(--text-muted);font-size:0.78rem;">#${u.id}</strong></td>
          <td>
            <div class="admin-user-cell">
              <div class="admin-avatar" style="background:${avatarBg};">${initials}</div>
              <span class="admin-user-name">${escapeHtml(u.name)}</span>
            </div>
          </td>
          <td style="color:var(--text-secondary);font-size:0.82rem;">${escapeHtml(u.email)}</td>
          <td><span class="role-badge ${u.isAdmin ? 'admin' : 'user'}">${u.isAdmin ? '⚡ Admin' : '👤 User'}</span></td>
          <td>
            <span class="verify-badge ${u.isVerified ? 'yes' : 'no'}">
              ${u.isVerified ? '✓ Verified' : '✕ Unverified'}
            </span>
          </td>
          <td style="color:var(--text-muted);font-size:0.8rem;">${joined}</td>
          <td>
            <div class="admin-actions">
              ${u.isAdmin
                ? `<button class="admin-btn admin-btn-demote" data-id="${u.id}" ${isSelf ? 'disabled title="Cannot demote yourself"' : ''}>↓ Demote</button>`
                : `<button class="admin-btn admin-btn-promote" data-id="${u.id}">↑ Promote</button>`
              }
              <button class="admin-btn admin-btn-delete" data-id="${u.id}" ${isSelf ? 'disabled title="Cannot delete yourself"' : ''}>✕ Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    /* Bind events */
    tbody.querySelectorAll('.admin-btn-promote').forEach(btn =>
      btn.addEventListener('click', () => confirmAction('promote', parseInt(btn.dataset.id)))
    );
    tbody.querySelectorAll('.admin-btn-demote').forEach(btn =>
      btn.addEventListener('click', () => confirmAction('demote', parseInt(btn.dataset.id)))
    );
    tbody.querySelectorAll('.admin-btn-delete').forEach(btn =>
      btn.addEventListener('click', () => confirmAction('deleteUser', parseInt(btn.dataset.id)))
    );

    renderPagination('users-pagination', page, totalPages, (p) => {
      _uPage = p;
      renderUsersPage(list);
    });
  }

  /* Init user search/filter */
  document.getElementById('admin-users-search')?.addEventListener('input', () => {
    _uPage = 1;
    applyUsersFilter();
  });
  document.getElementById('admin-users-filter')?.addEventListener('change', () => {
    _uPage = 1;
    applyUsersFilter();
  });

  /* ============================================================
     FEEDBACK TAB
  ============================================================ */
  async function loadFeedback() {
    try {
      const res  = await fetch('/api/feedback');
      const data = await res.json();
      if (!data.success) return;

      _feedbackList = data.feedback;
      document.getElementById('feedback-count-lbl').textContent = _feedbackList.length;
      _fPage = 1;
      applyFeedbackFilter();
    } catch (err) {
      console.error('Load feedback failed:', err);
    }
  }

  function applyFeedbackFilter() {
    const q      = (document.getElementById('admin-reviews-search')?.value || '').trim().toLowerCase();
    const rating = document.getElementById('admin-reviews-rating-filter')?.value || 'all';

    let filtered = _feedbackList.filter(f => {
      const matchRating = rating === 'all' || f.rating === parseInt(rating);
      const matchQ = !q
        || f.name.toLowerCase().includes(q)
        || f.email.toLowerCase().includes(q)
        || f.message.toLowerCase().includes(q)
        || translateEventName(f.event).toLowerCase().includes(q);
      return matchRating && matchQ;
    });

    document.getElementById('feedback-count-lbl').textContent = filtered.length;
    renderFeedbackPage(filtered);
  }

  function renderFeedbackPage(list) {
    const totalPages = Math.ceil(list.length / _fPer);
    const page       = Math.min(_fPage, totalPages || 1);
    _fPage           = page;
    const slice      = list.slice((page - 1) * _fPer, page * _fPer);

    const tbody = document.getElementById('admin-feedback-tbody');

    if (!slice.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="admin-table-empty">No reviews found.</td></tr>`;
      document.getElementById('feedback-pagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = slice.map(f => {
      const date  = new Date(f.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const time  = new Date(f.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const stars = buildStars(f.rating);

      return `
        <tr>
          <td><strong style="color:var(--text-muted);font-size:0.78rem;">#${f.id}</strong></td>
          <td><span class="feedback-event-tag">${escapeHtml(translateEventName(f.event))}</span></td>
          <td>
            <div style="font-weight:600;color:var(--text-primary);font-size:0.85rem;">${escapeHtml(f.name)}</div>
            <div style="font-size:0.73rem;color:var(--text-muted);margin-top:2px;">${escapeHtml(f.email)}</div>
          </td>
          <td>
            <span class="rating-chip">${stars} ${f.rating}/5</span>
          </td>
          <td>
            <div style="max-width:280px;word-break:break-word;font-size:0.82rem;color:var(--text-secondary);line-height:1.5;">
              ${escapeHtml(f.message.length > 120 ? f.message.slice(0, 120) + '…' : f.message)}
            </div>
          </td>
          <td>
            <div style="font-size:0.8rem;color:var(--text-secondary);white-space:nowrap;">${date}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);">${time}</div>
          </td>
          <td>
            <div class="admin-actions">
              <button class="admin-btn admin-btn-delete" data-id="${f.id}">✕ Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.admin-btn-delete').forEach(btn =>
      btn.addEventListener('click', () => confirmAction('deleteFeedback', parseInt(btn.dataset.id)))
    );

    renderPagination('feedback-pagination', page, totalPages, (p) => {
      _fPage = p;
      renderFeedbackPage(list);
    });
  }

  /* Init feedback search/filter */
  document.getElementById('admin-reviews-search')?.addEventListener('input', () => {
    _fPage = 1;
    applyFeedbackFilter();
  });
  document.getElementById('admin-reviews-rating-filter')?.addEventListener('change', () => {
    _fPage = 1;
    applyFeedbackFilter();
  });

  /* ============================================================
     PAGINATION RENDERER
  ============================================================ */
  function renderPagination(containerId, currentPage, totalPages, onPageClick) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const pages = getPaginationRange(currentPage, totalPages);
    let html = '';

    html += `<button class="pg-btn" ${currentPage === 1 ? 'disabled' : ''} data-pg="${currentPage - 1}">‹</button>`;

    pages.forEach(p => {
      if (p === '…') {
        html += `<span class="pg-info">…</span>`;
      } else {
        html += `<button class="pg-btn ${p === currentPage ? 'active' : ''}" data-pg="${p}">${p}</button>`;
      }
    });

    html += `<button class="pg-btn" ${currentPage === totalPages ? 'disabled' : ''} data-pg="${currentPage + 1}">›</button>`;
    html += `<span class="pg-info">${currentPage} / ${totalPages}</span>`;

    container.innerHTML = html;

    container.querySelectorAll('.pg-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => onPageClick(parseInt(btn.dataset.pg)));
    });
  }

  function getPaginationRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (current > 3) pages.push('…');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('…');
    pages.push(total);
    return pages;
  }

  /* ============================================================
     CONFIRM MODAL
  ============================================================ */
  let _pendingAction = null;
  let _pendingId     = null;

  function initConfirmModal() {
    document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
    document.getElementById('confirm-ok').addEventListener('click', executeConfirmedAction);
    document.getElementById('confirm-modal').addEventListener('click', e => {
      if (e.target === document.getElementById('confirm-modal')) closeConfirm();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeConfirm();
    });
  }

  function confirmAction(action, id) {
    _pendingAction = action;
    _pendingId     = id;

    const modal   = document.getElementById('confirm-modal');
    const title   = document.getElementById('confirm-title');
    const message = document.getElementById('confirm-message');
    const okBtn   = document.getElementById('confirm-ok');
    const iconWrap = document.getElementById('confirm-icon-wrap');

    const configs = {
      promote: {
        title: 'Promote to Admin?',
        msg: 'This user will gain full admin privileges. They will be able to manage users and reviews.',
        okClass: 'promote', okText: '↑ Yes, Promote',
        iconColor: 'rgba(74,222,128,0.12)', iconStroke: '#4ade80'
      },
      demote: {
        title: 'Remove Admin Access?',
        msg: 'This user will lose their admin privileges and revert to a regular user role.',
        okClass: 'demote', okText: '↓ Yes, Demote',
        iconColor: 'rgba(251,146,60,0.12)', iconStroke: '#fb923c'
      },
      deleteUser: {
        title: 'Delete User Account?',
        msg: 'This will permanently delete the user account. This action cannot be undone.',
        okClass: '', okText: '✕ Yes, Delete',
        iconColor: 'rgba(248,113,113,0.12)', iconStroke: '#f87171'
      },
      deleteFeedback: {
        title: 'Delete Review?',
        msg: 'This review will be permanently removed from the platform.',
        okClass: '', okText: '✕ Yes, Delete',
        iconColor: 'rgba(248,113,113,0.12)', iconStroke: '#f87171'
      }
    };

    const cfg = configs[action];
    if (!cfg) return;

    title.textContent   = cfg.title;
    message.textContent = cfg.msg;
    okBtn.className     = `confirm-btn confirm-btn-ok ${cfg.okClass}`;
    okBtn.textContent   = cfg.okText;
    iconWrap.style.background   = cfg.iconColor;
    iconWrap.style.borderColor  = cfg.iconStroke;
    iconWrap.querySelector('svg').style.stroke = cfg.iconStroke;

    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('confirm-ok').focus();
  }

  function closeConfirm() {
    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
    _pendingAction = null;
    _pendingId     = null;
  }

  async function executeConfirmedAction() {
    const action = _pendingAction;
    const id     = _pendingId;
    closeConfirm();
    if (!action || !id) return;

    switch (action) {
      case 'promote':      await doPromoteUser(id); break;
      case 'demote':       await doDemoteUser(id);  break;
      case 'deleteUser':   await doDeleteUser(id);  break;
      case 'deleteFeedback': await doDeleteFeedback(id); break;
    }
  }

  /* ============================================================
     USER ACTIONS
  ============================================================ */
  async function doPromoteUser(id) {
    try {
      const res  = await fetch(`/api/admin/users/${id}/promote`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'User promoted to admin!', 'success');
        await loadUsers();
        await loadOverview();
      } else {
        showToast(data.message || 'Promotion failed.', 'error');
      }
    } catch { showToast('Network error.', 'error'); }
  }

  async function doDemoteUser(id) {
    try {
      const res  = await fetch(`/api/admin/users/${id}/demote`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'User demoted.', 'success');
        await loadUsers();
        await loadOverview();
      } else {
        /* Fallback if endpoint doesn't exist yet — optimistic update */
        showToast('Demotion not supported by server yet.', 'error');
      }
    } catch { showToast('Network error.', 'error'); }
  }

  async function doDeleteUser(id) {
    try {
      const res  = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'User deleted!', 'success');
        await loadUsers();
        await loadOverview();
      } else {
        showToast(data.message || 'Delete failed.', 'error');
      }
    } catch { showToast('Network error.', 'error'); }
  }

  async function doDeleteFeedback(id) {
    try {
      const res  = await fetch(`/api/admin/feedback/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Review deleted!', 'success');
        await loadFeedback();
        await loadOverview();
      } else {
        showToast(data.message || 'Delete failed.', 'error');
      }
    } catch { showToast('Network error.', 'error'); }
  }

});
