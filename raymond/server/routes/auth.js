/**
 * routes/auth.js — Login, logout, password change
 */

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required.' });

  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username.trim());

  // Log attempt — use uniform status to prevent user enumeration
  const logId = db.prepare(
    `INSERT INTO activity_logs (action, status, ip, user_agent) VALUES (?, ?, ?, ?)`
  ).run('Login', 'Attempted', req.ip, req.headers['user-agent'] || '').lastInsertRowid;

  if (!user || !bcrypt.compareSync(password, user.password)) {
    db.prepare(`UPDATE activity_logs SET status = 'Failed' WHERE id = ?`).run(logId);
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  db.prepare(`UPDATE activity_logs SET status = 'Success' WHERE id = ?`).run(logId);

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, username: user.username });
});

// POST /api/auth/change-password  (protected)
const requireAuth = require('../middleware/auth');
router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Both fields required.' });
  if (newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });

  const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password))
    return res.status(401).json({ error: 'Current password is incorrect.' });

  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE admin_users SET password = ? WHERE id = ?').run(hash, user.id);

  db.prepare(`INSERT INTO activity_logs (action, status, ip)
              VALUES ('Password Change', 'Success', ?)`)
    .run(req.ip);

  res.json({ message: 'Password changed successfully.' });
});

// GET /api/auth/logs  (protected)
router.get('/logs', requireAuth, (req, res) => {
  const logs = db.prepare(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 50`).all();
  res.json(logs);
});

// POST /api/auth/logs  (protected) — frontend logActivity calls this
router.post('/logs', requireAuth, (req, res) => {
  const { action, status } = req.body;
  if (!action) return res.status(400).json({ error: 'action is required.' });
  db.prepare(`INSERT INTO activity_logs (action, status, ip, user_agent) VALUES (?, ?, ?, ?)`)
    .run(
      String(action).slice(0, 100),
      String(status || 'Success').slice(0, 50),
      req.ip,
      req.headers['user-agent'] || ''
    );
  res.json({ ok: true });
});

module.exports = router;
