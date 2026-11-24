/**
 * routes/email.js — Nodemailer send helpers
 * Called internally from messages.js (not a public route)
 */

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host:   process.env.MAIL_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.MAIL_PORT || '465'),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
  return transporter;
}

/**
 * Send notification email to Raymond when someone contacts him
 */
async function sendNotification({ name, email, subject, body }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS ||
      process.env.MAIL_PASS === 'your_gmail_app_password_here') {
    console.warn('⚠  Email not configured — skipping notification.');
    return false;
  }
  try {
    await getTransporter().sendMail({
      from:    process.env.MAIL_FROM || process.env.MAIL_USER,
      to:      process.env.MAIL_USER,
      replyTo: email,
      subject: `📩 New CV Message: ${subject}`,
      html: `
        <div style="font-family:Poppins,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:linear-gradient(135deg,#1a73e8,#0d9488);padding:2rem;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:1.4rem;">📬 New Message on Your CV</h1>
          </div>
          <div style="padding:2rem;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:.5rem 0;color:#64748b;font-size:.85rem;width:80px;"><strong>From</strong></td>
                  <td style="padding:.5rem 0;color:#0f172a;font-size:.85rem;">${esc(name)} &lt;${esc(email)}&gt;</td></tr>
              <tr><td style="padding:.5rem 0;color:#64748b;font-size:.85rem;"><strong>Subject</strong></td>
                  <td style="padding:.5rem 0;color:#0f172a;font-size:.85rem;">${esc(subject)}</td></tr>
            </table>
            <div style="margin-top:1.5rem;padding:1.2rem;background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
              <p style="color:#334155;font-size:.9rem;line-height:1.75;margin:0;white-space:pre-wrap;">${esc(body)}</p>
            </div>
            <p style="margin-top:1.5rem;color:#64748b;font-size:.8rem;">
              Hit <strong>Reply</strong> in your email client to respond directly to ${esc(name)}.
            </p>
          </div>
          <div style="padding:1rem 2rem;background:#0f172a;text-align:center;">
            <p style="color:rgba(255,255,255,.5);font-size:.75rem;margin:0;">Raymond Okinyi Digital CV · Nairobi, Kenya</p>
          </div>
        </div>`,
    });
    return true;
  } catch (err) {
    console.error('Notification email error:', err.message);
    return false;
  }
}

/**
 * Send auto-reply to the person who contacted Raymond
 */
async function sendAutoReply({ name, email, subject, body }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS ||
      process.env.MAIL_PASS === 'your_gmail_app_password_here') return false;
  try {
    await getTransporter().sendMail({
      from:    process.env.MAIL_FROM || process.env.MAIL_USER,
      to:      `${name} <${email}>`,
      subject: `Re: ${subject} — Thanks for reaching out!`,
      html: `
        <div style="font-family:Poppins,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:linear-gradient(135deg,#1a73e8,#0d9488);padding:2rem;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:1.4rem;">Thanks for reaching out! ✉️</h1>
          </div>
          <div style="padding:2rem;">
            <p style="color:#334155;font-size:.92rem;line-height:1.75;">Hi <strong>${esc(name)}</strong>,</p>
            <p style="color:#334155;font-size:.92rem;line-height:1.75;">
              Thank you for contacting me through my CV. I have received your message
              and will get back to you as soon as possible — usually within 24 hours.
            </p>
            <div style="margin:1.5rem 0;padding:1.2rem;background:#e8f0fe;border-radius:8px;border-left:4px solid #1a73e8;">
              <p style="color:#1557b0;font-size:.82rem;margin:0 0 .4rem 0;font-weight:700;">Your message:</p>
              <p style="color:#334155;font-size:.85rem;margin:0;white-space:pre-wrap;">${esc(body)}</p>
            </div>
            <p style="color:#64748b;font-size:.85rem;line-height:1.75;">
              Best regards,<br/>
              <strong style="color:#0f172a;">Raymond Okinyi</strong><br/>
              Diploma in Computer Science | NYS Engineering Institute, Nairobi<br/>
              📧 raymondopiyo67@gmail.com &nbsp;|&nbsp; 📞 0795058238
            </p>
          </div>
          <div style="padding:1rem 2rem;background:#0f172a;text-align:center;">
            <p style="color:rgba(255,255,255,.5);font-size:.75rem;margin:0;">Raymond Okinyi Digital CV · Nairobi, Kenya</p>
          </div>
        </div>`,
    });
    return true;
  } catch (err) {
    console.error('Auto-reply email error:', err.message);
    return false;
  }
}

/**
 * Send a reply FROM Raymond TO a visitor (admin sends reply)
 */
async function sendReply({ toName, toEmail, originalSubject, replyBody }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS ||
      process.env.MAIL_PASS === 'your_gmail_app_password_here') return false;
  try {
    await getTransporter().sendMail({
      from:    process.env.MAIL_FROM || process.env.MAIL_USER,
      to:      `${toName} <${toEmail}>`,
      subject: `Re: ${originalSubject}`,
      html: `
        <div style="font-family:Poppins,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
          <div style="background:linear-gradient(135deg,#1a73e8,#0d9488);padding:1.5rem 2rem;">
            <h1 style="color:#fff;margin:0;font-size:1.2rem;">Message from Raymond Okinyi</h1>
          </div>
          <div style="padding:2rem;">
            <p style="color:#334155;font-size:.92rem;line-height:1.75;">Hi <strong>${esc(toName)}</strong>,</p>
            <div style="white-space:pre-wrap;color:#334155;font-size:.9rem;line-height:1.75;">${esc(replyBody)}</div>
            <hr style="margin:1.5rem 0;border:none;border-top:1px solid #e2e8f0;"/>
            <p style="color:#64748b;font-size:.82rem;margin:0;">
              <strong style="color:#0f172a;">Raymond Okinyi</strong><br/>
              Diploma in Computer Science | NYS Engineering Institute, Nairobi<br/>
              📧 raymondopiyo67@gmail.com &nbsp;|&nbsp; 📞 0795058238
            </p>
          </div>
        </div>`,
    });
    return true;
  } catch (err) {
    console.error('Reply email error:', err.message);
    return false;
  }
}

/** Simple HTML escaping */
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

module.exports = { sendNotification, sendAutoReply, sendReply };
