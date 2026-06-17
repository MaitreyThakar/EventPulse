/* ============================================
   Event Feedback Management System — Main JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollAnimations();
  initFeedbackForm();
  initViewFeedback();
});

/* ---------- Navbar ---------- */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  // Scroll effect
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
    });
    // Trigger on load in case page is already scrolled
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  }

  // Mobile menu toggle
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      mobileBtn.textContent = isOpen ? '✕' : '☰';
    });

    // Close menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        mobileBtn.textContent = '☰';
      });
    });
  }
}

/* ---------- Scroll Reveal Animations ---------- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.animate-in');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}

/* ---------- Feedback Form (Submit Page) ---------- */
function initFeedbackForm() {
  const form = document.getElementById('feedback-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.textContent;

    // Collect form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Basic validation
    if (!data.name || !data.email || !data.event || !data.message) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (!data.rating) {
      showToast('Please select a rating.', 'error');
      return;
    }

    // Show loading state
    submitBtn.textContent = '⏳ Submitting…';
    submitBtn.disabled = true;

    try {
      // Send feedback to backend API
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast('Thank you! Your feedback has been submitted successfully. ✨', 'success');
        form.reset();
        // Reset star visual
        form.querySelectorAll('.star-rating input').forEach(s => s.checked = false);
      } else {
        const errorMsg = result.errors ? result.errors.join(', ') : 'Submission failed';
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error('Submission error:', err);
      showToast('Could not connect to server. Please make sure the server is running.', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  // Reset button
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      form.querySelectorAll('.star-rating input').forEach(s => s.checked = false);
    });
  }
}

/* ---------- View Feedback (Reviews Page) ---------- */
function initViewFeedback() {
  const feedbackList = document.getElementById('feedback-list');
  if (!feedbackList) return;

  loadFeedback();
}

async function loadFeedback() {
  const feedbackList = document.getElementById('feedback-list');
  const loadingState = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const summaryEl = document.getElementById('feedback-summary');
  const statusEl = document.getElementById('server-status');
  const statusText = document.getElementById('status-text');

  try {
    // Fetch feedback from backend
    const response = await fetch('/api/feedback');
    const result = await response.json();

    // Update server status
    statusEl.classList.add('connected');
    statusText.textContent = 'Connected to EventPulse Server';

    // Hide loading
    loadingState.style.display = 'none';

    if (result.success && result.feedback.length > 0) {
      const feedbacks = result.feedback;

      // Show summary
      summaryEl.style.display = 'grid';
      document.getElementById('total-count').textContent = result.count;

      // Calculate average rating
      const avgRating = (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1);
      document.getElementById('avg-rating').textContent = `${avgRating} ★`;

      // Find most reviewed event
      const eventCounts = {};
      feedbacks.forEach(f => {
        eventCounts[f.event] = (eventCounts[f.event] || 0) + 1;
      });
      const topEvent = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])[0][0];
      document.getElementById('latest-event').textContent = formatEventName(topEvent);

      // Render feedback cards
      feedbackList.innerHTML = feedbacks.map(f => createFeedbackCard(f)).join('');

      // Trigger scroll animations on new cards
      initScrollAnimations();
    } else {
      // Show empty state
      emptyState.style.display = 'block';
    }

  } catch (err) {
    console.error('Failed to load feedback:', err);

    // Update status to error
    statusEl.classList.add('error');
    statusText.textContent = 'Cannot connect to server — make sure the backend is running (node server.js)';

    // Hide loading, show empty
    loadingState.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.querySelector('h3').textContent = 'Server Unavailable';
    emptyState.querySelector('p').textContent = 'Start the backend server to view submitted feedback.';
  }
}

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

  const timeAgo = getRelativeTime(feedback.submittedAt);
  const eventName = formatEventName(feedback.event);

  return `
    <div class="feedback-card animate-in">
      <div class="feedback-card-header">
        <div class="feedback-author">
          <div class="author-avatar">${initials}</div>
          <div class="author-info">
            <h4>${escapeHtml(feedback.name)}</h4>
            <span class="author-email">${escapeHtml(feedback.email)}</span>
          </div>
        </div>
        <div class="feedback-stars">${stars}</div>
      </div>
      <div class="feedback-event-tag"><svg class="btn-icon" viewBox="0 0 24 24" style="width:12px;height:12px;margin-right:4px;vertical-align:middle;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>${escapeHtml(eventName)}</div>
      <p class="feedback-message">${escapeHtml(feedback.message)}</p>
      <div class="feedback-timestamp"><svg class="btn-icon" viewBox="0 0 24 24" style="width:12px;height:12px;margin-right:4px;vertical-align:middle;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${timeAgo}</div>
    </div>
  `;
}

/* ---------- Helpers ---------- */

// Event slug → display name map
const EVENT_NAMES = {
  'tech-summit': 'Tech Innovation Summit 2026',
  'music-fest': 'Neon Nights Music Festival',
  'ux-masterclass': 'UX Design Masterclass',
  'startup-arena': 'Startup Pitch Arena',
  'art-exhibition': 'Modern Art Exhibition',
  'marathon': 'City Marathon Challenge'
};

function formatEventName(slug) {
  return EVENT_NAMES[slug] || slug;
}

function getRelativeTime(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Toast Notification ---------- */
function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';

  if (type === 'error') {
    toast.style.background = 'rgba(239, 68, 68, 0.15)';
    toast.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    toast.style.color = '#f87171';
    toast.innerHTML = `<span>⚠️</span><span>${message}</span>`;
  } else {
    toast.innerHTML = `<span>✅</span><span>${message}</span>`;
  }

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
  });

  // Auto-remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}
