/**
 * api.js — Smart API client
 * Automatically uses the Node.js backend when available.
 * Falls back to localStorage when the server is not running.
 */

const API_BASE = window.location.origin + '/api';

/* ── Backend availability check ──────────────────────────────────────────── */
let _backendAvailable = null; // null = unknown, true/false after first check

async function isBackendUp() {
  if (_backendAvailable !== null) return _backendAvailable;
  try {
    const r = await fetch(API_BASE + '/profile', { method: 'GET', cache: 'no-store' });
    _backendAvailable = r.ok || r.status === 401;
  } catch {
    _backendAvailable = false;
  }
  return _backendAvailable;
}

/* ── Token helpers ────────────────────────────────────────────────────────── */
const Auth = {
  getToken:   ()  => sessionStorage.getItem('cv_token'),
  setToken:   (t) => sessionStorage.setItem('cv_token', t),
  clearToken: ()  => sessionStorage.removeItem('cv_token'),
  isLoggedIn: ()  => !!sessionStorage.getItem('cv_token') || !!sessionStorage.getItem('admin_logged_in'),
};

/* ── Core fetch wrapper ───────────────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ══════════════════════════════════════════════════════════════════════════
   AUTH
   ══════════════════════════════════════════════════════════════════════════ */
const ApiAuth = {

  async login(username, password) {
    /* ── Try real backend first ── */
    if (await isBackendUp()) {
      try {
        const data = await apiFetch('/auth/login', {
          method: 'POST', body: { username, password },
        });
        Auth.setToken(data.token);
        sessionStorage.setItem('admin_user', data.username);
        sessionStorage.setItem('admin_logged_in', 'true');
        return data;
      } catch (err) {
        // If it's a 401 wrong-password, re-throw so the UI shows the error
        if (err.message.includes('Invalid') || err.message.includes('401')) throw err;
        // Otherwise backend is probably down — fall through to localStorage
        _backendAvailable = false;
      }
    }

    /* ── localStorage fallback ── */
    // Default credentials are NOT stored in this file for security.
    // The fallback password is read exclusively from localStorage where
    // it is written after a successful change via Admin → Security.
    // On first use (before any change), login only works via the backend.
    const savedUser = localStorage.getItem('admin_username') || 'raymond';
    const savedPass = localStorage.getItem('admin_password');

    if (!savedPass) {
      // No local password stored — backend must be running
      throw new Error('Backend server is not reachable. Please ensure the server is running.');
    }

    if (username.trim() === savedUser && password === savedPass) {
      sessionStorage.setItem('admin_logged_in', 'true');
      sessionStorage.setItem('admin_user', username.trim());
      return { username: username.trim() };
    }
    throw new Error('Invalid username or password.');
  },

  logout() {
    Auth.clearToken();
    sessionStorage.removeItem('admin_logged_in');
    sessionStorage.removeItem('admin_user');
    window.location.href = 'login.html';
  },

  async changePassword(currentPassword, newPassword) {
    if (await isBackendUp() && Auth.getToken()) {
      return apiFetch('/auth/change-password', {
        method: 'POST', body: { currentPassword, newPassword },
      });
    }
    /* localStorage fallback */
    const saved = localStorage.getItem('admin_password');
    if (!saved) throw new Error('Backend server is not reachable.');
    if (currentPassword !== saved) throw new Error('Current password is incorrect.');
    if (newPassword.length < 8) throw new Error('New password must be at least 8 characters.');
    localStorage.setItem('admin_password', newPassword);
    return { message: 'Password changed successfully.' };
  },

  async getLogs() {
    if (await isBackendUp()) {
      try {
        // Works with or without JWT — if no token, backend returns 401 and we fall back
        return await apiFetch('/auth/logs');
      } catch { _backendAvailable = false; }
    }
    return JSON.parse(localStorage.getItem('admin_logs') || '[]');
  },

  guard() {
    if (!Auth.isLoggedIn()) window.location.href = 'login.html';
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   MESSAGES
   ══════════════════════════════════════════════════════════════════════════ */
const ApiMessages = {

  async submit({ name, email, subject, body }) {
    if (await isBackendUp()) {
      try {
        return await apiFetch('/messages', {
          method: 'POST', body: { name, email, subject, body },
        });
      } catch { _backendAvailable = false; }
    }
    /* localStorage fallback */
    const msgs = JSON.parse(localStorage.getItem('cv_messages') || '[]');
    const msg  = { id: Date.now(), name, email, subject, body,
                   created_at: new Date().toLocaleString(), is_read: 0, replied: 0 };
    msgs.unshift(msg);
    localStorage.setItem('cv_messages', JSON.stringify(msgs));
    return { message: 'Message received.', emailSent: false };
  },

  async list(page = 1, limit = 20, filter = '') {
    if (await isBackendUp() && Auth.getToken()) {
      try {
        const q = `?page=${page}&limit=${limit}${filter ? '&filter=' + filter : ''}`;
        return await apiFetch('/messages' + q);
      } catch { _backendAvailable = false; }
    }
    /* localStorage fallback */
    let msgs = JSON.parse(localStorage.getItem('cv_messages') || '[]');
    if (filter === 'unread') msgs = msgs.filter(m => !m.is_read);
    if (filter === 'read')   msgs = msgs.filter(m =>  m.is_read);
    const start = (page - 1) * limit;
    return { total: msgs.length, page, limit, messages: msgs.slice(start, start + limit) };
  },

  async stats() {
    if (await isBackendUp() && Auth.getToken()) {
      try { return await apiFetch('/messages/stats'); }
      catch { _backendAvailable = false; }
    }
    const msgs   = JSON.parse(localStorage.getItem('cv_messages') || '[]');
    const unread = msgs.filter(m => !m.is_read).length;
    return { total: msgs.length, unread };
  },

  async markRead(id) {
    if (await isBackendUp() && Auth.getToken()) {
      try { return await apiFetch(`/messages/${id}/read`, { method: 'PATCH' }); }
      catch { _backendAvailable = false; }
    }
    const msgs = JSON.parse(localStorage.getItem('cv_messages') || '[]');
    const m = msgs.find(x => x.id == id);
    if (m) m.is_read = 1;
    localStorage.setItem('cv_messages', JSON.stringify(msgs));
    return { message: 'Marked as read.' };
  },

  async reply(id, replyBody) {
    if (await isBackendUp() && Auth.getToken()) {
      try { return await apiFetch(`/messages/${id}/reply`, { method: 'POST', body: { replyBody } }); }
      catch { _backendAvailable = false; }
    }
    /* localStorage fallback — open mailto */
    const msgs = JSON.parse(localStorage.getItem('cv_messages') || '[]');
    const m = msgs.find(x => x.id == id);
    if (m) {
      m.replied = 1; m.is_read = 1;
      localStorage.setItem('cv_messages', JSON.stringify(msgs));
      window.location.href = `mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}&body=${encodeURIComponent(replyBody)}`;
    }
    return { sent: false, message: 'Opened in email client.' };
  },

  async delete(id) {
    if (await isBackendUp() && Auth.getToken()) {
      try { return await apiFetch(`/messages/${id}`, { method: 'DELETE' }); }
      catch { _backendAvailable = false; }
    }
    let msgs = JSON.parse(localStorage.getItem('cv_messages') || '[]');
    msgs = msgs.filter(x => x.id != id);
    localStorage.setItem('cv_messages', JSON.stringify(msgs));
    return { message: 'Deleted.' };
  },

  async deleteAll() {
    if (await isBackendUp() && Auth.getToken()) {
      try { return await apiFetch('/messages', { method: 'DELETE' }); }
      catch { _backendAvailable = false; }
    }
    localStorage.removeItem('cv_messages');
    return { message: 'All messages deleted.' };
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   PROFILE
   ══════════════════════════════════════════════════════════════════════════ */
const ApiProfile = {

  async get() {
    if (await isBackendUp()) {
      try { return await apiFetch('/profile'); }
      catch { _backendAvailable = false; }
    }
    /* localStorage fallback */
    return JSON.parse(localStorage.getItem('cv_maint') || '{}');
  },

  async update(fields) {
    if (await isBackendUp() && Auth.getToken()) {
      try { return await apiFetch('/profile', { method: 'PUT', body: fields }); }
      catch { _backendAvailable = false; }
    }
    /* localStorage fallback */
    const existing = JSON.parse(localStorage.getItem('cv_maint') || '{}');
    Object.assign(existing, fields);
    localStorage.setItem('cv_maint', JSON.stringify(existing));
    return { message: 'Profile updated (local).' };
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   SKILLS
   ══════════════════════════════════════════════════════════════════════════ */
const ApiSkills = {

  async get() {
    if (await isBackendUp()) {
      try { return await apiFetch('/skills'); }
      catch { _backendAvailable = false; }
    }
    const saved = localStorage.getItem('cv_skills');
    return saved ? JSON.parse(saved) : null;
  },

  async update(skills) {
    if (await isBackendUp() && Auth.getToken()) {
      try { return await apiFetch('/skills', { method: 'PUT', body: { skills } }); }
      catch { _backendAvailable = false; }
    }
    // localStorage fallback
    localStorage.setItem('cv_skills', JSON.stringify(skills));
    return { message: 'Skills updated (local).' };
  },
};

/* ── Exports ──────────────────────────────────────────────────────────────── */
window.ApiAuth     = ApiAuth;
window.ApiMessages = ApiMessages;
window.ApiProfile  = ApiProfile;
window.ApiSkills   = ApiSkills;
window.Auth        = Auth;
