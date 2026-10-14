const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { sendAccountEmail, validateConfiguration } = require('../services/email');
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
after(() => { global.fetch = originalFetch; process.env = originalEnv; });

test('Brevo adapter sends correct API request and a fragment-based reset link', async () => {
  process.env.EMAIL_PROVIDER = 'brevo';
  process.env.BREVO_API_KEY = 'test-key';
  process.env.EMAIL_FROM = 'sender@example.test';
  process.env.APP_URL = 'https://kanban.example.test';
  process.env.NODE_ENV = 'test';
  let captured;
  global.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return new Response('{}', { status: 201 });
  };
  await sendAccountEmail('recipient@example.test', 'reset', 'a'.repeat(64));
  assert.equal(captured.url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(captured.options.headers['api-key'], 'test-key');
  assert.equal(captured.body.sender.email, 'sender@example.test');
  assert.deepEqual(captured.body.to, [{ email: 'recipient@example.test' }]);
  assert.match(captured.body.textContent, /https:\/\/kanban\.example\.test\/reset-password#token=a{64}/);
  const resetLink = `https://kanban.example.test/reset-password#token=${'a'.repeat(64)}`;
  assert.equal((captured.body.htmlContent.match(/<a href="([^"]+)"/g) || []).length, 2);
  assert.ok(captured.body.htmlContent.includes(`href="${resetLink}"`));
  assert.match(captured.body.htmlContent, />Reset password<\/a>/);
  assert.match(captured.body.htmlContent, /expires in 1 hour/);
  assert.ok(captured.options.signal);
  await sendAccountEmail('recipient@example.test', 'verification', 'b'.repeat(64));
  const verificationLink = `https://kanban.example.test/verify-email#token=${'b'.repeat(64)}`;
  assert.ok(captured.body.htmlContent.includes(`href="${verificationLink}"`));
  assert.match(captured.body.htmlContent, />Verify email<\/a>/);
  assert.match(captured.body.htmlContent, /expires in 24 hours/);
  assert.ok(captured.body.textContent.includes(verificationLink));
  global.fetch = async () => new Response('{}', { status: 429 });
  await assert.rejects(sendAccountEmail('recipient@example.test', 'reset', 'b'.repeat(64)), /429/);
});

test('production rejects console mail, missing credentials, insecure or ambiguous app origins', () => {
  process.env.NODE_ENV = 'production';
  process.env.EMAIL_PROVIDER = 'console';
  assert.throws(validateConfiguration, /Production/);
  process.env.EMAIL_PROVIDER = 'brevo';
  for (const url of ['http://kanban.example.test', 'https://example.test/path', 'https://example.test/?token=secret', 'https://u:p@example.test', 'javascript:bad']) {
    process.env.APP_URL = url;
    assert.throws(validateConfiguration);
  }
  process.env.APP_URL = 'https://kanban.example.test';
  delete process.env.BREVO_API_KEY;
  assert.throws(validateConfiguration, /BREVO_API_KEY/);
});
