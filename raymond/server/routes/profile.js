/**
 * routes/profile.js — CV profile data (public read, admin write)
 */

const router      = require('express').Router();
const db          = require('../db');
const requireAuth = require('../middleware/auth');

const ALLOWED = [
  'name','role','school','location','email','phone','linkedin','github',
  'hero_bio','about1','about2','about3',
  'edu1_qual','edu1_school','edu1_year','edu1_status','edu1_desc',
  'edu2_qual','edu2_school','edu2_year','edu2_grade','edu2_desc',
  'photo_url',
];

const MAX_LENGTHS = {
  name: 100, role: 150, school: 150, location: 100,
  email: 150, phone: 30, linkedin: 300, github: 300,
  hero_bio: 600, about1: 1200, about2: 1200, about3: 1200,
  edu1_qual: 200, edu1_school: 200, edu1_year: 50,
  edu1_status: 50, edu1_desc: 1200,
  edu2_qual: 200, edu2_school: 200, edu2_year: 50,
  edu2_grade: 50, edu2_desc: 1200,
  photo_url: 500,
};

// GET /api/profile  — public (only return display fields, not internal ones)
router.get('/', (_req, res) => {
  const row = db.prepare('SELECT * FROM cv_profile WHERE id = 1').get();
  if (!row) return res.json({});
  // Strip internal DB fields
  const { id, updated_at, ...profile } = row;
  res.json(profile);
});

// PUT /api/profile  — admin only
router.put('/', requireAuth, (req, res) => {
  const updates = {};
  const errors  = [];

  ALLOWED.forEach(key => {
    if (req.body[key] !== undefined) {
      const val = String(req.body[key]).trim();
      if (MAX_LENGTHS[key] && val.length > MAX_LENGTHS[key]) {
        errors.push(`${key} exceeds max length of ${MAX_LENGTHS[key]}.`);
      } else {
        updates[key] = val;
      }
    }
  });

  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  if (Object.keys(updates).length === 0)
    return res.status(400).json({ error: 'No valid fields provided.' });

  updates.updated_at = new Date().toISOString();

  const cols = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE cv_profile SET ${cols} WHERE id = 1`).run(updates);

  db.prepare(`INSERT INTO activity_logs (action, status, ip)
              VALUES ('Profile Updated', 'Success', ?)`)
    .run(req.ip);

  res.json({ message: 'Profile updated.', updated: Object.keys(updates) });
});

module.exports = router;
