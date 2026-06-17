/* ============================================
   EventPulse — Full-Stack Backend v3.0
   Features: Auth, Email, Reset PW, Charts,
             CSV Export, Admin Dashboard
   ============================================ */

const express    = require('express');
const path       = require('path');
const crypto     = require('crypto');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const sqlite3    = require('sqlite3').verbose();

const app  = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET  = 'eventpulse-super-secret-2026';
const JWT_EXPIRES = '7d';
const BASE_URL    = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

// ── Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── SQLite ──
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('DB error:', err.message);
  console.log('Connected to SQLite:', dbPath);
  initDB();
});

function initDB() {
  db.serialize(() => {
    // Feedback table
    db.run(`CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT NOT NULL,
      event TEXT NOT NULL, rating INTEGER NOT NULL,
      message TEXT NOT NULL, submittedAt TEXT NOT NULL
    )`, () => console.log('Feedback table ready'));

    // Users table (full schema)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      isAdmin     INTEGER DEFAULT 0,
      isVerified  INTEGER DEFAULT 0,
      verifyToken TEXT,
      resetToken  TEXT,
      resetExpiry TEXT,
      createdAt   TEXT NOT NULL
    )`, () => {
      console.log('Users table ready');
      // Add columns if upgrading from old schema
      const cols = ['isAdmin','isVerified','verifyToken','resetToken','resetExpiry'];
      cols.forEach(col => {
        db.run(`ALTER TABLE users ADD COLUMN ${col} ${col.startsWith('is') ? 'INTEGER DEFAULT 0' : 'TEXT'}`, () => {});
      });
    });
  });
}

// ── Nodemailer (Ethereal dev SMTP) ──
let mailer = null;

async function getMailer() {
  if (mailer) return mailer;
  const testAcc = await nodemailer.createTestAccount();
  mailer = nodemailer.createTransport({
    host: 'smtp.ethereal.email', port: 587, secure: false,
    auth: { user: testAcc.user, pass: testAcc.pass }
  });
  console.log('\n📬 Ethereal Email ready — preview sent emails at: https://ethereal.email\n');
  return mailer;
}

async function sendEmail({ to, subject, html }) {
  try {
    const transport = await getMailer();
    const info = await transport.sendMail({
      from: '"EventPulse" <noreply@eventpulse.app>',
      to, subject, html
    });
    const preview = nodemailer.getTestMessageUrl(info);
    console.log(`\n📧 Email sent to ${to}`);
    console.log(`   Preview: ${preview}\n`);
    return { success: true, preview };
  } catch (err) {
    console.error('Email error:', err.message);
    return { success: false };
  }
}

// ── Auth Middleware ──
function requireAuth(req, res, next) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Login required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ success: false, message: 'Token invalid or expired' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.isAdmin) return res.status(403).json({ success: false, message: 'Admin access required' });
    next();
  });
}

// ============================================
// ── AUTH ROUTES ──────────────────────────────
// ============================================

app.get('/api/welcome', (req, res) => res.json({
  success: true, message: 'EventPulse API v3.0', timestamp: new Date().toISOString()
}));

// ── Register ──
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  const errs = [];
  if (!name?.trim())   errs.push('Name required');
  if (!email?.trim())  errs.push('Email required');
  if (!password)       errs.push('Password required');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Invalid email');
  if (password && password.length < 6) errs.push('Password min 6 chars');
  if (errs.length) return res.status(400).json({ success: false, errors: errs });

  const cleanName  = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  db.get('SELECT id FROM users WHERE email = ?', [cleanEmail], async (err, existing) => {
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hashed     = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const isAdmin    = cleanEmail === 'admin@eventpulse.com' ? 1 : 0;
    const createdAt  = new Date().toISOString();

    db.run(
      'INSERT INTO users (name,email,password,isAdmin,isVerified,verifyToken,createdAt) VALUES (?,?,?,?,0,?,?)',
      [cleanName, cleanEmail, hashed, isAdmin, verifyToken, createdAt],
      async function (e) {
        if (e) return res.status(500).json({ success: false, message: 'DB error' });

        const userId = this.lastID;
        console.log(`New user: ${cleanName} <${cleanEmail}> (id:${userId}${isAdmin?' ADMIN':''})`);

        // Send verification email
        const verifyLink = `${BASE_URL}/verify.html?token=${verifyToken}`;
        await sendEmail({
          to: cleanEmail, subject: 'Verify your EventPulse account',
          html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;">
            <h2 style="color:#6366f1;">Welcome to EventPulse, ${cleanName}!</h2>
            <p>Click the button below to verify your email address.</p>
            <a href="${verifyLink}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Verify Email</a>
            <p style="color:#64748b;font-size:13px;">Or copy this link:<br/>${verifyLink}</p>
            <p style="color:#64748b;font-size:12px;">If you didn't register, ignore this email.</p>
          </div>`
        });

        const token = jwt.sign({ id: userId, name: cleanName, email: cleanEmail, isAdmin }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        res.status(201).json({
          success: true, message: 'Account created! Check your email to verify.',
          token, user: { id: userId, name: cleanName, email: cleanEmail, isAdmin, isVerified: 0, createdAt }
        });
      }
    );
  });
});

// ── Login ──
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

  db.get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()], async (err, user) => {
    if (err || !user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    console.log(`Login: ${user.name} <${user.email}>`);
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({
      success: true, message: `Welcome back, ${user.name}!`, token,
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, isVerified: user.isVerified, createdAt: user.createdAt }
    });
  });
});

// ── Verify Email ──
app.get('/api/auth/verify', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ success: false, message: 'Token required' });

  db.get('SELECT * FROM users WHERE verifyToken = ?', [token], (err, user) => {
    if (err || !user) return res.status(400).json({ success: false, message: 'Invalid or expired verification link' });
    db.run('UPDATE users SET isVerified = 1, verifyToken = NULL WHERE id = ?', [user.id], () => {
      console.log(`Email verified: ${user.email}`);
      res.json({ success: true, message: 'Email verified! You can now sign in.' });
    });
  });
});

// ── Forgot Password ──
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });

  db.get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()], async (err, user) => {
    // Always return success (don't reveal if email exists)
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });

    const resetToken  = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    db.run('UPDATE users SET resetToken = ?, resetExpiry = ? WHERE id = ?', [resetToken, resetExpiry, user.id], async () => {
      const resetLink = `${BASE_URL}/reset-password.html?token=${resetToken}`;
      await sendEmail({
        to: user.email, subject: 'Reset your EventPulse password',
        html: `<div style="font-family:sans-serif;max-width:520px;margin:auto;">
          <h2 style="color:#6366f1;">Reset Your Password</h2>
          <p>Hi ${user.name}, click below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Reset Password</a>
          <p style="color:#64748b;font-size:13px;">Or copy:<br/>${resetLink}</p>
          <p style="color:#64748b;font-size:12px;">Didn't request this? Ignore it.</p>
        </div>`
      });
      res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
    });
  });
});

// ── Reset Password ──
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ success: false, message: 'Token and password required' });
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password min 6 chars' });

  db.get('SELECT * FROM users WHERE resetToken = ?', [token], async (err, user) => {
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });
    if (new Date(user.resetExpiry) < new Date()) {
      return res.status(400).json({ success: false, message: 'Reset link has expired. Request a new one.' });
    }
    const hashed = await bcrypt.hash(password, 12);
    db.run('UPDATE users SET password = ?, resetToken = NULL, resetExpiry = NULL WHERE id = ?', [hashed, user.id], () => {
      console.log(`Password reset: ${user.email}`);
      res.json({ success: true, message: 'Password reset successfully! You can now sign in.' });
    });
  });
});

// ── Get Current User ──
app.get('/api/auth/me', requireAuth, (req, res) => {
  db.get('SELECT id,name,email,isAdmin,isVerified,createdAt FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  });
});

// ============================================
// ── FEEDBACK ROUTES ───────────────────────────
// ============================================

app.post('/api/feedback', (req, res) => {
  const { name, email, event, rating, message } = req.body;
  const errs = [];
  if (!name?.trim())    errs.push('Name required');
  if (!email?.trim())   errs.push('Email required');
  if (!event?.trim())   errs.push('Event required');
  if (!rating)          errs.push('Rating required');
  if (!message?.trim()) errs.push('Message required');
  if (errs.length) return res.status(400).json({ success: false, errors: errs });

  const submittedAt = new Date().toISOString();
  db.run(
    'INSERT INTO feedback (name,email,event,rating,message,submittedAt) VALUES (?,?,?,?,?,?)',
    [name.trim(), email.trim(), event.trim(), parseInt(rating), message.trim(), submittedAt],
    function (err) {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });
      console.log(`Feedback #${this.lastID} from ${name} for "${event}"`);
      res.status(201).json({ success: true, message: 'Feedback submitted!', feedback: { id: this.lastID } });
    }
  );
});

app.get('/api/feedback', (req, res) => {
  db.all('SELECT * FROM feedback ORDER BY submittedAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, count: rows.length, feedback: rows });
  });
});

// ── My Feedback (requires login) ──
app.get('/api/feedback/mine', requireAuth, (req, res) => {
  db.all('SELECT * FROM feedback WHERE email = ? ORDER BY submittedAt DESC', [req.user.email], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, count: rows.length, feedback: rows });
  });
});

// ── Export CSV ──
app.get('/api/feedback/export/csv', (req, res) => {
  const eventFilter = req.query.event;
  const query = eventFilter
    ? 'SELECT * FROM feedback WHERE event = ? ORDER BY submittedAt DESC'
    : 'SELECT * FROM feedback ORDER BY submittedAt DESC';
  const params = eventFilter ? [eventFilter] : [];

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });

    const escape = v => `"${String(v).replace(/"/g, '""')}"`;
    const header = ['ID', 'Name', 'Email', 'Event', 'Rating', 'Message', 'Submitted At'];
    const lines  = [
      header.map(escape).join(','),
      ...rows.map(r => [r.id, r.name, r.email, r.event, r.rating, r.message, r.submittedAt].map(escape).join(','))
    ];
    const csv = lines.join('\r\n');
    const filename = eventFilter ? `feedback-${eventFilter}.csv` : 'feedback-all.csv';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });
});

// ── Get feedback by ID ──
app.get('/api/feedback/:id', (req, res) => {
  db.get('SELECT * FROM feedback WHERE id = ?', [parseInt(req.params.id)], (err, row) => {
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, feedback: row });
  });
});

// ============================================
// ── STATS & CHARTS ────────────────────────────
// ============================================

app.get('/api/stats', (req, res) => {
  db.get('SELECT COUNT(*) as c FROM feedback', [], (e1, fb) => {
  db.get('SELECT COUNT(*) as c FROM users', [], (e2, us) => {
  db.get('SELECT AVG(rating) as avg FROM feedback', [], (e3, avg) => {
  db.get('SELECT COUNT(DISTINCT event) as c FROM feedback', [], (e4, ev) => {
  db.get('SELECT event, COUNT(*) as cnt FROM feedback GROUP BY event ORDER BY cnt DESC LIMIT 1', [], (e5, top) => {
    res.json({ success: true, stats: {
      totalFeedback: fb?.c || 0,
      totalUsers:    us?.c || 0,
      avgRating:     parseFloat((avg?.avg || 0).toFixed(1)),
      uniqueEvents:  ev?.c || 0,
      topEvent:      top?.event || null
    }});
  }); }); }); }); });
});

app.get('/api/charts/ratings', (req, res) => {
  db.all('SELECT event, AVG(rating) as avg, COUNT(*) as count FROM feedback GROUP BY event ORDER BY avg DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, data: rows });
  });
});

app.get('/api/charts/timeline', (req, res) => {
  db.all("SELECT substr(submittedAt,1,10) as date, COUNT(*) as count FROM feedback GROUP BY date ORDER BY date", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, data: rows });
  });
});

app.get('/api/charts/rating-distribution', (req, res) => {
  db.all('SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating ORDER BY rating', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, data: rows });
  });
});

// ============================================
// ── ADMIN ROUTES ──────────────────────────────
// ============================================

app.get('/api/admin/overview', requireAdmin, (req, res) => {
  db.get('SELECT COUNT(*) as total FROM users', [], (e1, users) => {
  db.get('SELECT COUNT(*) as total FROM feedback', [], (e2, fbs) => {
  db.get('SELECT COUNT(*) as total FROM users WHERE isVerified = 1', [], (e3, verified) => {
  db.get('SELECT AVG(rating) as avg FROM feedback', [], (e4, avgR) => {
  db.all('SELECT id,name,email,isAdmin,isVerified,createdAt FROM users ORDER BY createdAt DESC LIMIT 10', [], (e5, recentUsers) => {
  db.all('SELECT event, COUNT(*) as count, AVG(rating) as avg FROM feedback GROUP BY event ORDER BY count DESC', [], (e6, topEvents) => {
    res.json({ success: true, overview: {
      totalUsers:    users?.total    || 0,
      verifiedUsers: verified?.total || 0,
      totalFeedback: fbs?.total      || 0,
      avgRating:     parseFloat((avgR?.avg || 0).toFixed(1)),
      recentUsers:   recentUsers     || [],
      topEvents:     topEvents       || []
    }});
  }); }); }); }); }); });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  db.all('SELECT id,name,email,isAdmin,isVerified,createdAt FROM users ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, count: rows.length, users: rows });
  });
});

app.delete('/api/admin/feedback/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  db.run('DELETE FROM feedback WHERE id = ?', [id], function (err) {
    if (err || this.changes === 0) return res.status(404).json({ success: false, message: 'Feedback not found' });
    console.log(`Admin deleted feedback #${id}`);
    res.json({ success: true, message: `Feedback #${id} deleted` });
  });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) return res.status(400).json({ success: false, message: "Can't delete yourself" });
  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err || this.changes === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: `User #${id} deleted` });
  });
});

app.patch('/api/admin/users/:id/promote', requireAdmin, (req, res) => {
  db.run('UPDATE users SET isAdmin = 1 WHERE id = ?', [parseInt(req.params.id)], function (err) {
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User promoted to admin' });
  });
});

app.patch('/api/admin/users/:id/demote', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) return res.status(400).json({ success: false, message: "Can't demote yourself" });
  db.run('UPDATE users SET isAdmin = 0 WHERE id = ?', [id], function (err) {
    if (this.changes === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User demoted to regular user' });
  });
});

// ── Catch-all ──
app.get('*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ──
app.listen(PORT, () => {
  console.log('\n  EventPulse Server v3.0');
  console.log('  ──────────────────────────────────────');
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Stats:   http://localhost:${PORT}/api/stats`);
  console.log(`  Charts:  http://localhost:${PORT}/api/charts/ratings`);
  console.log(`  Admin:   http://localhost:${PORT}/admin.html`);
  console.log('  ──────────────────────────────────────');
  console.log('  TIP: Register with admin@eventpulse.com to get admin access');
  console.log('');
});
