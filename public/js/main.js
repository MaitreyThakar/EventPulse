/* ============================================
   EventPulse — Main Application JS
   Handles: Navbar, Theme Toggle, Forms,
            Reviews Filter & Pagination, CSV Export,
            Events Category Filter, Animations
   ============================================ */

// Set theme immediately to avoid layout flash
(function () {
  const savedTheme = localStorage.getItem('ep_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

// Global pagination state
let _currentPage = 1;
const _itemsPerPage = 10;
let _currentFilteredFeedback = [];

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initNavbar();
  initNavAuth();
  initScrollAnimations();
  fetchDynamicStats();
  initFeedbackForm();
  initViewFeedback();
  initEventsFilter();
  autoSelectEventFromURL();
});

/* ============================================================
   NAV AUTH — Show Sign In button or User avatar
   ============================================================ */
function initNavAuth() {
  const authItems = document.querySelectorAll('#nav-auth-item');
  if (!authItems.length) return;

  const token = localStorage.getItem('ep_token');
  let   user  = null;
  try { user = JSON.parse(localStorage.getItem('ep_user')); } catch (_) {}

  authItems.forEach(item => {
    if (token && user) {
      // Logged in — show avatar + dropdown
      const initials = user.name
        .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

      item.innerHTML = `
        <div class="nav-user-menu" id="nav-user-menu-${Math.random().toString(36).slice(2,6)}">
          <div class="nav-user-avatar">${initials}</div>
          <span class="nav-user-name">${user.name.split(' ')[0]}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:#64748b;"><polyline points="6 9 12 15 18 9"/></svg>
          <div class="nav-user-dropdown" id="nav-dropdown">
            <div class="dropdown-info">
              <div class="dropdown-info-name">${user.name}</div>
              <div class="dropdown-info-email">${user.email}</div>
            </div>
            <a href="feedback.html" class="dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Submit Feedback
            </a>
            <a href="view-feedback.html" class="dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View Reviews
            </a>
            <a href="my-feedback.html" class="dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              My Reviews
            </a>
            ${user.isAdmin ? `
            <a href="admin.html" class="dropdown-item" style="color: #a78bfa;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" style="color: #a78bfa;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
              Admin Panel
            </a>` : ''}
            <button class="dropdown-item danger" id="nav-logout-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign Out
            </button>
          </div>
        </div>
      `;

      // Toggle dropdown
      const menu = item.querySelector('.nav-user-menu');
      const drop = item.querySelector('.nav-user-dropdown');

      menu.addEventListener('click', (e) => {
        e.stopPropagation();
        drop.classList.toggle('open');
      });

      document.addEventListener('click', () => drop.classList.remove('open'));

      // Logout
      const logoutBtn = item.querySelector('#nav-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          localStorage.removeItem('ep_token');
          localStorage.removeItem('ep_user');
          window.location.reload();
        });
      }

    } else {
      // Logged out — show Sign In button
      item.innerHTML = `
        <a href="auth.html" class="nav-auth-btn" id="nav-signin-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          Sign In
        </a>
      `;
    }
  });
}

/* ============================================================
   THEME TOGGLE — Toggle Dark / Light Theme
   ============================================================ */
function initThemeToggle() {
  const navLinks = document.getElementById('nav-links');
  if (!navLinks) return;

  const currentTheme = localStorage.getItem('ep_theme') || 'dark';

  const li = document.createElement('li');
  li.className = 'nav-theme-item';
  li.innerHTML = `
    <button class="theme-toggle-btn" id="theme-toggle-btn" aria-label="Toggle theme">
      ${currentTheme === 'dark' ? getSunIcon() : getMoonIcon()}
    </button>
  `;

  // Insert before the auth nav item if it exists
  const authItem = document.getElementById('nav-auth-item');
  if (authItem && authItem.parentNode === navLinks) {
    navLinks.insertBefore(li, authItem);
  } else {
    navLinks.appendChild(li);
  }

  const btn = li.querySelector('#theme-toggle-btn');
  btn.addEventListener('click', () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ep_theme', theme);
    btn.innerHTML = theme === 'dark' ? getSunIcon() : getMoonIcon();
  });
}

function getSunIcon() {
  return `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
}

function getMoonIcon() {
  return `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

/* ============================================================
   DYNAMIC STATS — Fetch from /api/stats and populate
   ============================================================ */
async function fetchDynamicStats() {
  try {
    const res  = await fetch('/api/stats');
    const data = await res.json();
    if (!data.success) return;

    const s = data.stats;

    // Hero stats row
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('stat-feedback', s.totalFeedback || '0');
    setEl('stat-events',   s.uniqueEvents  || '0');
    setEl('stat-members',  s.totalUsers    || '0');
    setEl('stat-rating',   s.avgRating > 0 ? s.avgRating + '★' : '—');

    // 3D stat cards (with counter animation)
    animateValue('db-stat-members',  0, s.totalUsers    || 0, 1200);
    animateValue('db-stat-events',   0, s.uniqueEvents  || 0, 1200);
    animateValue('db-stat-feedback', 0, s.totalFeedback || 0, 1400);

    const ratingEl = document.getElementById('db-stat-rating');
    if (ratingEl) ratingEl.textContent = s.avgRating > 0 ? s.avgRating + '★' : '—';

  } catch (err) {
    console.warn('Stats fetch failed:', err.message);
  }
}

function animateValue(id, from, to, duration) {
  const el = document.getElementById(id);
  if (!el || to === 0) { if (el) el.textContent = '0'; return; }

  const start = performance.now();
  const tick  = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (progress < 1) requestAnimationFrame(tick);
  };

  // Only animate when element is visible
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { requestAnimationFrame(tick); obs.disconnect(); }
  }, { threshold: 0.3 });
  obs.observe(el);
}

/* ============================================================
   NAVBAR
   ============================================================ */
function initNavbar() {
  const navbar   = document.querySelector('.navbar');
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const navLinks  = document.querySelector('.nav-links');

  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
    });
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  }

  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      mobileBtn.textContent = navLinks.classList.contains('open') ? '✕' : '☰';
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        mobileBtn.textContent = '☰';
      });
    });
  }
}

/* ============================================================
   SCROLL REVEAL ANIMATIONS
   ============================================================ */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-in');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}

/* ============================================================
   FEEDBACK FORM — /feedback.html
   ============================================================ */
function initFeedbackForm() {
  const form = document.getElementById('feedback-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn  = document.getElementById('submit-btn');
    const originalHTML = submitBtn.innerHTML;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // ── Validation ──
    if (!data.name || !data.name.trim()) {
      showToast('Please enter your full name.', 'error'); return;
    }
    if (!data.email || !data.email.trim()) {
      showToast('Please enter your email address.', 'error'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      showToast('Please enter a valid email address.', 'error'); return;
    }
    if (!data.event) {
      showToast('Please select an event.', 'error'); return;
    }
    if (!data.rating) {
      showToast('Please select a star rating.', 'error'); return;
    }
    if (!data.message || !data.message.trim()) {
      showToast('Please write your feedback message.', 'error'); return;
    }
    if (data.message.trim().length < 10) {
      showToast('Feedback must be at least 10 characters.', 'error'); return;
    }

    // ── Loading state ──
    submitBtn.innerHTML = `<svg class="btn-icon spin-icon" viewBox="0 0 24 24" style="margin-right:4px;"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.4" stroke-dashoffset="10"/></svg> Submitting…`;
    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast('Thank you! Your feedback has been submitted successfully.', 'success');
        form.reset();
        form.querySelectorAll('.star-rating input').forEach(s => s.checked = false);

        // Redirect to reviews after delay
        setTimeout(() => {
          window.location.href = 'view-feedback.html';
        }, 2500);
      } else {
        const errorMsg = result.errors ? result.errors.join(', ') : (result.message || 'Submission failed');
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error('Submission error:', err);
      showToast('Could not connect to server. Make sure the backend is running.', 'error');
    } finally {
      submitBtn.innerHTML = originalHTML;
      submitBtn.disabled = false;
    }
  });

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      form.querySelectorAll('.star-rating input').forEach(s => s.checked = false);
    });
  }
}

/* ============================================================
   AUTO-SELECT EVENT FROM URL PARAM
   e.g. feedback.html?event=tech-summit
   ============================================================ */
function autoSelectEventFromURL() {
  const select = document.getElementById('event');
  if (!select) return;
  const params = new URLSearchParams(window.location.search);
  const eventVal = params.get('event');
  if (eventVal) {
    const opt = select.querySelector(`option[value="${eventVal}"]`);
    if (opt) {
      opt.selected = true;
      select.dispatchEvent(new Event('change'));
    }
  }
}

/* ============================================================
   VIEW FEEDBACK — /view-feedback.html
   ============================================================ */

// All loaded feedback stored globally for client-side filtering
let _allFeedback = [];

function initViewFeedback() {
  const feedbackList = document.getElementById('feedback-list');
  if (!feedbackList) return;

  loadFeedback().then(() => {
    initFilterToolbar();
  });

  // Attach click handlers to prev/next page buttons
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (_currentPage > 1) {
        _currentPage--;
        renderPaginatedFeedback();
        document.getElementById('feedback-display').scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(_currentFilteredFeedback.length / _itemsPerPage);
      if (_currentPage < totalPages) {
        _currentPage++;
        renderPaginatedFeedback();
        document.getElementById('feedback-display').scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

async function loadFeedback() {
  const loadingState = document.getElementById('loading-state');
  const emptyState   = document.getElementById('empty-state');
  const summaryEl    = document.getElementById('feedback-summary');
  const statusEl     = document.getElementById('server-status');
  const statusText   = document.getElementById('status-text');
  const filterBar    = document.getElementById('filter-toolbar');

  try {
    const response = await fetch('/api/feedback');
    const result   = await response.json();

    // Server connected
    if (statusEl) statusEl.classList.add('connected');
    if (statusText) statusText.textContent = 'Connected to EventPulse Server';

    if (loadingState) loadingState.style.display = 'none';

    if (result.success && result.feedback.length > 0) {
      _allFeedback = result.feedback;

      // Show summary stats
      if (summaryEl) {
        summaryEl.style.display = 'grid';
        document.getElementById('total-count').textContent = result.count;

        const avgRating = (_allFeedback.reduce((sum, f) => sum + f.rating, 0) / _allFeedback.length).toFixed(1);
        document.getElementById('avg-rating').textContent = `${avgRating} ★`;

        const eventCounts = {};
        _allFeedback.forEach(f => { eventCounts[f.event] = (eventCounts[f.event] || 0) + 1; });
        const topEvent = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])[0][0];
        document.getElementById('latest-event').textContent = shortEventName(topEvent);
      }

      // Show filter toolbar
      if (filterBar) filterBar.style.display = 'flex';

      // Initial render — all feedback
      _currentFilteredFeedback = [..._allFeedback];
      _currentPage = 1;
      renderPaginatedFeedback();
    } else {
      if (emptyState) emptyState.style.display = 'block';
    }

  } catch (err) {
    console.error('Failed to load feedback:', err);

    if (statusEl) { statusEl.classList.add('error'); }
    if (statusText) statusText.textContent = 'Cannot connect to server — make sure the backend is running (node server.js)';
    if (loadingState) loadingState.style.display = 'none';

    if (emptyState) {
      emptyState.style.display = 'block';
      const h3 = emptyState.querySelector('#empty-title');
      const p  = emptyState.querySelector('#empty-desc');
      const cta = emptyState.querySelector('#empty-cta');
      if (h3)  h3.textContent  = 'Server Unavailable';
      if (p)   p.textContent   = 'Start the backend server to view submitted feedback.';
      if (cta) cta.style.display = 'none';
    }
  }
}

/* ── Render paginated feedback cards ── */
function renderPaginatedFeedback() {
  const feedbackList = document.getElementById('feedback-list');
  const emptyState   = document.getElementById('empty-state');
  const resultCount  = document.getElementById('result-count');
  const pagControls  = document.getElementById('pagination-controls');
  const pageInfo     = document.getElementById('page-info');
  const prevBtn      = document.getElementById('prev-page-btn');
  const nextBtn      = document.getElementById('next-page-btn');

  if (!feedbackList) return;

  const totalItems = _currentFilteredFeedback.length;
  if (totalItems === 0) {
    feedbackList.innerHTML = '';
    if (emptyState) {
      emptyState.style.display = 'block';
      const h3  = document.getElementById('empty-title');
      const p   = document.getElementById('empty-desc');
      const cta = document.getElementById('empty-cta');
      if (h3)  h3.textContent  = 'No Reviews Match';
      if (p)   p.textContent   = 'Try adjusting your filters or search terms.';
      if (cta) cta.style.display = 'none';
    }
    if (resultCount) resultCount.style.display = 'none';
    if (pagControls) pagControls.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // Calculate pages
  const totalPages = Math.ceil(totalItems / _itemsPerPage);
  if (_currentPage > totalPages) _currentPage = totalPages;
  if (_currentPage < 1) _currentPage = 1;

  // Slice items for current page
  const startIdx = (_currentPage - 1) * _itemsPerPage;
  const endIdx   = startIdx + _itemsPerPage;
  const pageItems = _currentFilteredFeedback.slice(startIdx, endIdx);

  // Render sliced items
  feedbackList.innerHTML = pageItems.map(f => createFeedbackCard(f)).join('');

  // Update page indicators
  if (resultCount) {
    resultCount.style.display = 'block';
    resultCount.textContent = `Showing ${startIdx + 1}–${Math.min(endIdx, totalItems)} of ${totalItems} review${totalItems !== 1 ? 's' : ''}`;
  }

  if (pagControls) {
    if (totalPages > 1) {
      pagControls.style.display = 'flex';
      if (pageInfo) pageInfo.textContent = `Page ${_currentPage} of ${totalPages}`;
      if (prevBtn) prevBtn.disabled = _currentPage === 1;
      if (nextBtn) nextBtn.disabled = _currentPage === totalPages;
    } else {
      pagControls.style.display = 'none';
    }
  }

  initScrollAnimations();
}

/* ── Filter Toolbar ── */
function initFilterToolbar() {
  const eventFilter  = document.getElementById('event-filter');
  const ratingFilter = document.getElementById('rating-filter');
  const sortSelect   = document.getElementById('sort-select');
  const searchInput  = document.getElementById('search-input');
  const clearSearch  = document.getElementById('clear-search');
  const resetBtn     = document.getElementById('reset-filters');
  const activeBadge  = document.getElementById('active-filter-badge');
  const clearFilter  = document.getElementById('clear-filter');
  const exportCsvBtn = document.getElementById('export-csv-btn');

  function applyFilters() {
    let filtered = [..._allFeedback];

    // ── Event filter ──
    const eventVal = eventFilter ? eventFilter.value : 'all';
    if (eventVal && eventVal !== 'all') {
      filtered = filtered.filter(f => f.event === eventVal);
    }

    // ── Rating filter ──
    const ratingVal = ratingFilter ? parseInt(ratingFilter.value) : 0;
    if (ratingVal && ratingVal !== 'all' && !isNaN(ratingVal)) {
      filtered = filtered.filter(f => f.rating === ratingVal);
    }

    // ── Search ──
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (query) {
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(query) ||
        f.message.toLowerCase().includes(query) ||
        formatEventName(f.event).toLowerCase().includes(query)
      );
    }

    // ── Sort ──
    const sortVal = sortSelect ? sortSelect.value : 'newest';
    filtered.sort((a, b) => {
      if (sortVal === 'newest')      return new Date(b.submittedAt) - new Date(a.submittedAt);
      if (sortVal === 'oldest')      return new Date(a.submittedAt) - new Date(b.submittedAt);
      if (sortVal === 'rating-high') return b.rating - a.rating;
      if (sortVal === 'rating-low')  return a.rating - b.rating;
      return 0;
    });

    // ── Active badge ──
    if (activeBadge) {
      const isFiltered = (eventVal && eventVal !== 'all') || (ratingVal && ratingVal !== 'all' && !isNaN(ratingVal)) || query;
      if (isFiltered) {
        activeBadge.style.display = 'flex';
        const nameParts = [];
        if (eventVal && eventVal !== 'all') nameParts.push(shortEventName(eventVal));
        if (ratingVal && ratingVal !== 'all' && !isNaN(ratingVal)) nameParts.push(`${ratingVal} Stars`);
        if (query) nameParts.push(`"${query}"`);
        const nameEl  = document.getElementById('active-filter-name');
        const countEl = document.getElementById('active-filter-count');
        if (nameEl)  nameEl.textContent  = nameParts.join(' + ');
        if (countEl) countEl.textContent = filtered.length;
      } else {
        activeBadge.style.display = 'none';
      }
    }

    _currentFilteredFeedback = filtered;
    _currentPage = 1;
    renderPaginatedFeedback();
  }

  if (eventFilter)  eventFilter.addEventListener('change', applyFilters);
  if (ratingFilter) ratingFilter.addEventListener('change', applyFilters);
  if (sortSelect)   sortSelect.addEventListener('change', applyFilters);

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (clearSearch) clearSearch.style.display = searchInput.value ? 'flex' : 'none';
      applyFilters();
    });
  }

  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      clearSearch.style.display = 'none';
      applyFilters();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (eventFilter)  eventFilter.value  = 'all';
      if (ratingFilter) ratingFilter.value = 'all';
      if (sortSelect)   sortSelect.value   = 'newest';
      if (searchInput)  searchInput.value  = '';
      if (clearSearch)  clearSearch.style.display = 'none';
      if (activeBadge)  activeBadge.style.display = 'none';
      _currentFilteredFeedback = [..._allFeedback];
      _currentPage = 1;
      renderPaginatedFeedback();
    });
  }

  if (clearFilter) {
    clearFilter.addEventListener('click', () => {
      if (eventFilter)  eventFilter.value  = 'all';
      if (ratingFilter) ratingFilter.value = 'all';
      if (activeBadge)  activeBadge.style.display = 'none';
      applyFilters();
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      const eventFilterVal = eventFilter ? eventFilter.value : 'all';
      let url = '/api/feedback/export/csv';
      if (eventFilterVal && eventFilterVal !== 'all') {
        url += `?event=${encodeURIComponent(eventFilterVal)}`;
      }
      window.location.href = url;
    });
  }
}

/* ============================================================
   EVENTS PAGE — Category Filter Tabs
   ============================================================ */
function initEventsFilter() {
  const filterBtns = document.querySelectorAll('.ev-filter-btn');
  const eventsGrid = document.getElementById('events-grid');
  const emptyEl    = document.getElementById('events-empty');
  if (!filterBtns.length || !eventsGrid) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      const cards  = eventsGrid.querySelectorAll('.event-card');
      let visible  = 0;

      cards.forEach(card => {
        const cat = card.dataset.category;
        const show = filter === 'all' || cat === filter;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });

      if (emptyEl) emptyEl.style.display = visible === 0 ? 'block' : 'none';
    });
  });
}

/* ============================================================
   FEEDBACK CARD TEMPLATE
   ============================================================ */
function createFeedbackCard(feedback) {
  const initials = feedback.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const stars = Array.from({ length: 5 }, (_, i) =>
    i < feedback.rating
      ? '<span class="star-filled">★</span>'
      : '<span class="star-empty">★</span>'
  ).join('');

  const timeAgo   = getRelativeTime(feedback.submittedAt);
  const eventName = formatEventName(feedback.event);

  // Avatar gradient based on first char code
  const hue = (feedback.name.charCodeAt(0) * 37) % 360;
  const avatarStyle = `background: linear-gradient(135deg, hsl(${hue},70%,50%), hsl(${(hue+40)%360},70%,60%))`;

  return `
    <div class="feedback-card animate-in">
      <div class="feedback-card-header">
        <div class="feedback-author">
          <div class="author-avatar" style="${avatarStyle}">${escapeHtml(initials)}</div>
          <div class="author-info">
            <h4>${escapeHtml(feedback.name)}</h4>
            <span class="author-email">${escapeHtml(feedback.email)}</span>
          </div>
        </div>
        <div class="feedback-stars">${stars}</div>
      </div>
      <div class="feedback-event-tag">
        <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;vertical-align:middle;margin-right:4px;">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
        ${escapeHtml(eventName)}
      </div>
      <p class="feedback-message">${escapeHtml(feedback.message)}</p>
      <div class="feedback-timestamp">
        <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;vertical-align:middle;margin-right:4px;">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        ${timeAgo}
        <span class="feedback-rating-pill">${feedback.rating}/5</span>
      </div>
    </div>
  `;
}

/* ============================================================
   HELPERS
   ============================================================ */

const EVENT_NAMES = {
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
  'photography-workshop':   'Photography Masterclass',
};

function formatEventName(slug) {
  return EVENT_NAMES[slug] || slug;
}

function shortEventName(slug) {
  const full = formatEventName(slug);
  return full.length > 22 ? full.slice(0, 20) + '…' : full;
}

function getRelativeTime(dateStr) {
  const now    = new Date();
  const date   = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60)  return 'Just now';
  if (diffMin < 60)  return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  if (diffHr  < 24)  return `${diffHr} hr${diffHr  > 1 ? 's' : ''} ago`;
  if (diffDay < 30)  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';

  if (type === 'error') {
    toast.style.background   = 'rgba(239, 68, 68, 0.15)';
    toast.style.borderColor  = 'rgba(239, 68, 68, 0.3)';
    toast.style.color        = '#f87171';
    toast.innerHTML = `<span>⚠</span><span>${message}</span>`;
  } else {
    toast.innerHTML = `<span>✓</span><span>${message}</span>`;
  }

  document.body.appendChild(toast);

  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 4500);
}
