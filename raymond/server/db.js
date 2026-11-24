/**
 * db.js — SQLite database initialisation
 * Creates all tables on first run, returns the db instance.
 */

const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');
require('dotenv').config();

// ── Production safety checks ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('CHANGE_THIS')) {
    throw new Error('❌  JWT_SECRET must be set to a strong random value in production.');
  }
}

const DB_PATH = path.join(__dirname, 'data', 'cv.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── SCHEMA ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL,
    subject    TEXT    NOT NULL,
    body       TEXT    NOT NULL,
    is_read    INTEGER DEFAULT 0,
    replied    INTEGER DEFAULT 0,
    ip         TEXT,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cv_profile (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    name       TEXT,
    role       TEXT,
    school     TEXT,
    location   TEXT,
    email      TEXT,
    phone      TEXT,
    linkedin   TEXT,
    github     TEXT,
    hero_bio   TEXT,
    about1     TEXT,
    about2     TEXT,
    about3     TEXT,
    edu1_qual    TEXT,
    edu1_school  TEXT,
    edu1_year    TEXT,
    edu1_status  TEXT,
    edu1_desc    TEXT,
    edu2_qual    TEXT,
    edu2_school  TEXT,
    edu2_year    TEXT,
    edu2_grade   TEXT,
    edu2_desc    TEXT,
    photo_url  TEXT,
    updated_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    action     TEXT    NOT NULL,
    status     TEXT    NOT NULL,
    ip         TEXT,
    user_agent TEXT,
    created_at TEXT    DEFAULT (datetime('now'))
  );
`);

// ── SEED / SYNC ADMIN USER ────────────────────────────────────────────────────
// On first run: create the admin user with the .env password.
// On subsequent runs: only reset the password if it matches the .env value
// (meaning it was never manually changed via the security page).
const adminUsername = process.env.ADMIN_USERNAME || 'raymond';
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminPassword) {
  throw new Error('❌  ADMIN_PASSWORD must be set in your .env file. See server/.env.example');
}

const existingAdmin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(adminUsername);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(adminPassword, 12);
  db.prepare('INSERT INTO admin_users (username, password) VALUES (?, ?)')
    .run(adminUsername, hash);
  console.log('✅  Admin user created:', adminUsername);
} else {
  // Check if stored hash still matches the current .env password.
  // If yes → re-hash and store (keeps salt fresh).
  // If no  → password was changed via the UI, preserve it.
  const matchesEnv = bcrypt.compareSync(adminPassword, existingAdmin.password);
  if (matchesEnv) {
    const hash = bcrypt.hashSync(adminPassword, 12);
    db.prepare('UPDATE admin_users SET password = ? WHERE username = ?').run(hash, adminUsername);
    console.log('✅  Admin user ready:', adminUsername);
  } else {
    console.log('✅  Admin user ready (custom password active):', adminUsername);
  }
}

// ── SEED DEFAULT PROFILE ROW ─────────────────────────────────────────────────
const profileRow = db.prepare('SELECT id FROM cv_profile WHERE id = 1').get();
if (!profileRow) {
  db.prepare(`
    INSERT INTO cv_profile (id, name, role, school, location, email, phone)
    VALUES (1, 'Raymond Okinyi', 'Diploma in Computer Science Student',
            'NYS Engineering Institute, Nairobi', 'Nairobi, Kenya',
            'raymondopiyo67@gmail.com', '0795058238')
  `).run();
}

module.exports = db;
