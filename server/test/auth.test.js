const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const { randomBytes, createHash } = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.EMAIL_PROVIDER = 'brevo';
process.env.BREVO_API_KEY = 'test-key-no-real-email';
process.env.EMAIL_FROM = 'kanban@example.test';
process.env.APP_URL = 'https://kanban.example.test';
process.env.JWT_SECRET = 'integration-test-secret-at-least-32-characters';
process.env.NODE_ENV = 'test';

const authRoutes = require('../routes/auth');
const auth = require('../middleware/auth');
const networkFetch = global.fetch;
let client, db, server, base, failDelivery = false;
const emails = [];
const email = 'person@example.test';
const password = 'correct horse battery';

before(async () => {
  if (!process.env.TEST_MONGODB_URI) throw new Error('Set TEST_MONGODB_URI to a disposable MongoDB instance');
  client = new MongoClient(process.env.TEST_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  db = client.db('kanban_auth_test_' + randomBytes(8).toString('hex'));
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await authRoutes.init(db);
  global.fetch = async (url, options) => {
    if (url !== 'https://api.brevo.com/v3/smtp/email') return networkFetch(url, options);
    if (failDelivery) return new Response('{}', { status: 503 });
    emails.push(JSON.parse(options.body));
    return new Response('{"messageId":"test"}', { status: 201 });
  };
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.get('/api/tasks', auth, async (req, res) => {
    res.json(await db.collection('tasks').find({ userId: req.user.id }).toArray());
  });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});

beforeEach(async () => {
  emails.length = 0;
  failDelivery = false;
  await Promise.all(['users', 'tasks', 'auth_limits'].map((name) => db.collection(name).deleteMany({})));
});

after(async () => {
  global.fetch = networkFetch;
  if (server) await new Promise((resolve) => server.close(resolve));
  if (db) await db.dropDatabase();
  if (client) await client.close();
});

async function request(path, body, token, method = 'POST') {
  const response = await networkFetch(base + '/api/' + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body || {}) }),
  });
  return { status: response.status, body: await response.json(), retry: response.headers.get('retry-after') };
}
function tokenFromEmail(index = emails.length - 1) {
  const link = emails[index].textContent.match(/https:\/\/[^\s]+/)[0];
  assert.equal(new URL(link).origin, process.env.APP_URL);
  assert.equal(new URL(link).search, '');
  return new URLSearchParams(new URL(link).hash.slice(1)).get('token');
}
async function signup(address = email) {
  assert.equal((await request('auth/register', { email: address, password })).status, 202);
  return tokenFromEmail();
}
async function verified(address = email) {
  const token = await signup(address);
  assert.equal((await request('auth/verify-email', { token })).status, 200);
  const login = await request('auth/login', { email: address, password });
  assert.equal(login.status, 200);
  return login.body.token;
}

test('signup normalizes email, stores hashed token, blocks login until verification, and consumes link once', async () => {
  const token = await signup('  PERSON@example.test  ');
  const user = await db.collection('users').findOne({ email });
  assert.equal(user.emailVerified, false);
  assert.equal(user.verificationTokenHash, createHash('sha256').update(token).digest('hex'));
  assert.equal(await bcrypt.compare(password, user.password), true);
  assert.ok(user.verificationExpiresAt > new Date());
  assert.equal((await request('auth/login', { email, password })).status, 403);
  const forged = jwt.sign({ id: user._id.toString() }, auth.secret);
  assert.equal((await request('tasks', null, forged, 'GET')).status, 401);
  assert.equal((await request('auth/verify-email', { token })).status, 200);
  assert.equal((await request('auth/verify-email', { token })).status, 400);
  assert.equal((await request('auth/login', { email, password })).status, 200);
});

test('validation rejects non-string email/password and bcrypt truncation; existing shorter passwords still sign in', async () => {
  for (const body of [{ email: { $ne: null }, password }, { email, password: {} }, { email, password: 'short' },
    { email, password: 'a'.repeat(73) }, { email, password: '😀'.repeat(19) }]) {
    assert.equal((await request('auth/register', body)).status, 400);
  }
  await db.collection('users').insertOne({ email, password: await bcrypt.hash('sixsix', 10), emailVerified: true, sessionVersion: 0 });
  assert.equal((await request('auth/login', { email, password: 'sixsix' })).status, 200);
});

test('expired and malformed verification links fail; resend replaces old token and respects cooldown', async () => {
  const token = await signup();
  assert.equal((await request('auth/register', { email, password: 'different password' })).status, 429);
  await request('auth/resend-verification', { email });
  assert.equal(emails.length, 1);
  await db.collection('users').updateOne({ email }, { $set: {
    verificationExpiresAt: new Date(0), verificationSentAt: new Date(0),
  } });
  assert.equal((await request('auth/verify-email', { token })).status, 400);
  assert.equal((await request('auth/verify-email', { token: { $ne: null } })).status, 400);
  assert.equal((await request('auth/resend-verification', { email })).status, 202);
  assert.equal(emails.length, 2);
  assert.equal((await request('auth/verify-email', { token })).status, 400);
  assert.equal((await request('auth/verify-email', { token: tokenFromEmail() })).status, 200);
});

test('duplicate verified registration does not overwrite credentials or send mail', async () => {
  await verified();
  const count = emails.length;
  assert.equal((await request('auth/register', { email, password: 'replacement password' })).status, 202);
  assert.equal(emails.length, count);
  assert.equal((await request('auth/login', { email, password })).status, 200);
  assert.equal((await request('auth/login', { email, password: 'replacement password' })).status, 401);
});

test('reset has a generic response, expires, is single-use even concurrently, and revokes every old session', async () => {
  const session = await verified();
  const unknown = await request('auth/forgot-password', { email: 'unknown@example.test' });
  const known = await request('auth/forgot-password', { email });
  assert.deepEqual(known, unknown);
  const token = tokenFromEmail();
  assert.equal((await request('auth/reset-password', { token: 'a'.repeat(64), password: 'new password 123' })).status, 400);
  const resets = await Promise.all([1, 2].map(() => request('auth/reset-password', { token, password: 'new password 123' })));
  assert.deepEqual(resets.map((r) => r.status).sort(), [200, 400]);
  assert.equal((await request('tasks', null, session, 'GET')).status, 401);
  assert.equal((await request('auth/login', { email, password })).status, 401);
  assert.equal((await request('auth/login', { email, password: 'new password 123' })).status, 200);
  await db.collection('users').updateOne({ email }, { $set: { resetSentAt: new Date(0) } });
  await request('auth/forgot-password', { email });
  await db.collection('users').updateOne({ email }, { $set: { resetExpiresAt: new Date(0) } });
  assert.equal((await request('auth/reset-password', { token: tokenFromEmail(), password })).status, 400);
});

test('reset requests for unverified users send verification and cannot bypass signup', async () => {
  await signup();
  await db.collection('users').updateOne({ email }, { $set: { verificationSentAt: new Date(0) } });
  await request('auth/forgot-password', { email });
  assert.match(emails.at(-1).subject, /Verify/);
  assert.equal((await request('auth/reset-password', { token: tokenFromEmail(), password })).status, 400);
  assert.equal((await request('auth/login', { email, password })).status, 403);
});

test('password change checks current password, revokes other sessions and outstanding reset links, and keeps new session', async () => {
  const session = await verified();
  await request('auth/forgot-password', { email });
  const resetToken = tokenFromEmail();
  assert.equal((await request('auth/change-password', { currentPassword: 'wrong', newPassword: 'new password 123' }, session)).status, 400);
  assert.equal((await request('auth/change-password', { currentPassword: password, newPassword: password }, session)).status, 400);
  assert.equal((await request('auth/change-password', { currentPassword: password, newPassword: 'new password 123' })).status, 401);
  const changed = await request('auth/change-password', { currentPassword: password, newPassword: 'new password 123' }, session);
  assert.equal(changed.status, 200);
  assert.equal((await request('tasks', null, session, 'GET')).status, 401);
  assert.equal((await request('tasks', null, changed.body.token, 'GET')).status, 200);
  assert.equal((await request('auth/reset-password', { token: resetToken, password })).status, 400);
});

test('closure requires password and confirmation; deletes only owner tasks and revokes sessions', async () => {
  const session = await verified();
  const user = await db.collection('users').findOne({ email });
  const otherId = new ObjectId().toString();
  await db.collection('tasks').insertMany([{ userId: user._id.toString(), title: 'mine' }, { userId: otherId, title: 'theirs' }]);
  assert.equal((await request('auth/account', { password, confirmation: 'no' }, session, 'DELETE')).status, 400);
  assert.equal((await request('auth/account', { password: 'wrong', confirmation: 'DELETE' }, session, 'DELETE')).status, 400);
  assert.equal(await db.collection('tasks').countDocuments({}), 2);
  assert.equal((await request('auth/account', { password, confirmation: 'DELETE' }, session, 'DELETE')).status, 200);
  assert.equal(await db.collection('users').countDocuments({ email }), 0);
  assert.equal(await db.collection('tasks').countDocuments({ userId: user._id.toString() }), 0);
  assert.equal(await db.collection('tasks').countDocuments({ userId: otherId }), 1);
  assert.equal((await request('tasks', null, session, 'GET')).status, 401);
  assert.equal((await request('auth/login', { email, password })).status, 401);
});

test('closure interrupted after disabling account denies board access and can retry cleanup', async () => {
  const session = await verified();
  await db.collection('users').updateOne({ email }, { $set: { accountClosing: true } });
  assert.equal((await request('tasks', null, session, 'GET')).status, 401);
  assert.equal((await request('auth/login', { email, password })).status, 401);
  assert.equal((await request('auth/account', { password, confirmation: 'DELETE' }, session, 'DELETE')).status, 200);
});

test('email provider failures are actionable and permit retry without a usable failed token', async () => {
  failDelivery = true;
  assert.equal((await request('auth/register', { email, password })).status, 503);
  const user = await db.collection('users').findOne({ email });
  assert.equal(user.verificationTokenHash, undefined);
  assert.equal(user.verificationSentAt, undefined);
  failDelivery = false;
  assert.equal((await request('auth/resend-verification', { email })).status, 202);
  assert.equal(emails.length, 1);
});

test('legacy account migration preserves sign-in, old JWTs and tasks', async () => {
  const result = await db.collection('users').insertOne({ email, password: await bcrypt.hash(password, 10) });
  const session = jwt.sign({ id: result.insertedId.toString(), email }, auth.secret);
  await db.collection('tasks').insertOne({ userId: result.insertedId.toString(), title: 'legacy' });
  await authRoutes.init(db);
  assert.equal((await request('auth/login', { email, password })).status, 200);
  assert.equal((await request('tasks', null, session, 'GET')).body.length, 1);
});

test('database-backed rate limits enforce mailbox and IP caps', async () => {
  await signup();
  for (let i = 0; i < 6; i++) {
    await db.collection('users').updateOne({ email }, { $set: { verificationSentAt: new Date(0) } });
    await request('auth/resend-verification', { email });
  }
  assert.equal(emails.length, 5);
  await db.collection('auth_limits').deleteMany({});
  for (let i = 0; i < 50; i++) {
    assert.equal((await request('auth/forgot-password', { email: 'unknown@example.test' })).status, 202);
  }
  const limited = await request('auth/forgot-password', { email });
  assert.equal(limited.status, 429);
  assert.equal(limited.retry, '900');
});
