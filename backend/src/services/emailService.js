const { Resend } = require('resend');

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is required to send password reset emails');
  }
  return new Resend(apiKey);
}

function getEmailFrom() {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error('EMAIL_FROM is required to send password reset emails');
  }
  return from;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const resend = getResendClient();
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(resetUrl);

  return resend.emails.send({
    from: getEmailFrom(),
    to,
    subject: 'Reset your Curate password',
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #18181b; line-height: 1.6;">
        <h1 style="font-size: 22px; margin-bottom: 12px;">Reset your Curate password</h1>
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your Curate password. This link expires in 30 minutes.</p>
        <p style="margin: 24px 0;">
          <a href="${safeUrl}" style="background: #18181b; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 700;">
            Reset password
          </a>
        </p>
        <p>If the button does not work, copy and paste this link into your browser:</p>
        <p><a href="${safeUrl}">${safeUrl}</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
    text: `Hi ${name || 'there'},

We received a request to reset your Curate password. This link expires in 30 minutes:

${resetUrl}

If you did not request this, you can safely ignore this email.`,
  });
}

module.exports = { sendPasswordResetEmail };
