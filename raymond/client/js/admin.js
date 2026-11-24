/* =============================================
   ADMIN PANEL JS — Backend-connected version
   ============================================= */

// ── Admin theme toggle ────────────────────────────────────────────────────────
(function initAdminTheme() {
  const saved = localStorage.getItem('cv_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved ? saved === 'dark' : prefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  const btn  = document.getElementById('adminThemeToggle');
  const moon = document.getElementById('adminMoon');
  const sun  = document.getElementById('adminSun');

  function syncAdminIcons() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (moon) moon.style.display = isDark ? 'none' : '';
    if (sun)  sun.style.display  = isDark ? ''     : 'none';
  }
  syncAdminIcons();

  btn?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('cv_theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('cv_theme', 'dark');
    }
    syncAdminIcons();
  });
});

// ── Load API client ────────────────────────────────────────────────────────
// api.js is loaded before this script on each admin page

// ── AUTH GUARD ────────────────────────────────────────────────────────────────
function checkAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html';
  }
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPass').value.trim();
    const err  = document.getElementById('loginErr');
    const btn  = loginForm.querySelector('button[type=submit]');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';

    try {
      await ApiAuth.login(user, pass);
      window.location.href = 'dashboard.html';
    } catch (e) {
      err.classList.add('show');
      err.textContent = '⚠ ' + (e.message || 'Invalid credentials.');
      setTimeout(() => err.classList.remove('show'), 3500);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
  });
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  ApiAuth.logout();
});

// ── SIDEBAR TOGGLE ────────────────────────────────────────────────────────────
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar       = document.getElementById('sidebar');
const sidebarClose  = document.getElementById('sidebarClose');
if (sidebarToggle) sidebarToggle.addEventListener('click', () => sidebar?.classList.add('open'));
if (sidebarClose)  sidebarClose.addEventListener('click',  () => sidebar?.classList.remove('open'));

// ── DASHBOARD ────────────────────────────────────────────────────────────────
function formatDate(raw) {
  if (!raw) return '—';
  const d = new Date(raw.replace(' ', 'T'));
  return isNaN(d) ? raw : d.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
}

async function loadDashboard() {
  checkAuth();
  try {
    const stats = await ApiMessages.stats();
    setEl('unreadCount', stats.unread);
    setEl('totalMsg',    stats.total);
    setEl('msgBadge',    stats.unread > 0 ? stats.unread : '');

    const { messages } = await ApiMessages.list(1, 5);
    const tbody = document.getElementById('recentMsgs');
    if (tbody) {
      tbody.innerHTML = '';
      if (!messages.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1.5rem;">No messages yet.</td></tr>';
      } else {
        messages.forEach(msg => {
          tbody.innerHTML += `
            <tr>
              <td><strong>${esc(msg.name)}</strong><br><small>${esc(msg.email)}</small></td>
              <td>${esc(msg.subject)}</td>
              <td>${formatDate(msg.created_at)}</td>
              <td><span class="msg-status ${msg.is_read ? 'read' : 'unread'}">${msg.is_read ? 'Read' : 'Unread'}</span></td>
              <td class="msg-actions">
                <a href="messages.html" title="View"><i class="fas fa-eye"></i></a>
                <a href="#" onclick="deleteMsg(${msg.id}); return false;" title="Delete"><i class="fas fa-trash"></i></a>
              </td>
            </tr>`;
        });
      }
    }
  } catch (e) {
    console.error('Dashboard error:', e);
  }

  // Visit count (still local — no analytics backend needed)
  const visits = parseInt(localStorage.getItem('visit_count') || '0') + 1;
  localStorage.setItem('visit_count', visits);
  setEl('visitCount', visits);
}

// ── MESSAGES PAGE ─────────────────────────────────────────────────────────────
let currentPage   = 1;
let currentFilter = '';

async function loadMessages() {
  checkAuth();
  const container = document.getElementById('messagesList');
  if (!container) return;

  try {
    const { messages } = await ApiMessages.list(currentPage, 20, currentFilter);
    container.innerHTML = '';
    if (!messages.length) {
      container.innerHTML = '<div class="message-item"><p style="color:var(--text-muted);text-align:center;padding:1rem;">No messages found.</p></div>';
      return;
    }
    messages.forEach(msg => {
      const dateStr = formatDate(msg.created_at);
      container.innerHTML += `
        <div class="message-item ${msg.is_read ? '' : 'unread'}" id="msg-${msg.id}"
             data-id="${msg.id}" data-name="${esc(msg.name)}"
             data-email="${esc(msg.email)}" data-subject="${esc(msg.subject)}">
          <div class="msg-meta">
            <div>
              <span class="msg-sender">${esc(msg.name)}</span>
              <span class="msg-email"> — ${esc(msg.email)}</span>
            </div>
            <span class="msg-date"><i class="fas fa-clock"></i> ${dateStr}</span>
          </div>
          <div class="msg-subject"><i class="fas fa-tag"></i> ${esc(msg.subject)}</div>
          <div class="msg-preview">${esc(msg.body)}</div>
          <div class="msg-item-actions">
            <button class="btn btn-sm btn-primary" onclick="markRead(${msg.id})"><i class="fas fa-check"></i> Mark Read</button>
            <button class="btn btn-sm btn-outline reply-btn" data-id="${msg.id}"><i class="fas fa-reply"></i> Reply</button>
            <a href="mailto:${esc(msg.email)}?subject=Re:%20${encodeURIComponent(msg.subject)}" class="btn btn-sm btn-outline"><i class="fas fa-envelope"></i> Gmail</a>
            <button class="btn btn-sm btn-danger" onclick="deleteMsg(${msg.id})"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </div>`;
    });

    // Attach reply buttons via delegation (avoids inline onclick XSS risk)
    container.querySelectorAll('.reply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.message-item');
        openReply(
          card.dataset.id,
          card.dataset.name,
          card.dataset.email,
          card.dataset.subject
        );
      });
    });
  } catch (e) {
    container.innerHTML = '<div class="message-item"><p style="color:var(--danger);">Failed to load messages: ' + esc(e.message) + '</p></div>';
  }
}

async function markRead(id) {
  checkAuth();
  try {
    await ApiMessages.markRead(id);
    loadMessages();
  } catch (e) {
    showAlert('messagesAlert', '⚠ Could not mark as read: ' + e.message, 'error');
  }
}

async function deleteMsg(id) {
  if (!confirm('Delete this message?')) return;
  try {
    await ApiMessages.delete(id);
    loadMessages();
  } catch (e) {
    showAlert('messagesAlert', '⚠ Could not delete: ' + e.message, 'error');
  }
}

function openReply(id, name, email, subject) {
  const modal = document.getElementById('replyModal');
  if (!modal) return;
  document.getElementById('replyMsgId').value    = id;
  document.getElementById('replyToName').value   = name;
  document.getElementById('replyToEmail').value  = email;
  document.getElementById('replySubject').value  = 'Re: ' + subject;
  document.getElementById('replyBody').value     = '';
  modal.style.display = 'flex';
}

document.getElementById('closeReplyModal')?.addEventListener('click', () => {
  document.getElementById('replyModal').style.display = 'none';
});

document.getElementById('replyForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id   = document.getElementById('replyMsgId').value;
  const body = document.getElementById('replyBody').value.trim();
  if (!body) return;

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';

  try {
    const r = await ApiMessages.reply(id, body);
    document.getElementById('replyModal').style.display = 'none';
    showAlert('messagesAlert', r.sent
      ? '✅ Reply sent to their email!'
      : '⚠ Reply saved but email failed. Check mail config.', r.sent ? 'success' : 'error');
    loadMessages();
  } catch (err) {
    showAlert('messagesAlert', '⚠ ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reply';
  }
});

async function clearMessages() {
  if (!confirm('Delete ALL messages? This cannot be undone.')) return;
  await ApiMessages.deleteAll().catch(console.error);
  const alertId = document.getElementById('messagesAlert') ? 'messagesAlert' : 'maintAlert';
  showAlert(alertId, 'All messages cleared.', 'success');
  if (document.getElementById('messagesList')) loadMessages();
}

// ── PROFILE EDITOR ────────────────────────────────────────────────────────────
async function loadProfile() {
  checkAuth();
  try {
    const d = await ApiProfile.get();
    const fields = {
      editName: d.name, editRole: d.role, editEmail: d.email,
      editPhone: d.phone, editLocation: d.location, editSchool: d.school,
      editBio: d.hero_bio,
    };
    Object.entries(fields).forEach(([id, val]) => setVal(id, val || ''));
  } catch (e) {
    showAlert('profileAlert', '⚠ Failed to load profile data: ' + e.message, 'error');
  }
}

async function saveProfile() {
  const data = {
    name:     getVal('editName'),
    role:     getVal('editRole'),
    email:    getVal('editEmail'),
    phone:    getVal('editPhone'),
    location: getVal('editLocation'),
    school:   getVal('editSchool'),
    hero_bio: getVal('editBio'),
  };
  try {
    await ApiProfile.update(data);
    showAlert('profileAlert', '✅ Profile saved!', 'success');
  } catch (e) {
    showAlert('profileAlert', '⚠ ' + e.message, 'error');
  }
}
document.getElementById('profileForm')?.addEventListener('submit', (e) => {
  e.preventDefault(); saveProfile();
});

// ── SKILLS EDITOR ─────────────────────────────────────────────────────────────
const defaultSkills = [
  { name: 'Networking & Infrastructure',           pct: 82 },
  { name: 'Graphic Design & Multimedia',           pct: 78 },
  { name: 'Computer Organisation & Architecture',  pct: 75 },
  { name: 'Operating Systems',                     pct: 80 },
  { name: 'Website Development',                   pct: 88 },
  { name: 'Java Programming',                      pct: 77 },
];

async function loadSkills() {
  checkAuth();
  const container = document.getElementById('skillEditor');
  if (!container) return;
  try {
    const data = await ApiSkills.get();
    const skills = (data && data.length) ? data : defaultSkills;
    container.innerHTML = '';
    skills.forEach((s, i) => {
      container.innerHTML += `
        <div class="skill-row">
          <label>${esc(s.name)}</label>
          <input type="range" min="0" max="100" value="${s.pct}" oninput="updatePct(this,${i})">
          <span class="pct" id="pct-${i}">${s.pct}%</span>
        </div>`;
    });
  } catch (e) {
    showAlert('skillsAlert', '⚠ Failed to load skills: ' + e.message, 'error');
  }
}

function updatePct(input, idx) {
  document.getElementById('pct-' + idx).textContent = input.value + '%';
}
window.updatePct = updatePct;

async function saveSkills() {
  const rows = document.querySelectorAll('.skill-row');
  const skills = Array.from(rows).map(row => ({
    name: row.querySelector('label').textContent,
    pct:  parseInt(row.querySelector('input[type=range]').value),
  }));
  try {
    await ApiSkills.update(skills);
    showAlert('skillsAlert', '✅ Skills updated!', 'success');
    logActivity('Skills Update', 'Success');
  } catch (e) {
    showAlert('skillsAlert', '⚠ Failed to save skills: ' + e.message, 'error');
  }
}
document.getElementById('saveSkillsBtn')?.addEventListener('click', saveSkills);

// ── SECURITY ──────────────────────────────────────────────────────────────────
async function loadSecurity() {
  checkAuth();
  const tbody = document.getElementById('loginLogs');
  if (!tbody) return;
  try {
    const logs = await ApiAuth.getLogs();
    tbody.innerHTML = '';
    if (!logs.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No logs yet.</td></tr>';
      return;
    }
    logs.slice(0, 15).forEach(log => {
      tbody.innerHTML += `
        <tr>
          <td>${esc(log.created_at)}</td>
          <td>${esc(log.action)}</td>
          <td>${esc(log.ip || '—')}</td>
          <td><span class="log-status ${log.status === 'Success' ? 'ok' : 'fail'}">${esc(log.status)}</span></td>
        </tr>`;
    });
  } catch (e) { console.error(e); }
}

// changePassForm is handled by security.html's own inline script to avoid duplicate handlers.
// admin.js does NOT attach a listener here — only security.html's inline script does.

// ── MAINTENANCE ───────────────────────────────────────────────────────────────
async function clearLogs() {
  if (!confirm('Clear activity logs on the server?')) return;
  // Logs are managed by the DB; this just clears the local cache
  showAlert('maintAlert', 'Note: Server logs are retained. Use DB backup to fully clear.', 'success');
}

function exportData() {
  window.open('/api/profile', '_blank');
  showAlert('maintAlert', 'Profile data opened. Use browser dev tools to inspect the full API.', 'success');
}

async function resetCV() {
  if (!confirm('Reset profile to defaults?')) return;
  try {
    await ApiProfile.update({
      name: 'Raymond Okinyi', role: 'Diploma in Computer Science Student',
      school: 'NYS Engineering Institute, Nairobi', location: 'Nairobi, Kenya',
      email: 'raymondopiyo67@gmail.com', phone: '0795058238',
    });
    showAlert('maintAlert', '✅ Profile reset to defaults.', 'success');
  } catch (e) {
    showAlert('maintAlert', '⚠ ' + e.message, 'error');
  }
}

window.clearMessages = clearMessages;
window.clearLogs     = clearLogs;
window.resetCV       = resetCV;
window.exportData    = exportData;
window.deleteMsg     = deleteMsg;
window.markRead      = markRead;
window.openReply     = openReply;
window.checkAuth     = checkAuth;
window.showAlert     = showAlert;
window.loadSecurity  = loadSecurity;
window.loadDashboard = loadDashboard;

// ── UTILS ─────────────────────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function getVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function setEl(id, val)  { const el = document.getElementById(id); if (el) el.textContent = val; }
function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className   = 'alert alert-' + type + ' show';
  setTimeout(() => el.className = 'alert', 5000);
}

/**
 * logActivity — logs admin actions to the backend activity_logs table.
 * Falls back silently if the API is unavailable or the token has expired.
 */
function logActivity(action, status) {
  if (!window.Auth || !window.Auth.isLoggedIn()) return;
  fetch('/api/auth/logs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + window.Auth.getToken(),
    },
    body: JSON.stringify({ action, status }),
  }).catch(() => {}); // silent — log failure must never break the UI
}
window.logActivity = logActivity;

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.getAttribute('data-page');
  if (page === 'dashboard')   loadDashboard();
  if (page === 'messages')    loadMessages();
  if (page === 'profile')     loadProfile();
  if (page === 'skills')      loadSkills();
  if (page === 'security')    loadSecurity();
  if (page === 'maintenance') checkAuth();
  if (page === 'email-setup') checkAuth();
});
