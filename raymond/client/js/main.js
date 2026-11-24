/* =============================================
   RAYMOND OKINYI — MAIN JS
   ============================================= */

// ---- THEME (run immediately — prevents flash) ----
(function initTheme() {
  const saved = localStorage.getItem('cv_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved ? saved === 'dark' : prefersDark;
  if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
})();

// ---- PRELOADER ----
window.addEventListener('load', () => {
  const pre = document.getElementById('preloader');
  if (pre) setTimeout(() => pre.classList.add('hidden'), 800);
});

// ---- THEME TOGGLE ----
const themeToggleBtn  = document.getElementById('themeToggle');
const themeIconMoon   = document.getElementById('themeIconMoon');
const themeIconSun    = document.getElementById('themeIconSun');

function applyTheme(dark) {
  if (dark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeIconMoon) themeIconMoon.style.display = 'none';
    if (themeIconSun)  themeIconSun.style.display  = '';
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (themeIconMoon) themeIconMoon.style.display = '';
    if (themeIconSun)  themeIconSun.style.display  = 'none';
  }
}

// Set correct icon on page load
applyTheme(document.documentElement.getAttribute('data-theme') === 'dark');

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = !isDark;
    applyTheme(next);
    localStorage.setItem('cv_theme', next ? 'dark' : 'light');
  });
}

// Sync if the user changes their OS preference while on the page
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem('cv_theme')) applyTheme(e.matches);
});

// ---- NAVBAR SCROLL ----
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
    document.getElementById('backToTop')?.classList.toggle('visible', window.scrollY > 300);
  });
}

// ---- HAMBURGER ----
const hamburger = document.getElementById('hamburger');
const navMenu   = document.getElementById('navMenu');
const navOverlay = document.getElementById('navOverlay');

function openMenu() {
  hamburger.classList.add('open');
  navMenu.classList.add('open');
  navOverlay.classList.add('visible');
  hamburger.setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  hamburger.classList.remove('open');
  navMenu.classList.remove('open');
  navOverlay.classList.remove('visible');
  hamburger.setAttribute('aria-expanded', 'false');
}

if (hamburger && navMenu) {
  hamburger.setAttribute('aria-label', 'Toggle navigation');
  hamburger.setAttribute('aria-expanded', 'false');

  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    hamburger.classList.contains('open') ? closeMenu() : openMenu();
  });

  // Close when any dropdown link is clicked
  navMenu.querySelectorAll('.drop-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close when overlay (anywhere outside) is clicked
  navOverlay?.addEventListener('click', closeMenu);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hamburger && navMenu) closeMenu();
  });
}

// ---- ACTIVE NAV LINK ON SCROLL ----
const sections = document.querySelectorAll('section[id]');
const dropLinks = document.querySelectorAll('.drop-link');
function setActiveNav() {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 100) current = sec.getAttribute('id');
  });
  dropLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + current) link.classList.add('active');
  });
}
window.addEventListener('scroll', setActiveNav);

// ---- BACK TO TOP ----
document.getElementById('backToTop')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ---- TYPING EFFECT ----
const roles = [
  'Network Engineer',
  'Web Developer',
  'Graphic Designer',
  'Java Programmer',
  'OS Enthusiast',
  'Tech Innovator'
];
let roleIdx = 0, charIdx = 0, deleting = false;
const roleText = document.getElementById('roleText');

function typeRole() {
  const current = roles[roleIdx];
  if (!deleting) {
    if (roleText) roleText.textContent = current.substring(0, charIdx + 1);
    charIdx++;
    if (charIdx === current.length) {
      deleting = true;
      setTimeout(typeRole, 1600);
      return;
    }
  } else {
    if (roleText) roleText.textContent = current.substring(0, charIdx - 1);
    charIdx--;
    if (charIdx === 0) {
      deleting = false;
      roleIdx = (roleIdx + 1) % roles.length;
    }
  }
  setTimeout(typeRole, deleting ? 60 : 90);
}
// Only run typeRole if the element exists (not on admin pages)
if (roleText) typeRole();

// ---- SKILL BARS ANIMATION ----
const skillBars = document.querySelectorAll('.skill-bar');
const animateBars = (entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const fill = entry.target.querySelector('.skill-fill');
      const width = entry.target.getAttribute('data-width');
      if (fill && width) {
        setTimeout(() => { fill.style.width = width + '%'; }, 200);
      }
      observer.unobserve(entry.target);
    }
  });
};
if ('IntersectionObserver' in window) {
  const barObserver = new IntersectionObserver(animateBars, { threshold: 0.3 });
  skillBars.forEach(bar => barObserver.observe(bar));
}

// ---- AOS (Animate On Scroll) ----
const aosElements = document.querySelectorAll('[data-aos]');
const aosObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      const delay = entry.target.getAttribute('data-delay') || 0;
      setTimeout(() => entry.target.classList.add('aos-animate'), parseInt(delay));
      aosObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
aosElements.forEach(el => aosObserver.observe(el));

// ---- CONTACT FORM (handled by EmailJS script in index.html) ----

// ---- FOOTER YEAR ----
const footerYear = document.getElementById('footerYear');
if (footerYear) footerYear.textContent = new Date().getFullYear();

// ---- SMOOTH SCROLL for anchor links ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
