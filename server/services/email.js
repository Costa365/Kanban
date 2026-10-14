function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

function configuration() {
  const provider = process.env.EMAIL_PROVIDER || 'brevo';
  const appUrl = new URL(process.env.APP_URL || 'http://localhost:4200');
  if (!['http:', 'https:'].includes(appUrl.protocol) || appUrl.username || appUrl.password ||
      appUrl.search || appUrl.hash || appUrl.pathname !== '/') {
    throw new Error('APP_URL must be the public application origin, without a path or credentials');
  }
  if (process.env.NODE_ENV === 'production' &&
      (!process.env.APP_URL || appUrl.protocol !== 'https:' || provider === 'console')) {
    throw new Error('Production email requires an HTTPS APP_URL and EMAIL_PROVIDER=brevo');
  }
  if (provider !== 'brevo' && provider !== 'console') throw new Error('Unsupported EMAIL_PROVIDER');
  if (provider === 'brevo' && (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM)) {
    throw new Error('Set BREVO_API_KEY and EMAIL_FROM to enable account emails');
  }
  return { provider, origin: appUrl.origin };
}

async function sendAccountEmail(email, purpose, token) {
  const { provider, origin } = configuration();
  const verify = purpose === 'verification';
  // Fragments stay out of HTTP access logs and Referer headers.
  const link = `${origin}/${verify ? 'verify-email' : 'reset-password'}#token=${token}`;
  const subject = verify ? 'Verify your Kanban email' : 'Reset your Kanban password';
  const textContent = verify
    ? `Complete your Kanban signup by opening this link and confirming your email:\n\n${link}\n\nThis link expires in 24 hours and can only be used once. If you did not request this, ignore this email.`
    : `Open this link to choose a new Kanban password:\n\n${link}\n\nThis link expires in 1 hour and can only be used once. If you did not request this, ignore this email. Your password will remain unchanged.`;
  const action = verify ? 'Verify email' : 'Reset password';
  const intro = verify
    ? 'Confirm your email address to finish creating your Kanban account.'
    : 'Choose a new password for your Kanban account.';
  const safeLink = escapeHtml(link);
  const htmlContent = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif;color:#1f2937;">
  <div style="max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border-radius:12px;">
    <h1 style="margin:0 0 20px;font-size:24px;">${subject}</h1>
    <p style="line-height:1.6;">${intro}</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
      <tr><td style="background:#2563eb;border-radius:6px;">
        <a href="${safeLink}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:bold;">${action}</a>
      </td></tr>
    </table>
    <p style="line-height:1.6;">This link expires in ${verify ? '24 hours' : '1 hour'} and can only be used once.</p>
    <p style="font-size:14px;line-height:1.6;">You can also open this link:</p>
    <p style="font-size:14px;line-height:1.6;overflow-wrap:anywhere;word-break:break-all;"><a href="${safeLink}" style="color:#2563eb;">${safeLink}</a></p>
    <p style="margin-top:24px;color:#6b7280;font-size:13px;line-height:1.6;">If you did not request this, ignore this email.${verify ? '' : ' Your password will remain unchanged.'}</p>
  </div>
</body>
</html>`;
  if (provider === 'console') {
    console.log(`[Development email] To: ${email}\n${subject}\n${textContent}`);
    return;
  }
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: process.env.EMAIL_FROM, name: process.env.EMAIL_FROM_NAME || 'Kanban' },
      to: [{ email }], subject, htmlContent, textContent,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Email provider returned status ${response.status}`);
}

module.exports = { sendAccountEmail, validateConfiguration: configuration };
