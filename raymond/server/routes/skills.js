/**
 * routes/skills.js — CV skills data (public read, admin write)
 */

const router      = require('express').Router();
const db          = require('../db');
const requireAuth = require('../middleware/auth');

const DEFAULT_SKILLS = [
  { name: 'Networking & Infrastructure', pct: 82 },
  { name: 'Graphic Design & Multimedia', pct: 78 },
  { name: 'Computer Organisation & Architecture', pct: 75 },
  { name: 'Operating Systems', pct: 80 },
  { name: 'Website Development', pct: 88 },
  { name: 'Java Programming', pct: 77 },
];

// Ensure skills table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS cv_skills (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL,
    pct  INTEGER NOT NULL CHECK (pct >= 0 AND pct <= 100)
  );
`);

// Seed defaults if empty
const count = db.prepare('SELECT COUNT(*) as n FROM cv_skills').get().n;
if (count === 0) {
  const insert = db.prepare('INSERT INTO cv_skills (name, pct) VALUES (?, ?)');
  DEFAULT_SKILLS.forEach(s => insert.run(s.name, s.pct));
}

// GET /api/skills — public
router.get('/', (_req, res) => {
  const skills = db.prepare('SELECT * FROM cv_skills ORDER BY id').all();
  res.json(skills.length ? skills : DEFAULT_SKILLS);
});

// PUT /api/skills — admin only, replaces all skills
router.put('/', requireAuth, (req, res) => {
  const { skills } = req.body;
  if (!Array.isArray(skills) || skills.length === 0)
    return res.status(400).json({ error: 'skills array required.' });

  // Validate
  for (const s of skills) {
    if (!s.name || typeof s.pct !== 'number' || s.pct < 0 || s.pct > 100)
      return res.status(400).json({ error: 'Each skill needs a name and pct (0–100).' });
  }

  db.prepare('DELETE FROM cv_skills').run();
  const insert = db.prepare('INSERT INTO cv_skills (name, pct) VALUES (?, ?)');
  skills.forEach(s => insert.run(String(s.name).slice(0, 100), Math.round(s.pct)));

  db.prepare(`INSERT INTO activity_logs (action, status, ip) VALUES ('Skills Updated', 'Success', ?)`)
    .run(req.ip);

  res.json({ message: 'Skills updated.', count: skills.length });
});

module.exports = router;
