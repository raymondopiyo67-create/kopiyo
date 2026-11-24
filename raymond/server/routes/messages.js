/**
 * routes/messages.js — Contact form submission + admin message management
 */

const router      = require('express').Router();
const validator   = require('validator');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { sendNotification, sendAutoReply, sendReply } = require('./email');

// ── PUBLIC: POST /api/messages  (contact form submission) ────────────────────
router.post('/', async (req, res) => {
  const { name, email, subject, body } = req.body;

  // Validate
  if (!name || !email || !subject || !body)
    return res.status(400).json({ error: 'All fields are required.' });
  if (!validator.isEmail(email))
    return res.status(400).json({ error: 'Invalid email address.' });
  if (name.length > 100 || subject.length > 200 || body.length > 5000)
    return res.status(400).json({ error: 'Input too long.' });

  // Sanitise
  const clean = {
    name:    validator.escape(name.trim()),
    email:   validator.normalizeEmail(email.trim()),
    subject: validator.escape(subject.trim()),
    body:    validator.escape(body.trim()),
    ip:      req.ip,
  };

  // Store in DB
  db.prepare(`
    INSERT INTO messages (name, email, subject, body, ip)
    VALUES (@name, @email, @subject, @body, @ip)
  `).run(clean);

  // Send emails (non-blocking — don't fail the request if email fails)
  const [notified, replied] = await Promise.all([
    sendNotification(clean),
    sendAutoReply(clean),
  ]);

  db.prepare(`INSERT INTO activity_logs (action, status, ip)
              VALUES ('Contact Form Submission', 'Success', ?)`)
    .run(req.ip);

  res.status(201).json({
    message: 'Message received. Raymond will get back to you shortly.',
    emailSent: notified,
    autoReplySent: replied,
  });
});

// ── ADMIN: GET /api/messages  ────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page  || 1));
  const limit = Math.min(50, parseInt(req.query.limit || 20));
  const offset = (page - 1) * limit;
  const filter = req.query.filter; // 'unread' | 'read' | undefined

  let where = '';
  if (filter === 'unread') where = 'WHERE is_read = 0';
  if (filter === 'read')   where = 'WHERE is_read = 1';

  const total = db.prepare(`SELECT COUNT(*) as n FROM messages ${where}`).get().n;
  const rows  = db.prepare(
    `SELECT * FROM messages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(limit, offset);

  res.json({ total, page, limit, messages: rows });
});

// ── ADMIN: GET /api/messages/stats  ─────────────────────────────────────────
router.get('/stats', requireAuth, (req, res) => {
  const total  = db.prepare('SELECT COUNT(*) as n FROM messages').get().n;
  const unread = db.prepare('SELECT COUNT(*) as n FROM messages WHERE is_read = 0').get().n;
  res.json({ total, unread });
});

// ── ADMIN: PATCH /api/messages/:id/read  ────────────────────────────────────
router.patch('/:id/read', requireAuth, (req, res) => {
  db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Marked as read.' });
});

// ── ADMIN: POST /api/messages/:id/reply  ────────────────────────────────────
router.post('/:id/reply', requireAuth, async (req, res) => {
  const { replyBody } = req.body;
  if (!replyBody) return res.status(400).json({ error: 'Reply body required.' });

  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found.' });

  const sent = await sendReply({
    toName:          msg.name,
    toEmail:         msg.email,
    originalSubject: msg.subject,
    replyBody:       replyBody.trim(),
  });

  if (sent) {
    db.prepare('UPDATE messages SET replied = 1, is_read = 1 WHERE id = ?').run(msg.id);
    db.prepare(`INSERT INTO activity_logs (action, status, ip)
                VALUES ('Reply Sent', 'Success', ?)`)
      .run(req.ip);
  }

  res.json({ sent, message: sent ? 'Reply sent successfully.' : 'Email failed — check mail config.' });
});

// ── ADMIN: DELETE /api/messages/:id  ────────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ error: 'Message not found.' });
  db.prepare(`INSERT INTO activity_logs (action, status, ip)
              VALUES ('Message Deleted', 'Success', ?)`)
    .run(req.ip);
  res.json({ message: 'Deleted.' });
});

// ── ADMIN: DELETE /api/messages  (clear all) ────────────────────────────────
router.delete('/', requireAuth, (req, res) => {
  db.prepare('DELETE FROM messages').run();
  db.prepare(`INSERT INTO activity_logs (action, status, ip)
              VALUES ('All Messages Cleared', 'Success', ?)`)
    .run(req.ip);
  res.json({ message: 'All messages deleted.' });
});

module.exports = router;
