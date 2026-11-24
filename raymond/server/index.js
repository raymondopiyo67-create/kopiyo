/**
 * index.js — Express application entry point
 * Raymond Okinyi Digital CV — Professional Backend
 */

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const fs        = require('fs');

// Initialise database (creates tables + seeds admin on first run)
require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

// ── SECURITY MIDDLEWARE ───────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy:  { policy: 'cross-origin' },
  contentSecurityPolicy:      false, // handled via meta tags in HTML
}));

// CORS — in development allow any origin; in production restrict to FRONTEND_ORIGIN
app.use(cors({
  origin: (origin, cb) => {
    if (isDev || !origin) return cb(null, true);
    const allowed = (process.env.FRONTEND_ORIGIN || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed — ' + origin));
  },
  methods:        ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials:    true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Trust proxy (required for correct IP behind Render/Railway/Nginx)
app.set('trust proxy', 1);

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests, please slow down.' },
}));

// Stricter limits for sensitive endpoints
app.post('/api/messages', rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many submissions. Try again in an hour.' },
}));

app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
}));

// ── API ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/profile',  require('./routes/profile'));
app.use('/api/skills',   require('./routes/skills'));

// 404 JSON for unknown /api paths (must come after all route registrations)
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// ── STATIC FRONTEND ───────────────────────────────────────────────────────────
// Frontend lives in /client, one level up from /server
const frontendPath = path.resolve(__dirname, '..', 'client');

app.use(express.static(frontendPath, {
  index:      'index.html',
  extensions: ['html'],
  maxAge:     isDev ? 0 : '1d',   // cache static assets in production
}));

// SPA / unknown routes — serve index.html (or 404.html if it exists)
app.get('*', (_req, res) => {
  const page404 = path.join(frontendPath, '404.html');
  if (fs.existsSync(page404)) {
    res.status(404).sendFile(page404);
  } else {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[SERVER ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const banner = [
    '',
    '  ╔══════════════════════════════════════════╗',
    '  ║   Raymond Okinyi CV — Backend Server     ║',
   `  ║   http://localhost:${PORT}  [${process.env.NODE_ENV || 'development'}]           ║`,
    '  ╚══════════════════════════════════════════╝',
    '',
    '  Routes: POST /api/auth/login',
    '          GET|PUT /api/profile',
    '          GET|PUT /api/skills',
    '          POST|GET|PATCH|DELETE /api/messages',
    '          GET|POST /api/auth/logs',
    '          POST /api/auth/change-password',
    '',
  ];
  console.log(banner.join('\n'));
});
