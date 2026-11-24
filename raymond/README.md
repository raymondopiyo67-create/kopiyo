# Raymond Okinyi — Professional Digital CV

A fully responsive digital CV with a Node.js + Express backend, SQLite database,
Nodemailer email delivery, JWT authentication, and a full admin panel.

---

## Project Structure

```
raymond/
├── client/                     ← Frontend (HTML, CSS, JS)
│   ├── index.html              ← Public CV homepage
│   ├── 404.html                ← Branded 404 page
│   ├── robots.txt
│   ├── css/
│   │   ├── style.css           ← Public CV styles
│   │   └── admin.css           ← Admin panel styles
│   ├── js/
│   │   ├── main.js             ← CV page scripts
│   │   ├── api.js              ← Smart API client (backend + localStorage fallback)
│   │   └── admin.js            ← Admin panel scripts
│   ├── images/
│   │   ├── raymond-profile.jpeg
│   │   └── raymond-nys-uniform.jpeg
│   ├── admin/                  ← Admin panel pages
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── messages.html
│   │   ├── profile.html
│   │   ├── skills.html
│   │   ├── security.html
│   │   ├── maintenance.html
│   │   ├── email-setup.html
│   │   └── print-cv.html
│   └── pages/
│       └── download-cv.html
├── server/                     ← Backend (Node.js + Express)
│   ├── index.js                ← Express app entry point
│   ├── db.js                   ← SQLite setup + seeding
│   ├── package.json
│   ├── .env                    ← Secrets (gitignored — never commit)
│   ├── .env.example            ← Template for setting up .env
│   ├── middleware/
│   │   └── auth.js             ← JWT guard middleware
│   └── routes/
│       ├── auth.js             ← Login, password change, activity logs
│       ├── messages.js         ← Contact form + admin message management
│       ├── profile.js          ← CV profile data
│       ├── skills.js           ← CV skills data
│       └── email.js            ← Nodemailer helpers
├── .gitignore
├── render.yaml                 ← One-click Render deployment config
└── README.md
```

---

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript         |
| Backend   | Node.js + Express                       |
| Database  | SQLite (better-sqlite3)                 |
| Auth      | JWT (jsonwebtoken) + bcrypt             |
| Email     | Nodemailer (Gmail SMTP)                 |
| Security  | helmet, cors, express-rate-limit        |

---

## Quick Start (Local)

### 1. Install Node.js
Download LTS from https://nodejs.org and install.

### 2. Install backend dependencies
```bash
cd server
npm install
```

### 3. Configure environment
```bash
# Copy the template
cp server/.env.example server/.env
```
Then edit `server/.env` and fill in your values (see the file for instructions).

### 4. Start the server
```bash
cd server
npm start
```

Open **http://localhost:3000** — the server serves the entire frontend from `client/`.

### 5. Admin panel
Go to **http://localhost:3000/admin/login.html**

| Field    | Value (from your .env) |
|----------|------------------------|
| Username | `raymond`              |
| Password | value of `ADMIN_PASSWORD` |

---

## API Reference

All admin endpoints require `Authorization: Bearer <token>` header.

| Method | Endpoint                     | Auth | Description              |
|--------|------------------------------|------|--------------------------|
| POST   | `/api/auth/login`            | —    | Login → returns JWT      |
| POST   | `/api/auth/change-password`  | ✓    | Change admin password    |
| GET    | `/api/auth/logs`             | ✓    | Activity logs            |
| POST   | `/api/auth/logs`             | ✓    | Write activity log       |
| GET    | `/api/profile`               | —    | Get CV profile (public)  |
| PUT    | `/api/profile`               | ✓    | Update CV profile        |
| GET    | `/api/skills`                | —    | Get skills (public)      |
| PUT    | `/api/skills`                | ✓    | Update skills            |
| POST   | `/api/messages`              | —    | Submit contact form      |
| GET    | `/api/messages`              | ✓    | List messages            |
| GET    | `/api/messages/stats`        | ✓    | Total + unread count     |
| PATCH  | `/api/messages/:id/read`     | ✓    | Mark as read             |
| POST   | `/api/messages/:id/reply`    | ✓    | Send reply email         |
| DELETE | `/api/messages/:id`          | ✓    | Delete one message       |
| DELETE | `/api/messages`              | ✓    | Delete all messages      |

---

## Deployment to Render (Free)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit — Raymond Okinyi Digital CV"
git remote add origin https://github.com/YOUR_USERNAME/raymond-cv.git
git branch -M main
git push -u origin main
```

### 2. Deploy on Render
1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Set:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
4. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = *(click Generate)*
   - `ADMIN_PASSWORD` = your chosen strong password
   - `MAIL_USER` = your Gmail address
   - `MAIL_PASS` = your Gmail App Password
   - `MAIL_FROM` = `Raymond Okinyi <your@gmail.com>`
   - `FRONTEND_ORIGIN` = your Render URL after deploy

5. Click **Deploy**

---

## Security Notes

- `server/.env` is gitignored — never commit it
- `server/data/` (SQLite database) is gitignored
- No passwords hardcoded in any committed file
- Rate limiting: 10 contact submissions/hour per IP, 10 login attempts/15 min
- All inputs validated and sanitised server-side
- JWT tokens expire after 8 hours

---

Built with ❤ in Nairobi, Kenya — Raymond Okinyi 2026
