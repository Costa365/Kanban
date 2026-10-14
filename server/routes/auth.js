const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes, createHash } = require('node:crypto');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');
const rateLimit = require('../middleware/auth-rate-limit');
const { sendAccountEmail } = require('../services/email');
const router = express.Router();
let db;
let dummyPassword;

const verificationMessage = 'If this address can be registered, a verification email has been sent. Check your inbox and spam folder. If you already have an account, sign in.';
const resendMessage = 'If an account needs verification, an email has been sent. Check your inbox and spam folder.';
const recoveryMessage = 'If an account exists for this address, a password reset email has been sent. Check your inbox and spam folder.';
const users = () => db.collection('users');
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const validToken = (token) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
function emailAddress(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
function passwordError(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters';
  if (Buffer.byteLength(password, 'utf8') > 72) return 'Password must be at most 72 UTF-8 bytes';
  return null;
}
function session(user) {
  return { token: jwt.sign({ id: user._id.toString(), version: user.sessionVersion || 0 }, auth.secret,
    { algorithm: 'HS256', expiresIn: '7d' }), email: user.email };
}
function endpoint(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

// Claim a cooldown atomically so concurrent requests cannot flood the mailbox.
async function deliver(user, purpose, password) {
  if (!await rateLimit.allowEmail(user.email)) return false;
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const now = new Date();
  const prefix = purpose === 'verification' ? 'verification' : 'reset';
  const sentAt = prefix + 'SentAt';
  const filter = { _id: user._id, accountClosing: { $ne: true },
    emailVerified: purpose === 'verification' ? false : true,
    $or: [{ [sentAt]: { $exists: false } }, { [sentAt]: { $lte: new Date(Date.now() - 60000) } }] };
  const set = { [prefix + 'TokenHash']: tokenHash,
    [prefix + 'ExpiresAt']: new Date(Date.now() + (prefix === 'verification' ? 24 : 1) * 60 * 60 * 1000),
    [sentAt]: now };
  if (password) set.password = password;
  const result = await users().updateOne(filter, { $set: set });
  if (!result.modifiedCount) return false;
  try {
    await sendAccountEmail(user.email, purpose, token);
    return true;
  } catch (err) {
    // Do not leave a usable token behind after a failed send; permit a retry.
    await users().updateOne({ _id: user._id, [prefix + 'TokenHash']: tokenHash },
      { $unset: { [prefix + 'TokenHash']: '', [prefix + 'ExpiresAt']: '', [sentAt]: '' } });
    console.error('Account email delivery failed:', err.message);
    const failure = new Error('Email delivery is unavailable. Please try again later.');
    failure.status = 503;
    throw failure;
  }
}

router.use(rateLimit);
router.post('/register', endpoint(async (req, res) => {
  const email = emailAddress(req.body.email);
  const error = passwordError(req.body.password);
  if (!email || error) return res.status(400).json({ error: !email ? 'A valid email address is required' : error });
  const password = await bcrypt.hash(req.body.password, 12);
  let user = await users().findOne({ email });
  if (!user) {
    try {
      const result = await users().insertOne({ email, password, emailVerified: false, sessionVersion: 0, createdAt: new Date() });
      user = { _id: result.insertedId, email, emailVerified: false };
    } catch (err) {
      if (err.code !== 11000) throw err;
      user = await users().findOne({ email });
    }
  }
  if (user && !user.emailVerified && !user.accountClosing && !await deliver(user, 'verification', password)) {
    // Do not claim a new signup succeeded while its chosen password was never saved.
    res.set('Retry-After', '60');
    return res.status(429).json({ error: 'Signup email limit reached. Wait at least a minute, then try creating your account again.' });
  }
  res.status(202).json({ message: verificationMessage });
}));

router.post('/login', endpoint(async (req, res) => {
  const email = emailAddress(req.body.email);
  if (!email || typeof req.body.password !== 'string' || Buffer.byteLength(req.body.password, 'utf8') > 72) {
    return res.status(400).json({ error: 'A valid email and password are required' });
  }
  const user = await users().findOne({ email });
  // Compare even for unknown users, reducing account enumeration through timing.
  const valid = await bcrypt.compare(req.body.password, user?.password || dummyPassword);
  if (!user || !valid || user.accountClosing) return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.emailVerified) return res.status(403).json({ error: 'Verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' });
  res.json(session(user));
}));

router.post('/resend-verification', endpoint(async (req, res) => {
  const email = emailAddress(req.body.email);
  if (!email) return res.status(400).json({ error: 'A valid email address is required' });
  const user = await users().findOne({ email, emailVerified: false, accountClosing: { $ne: true } });
  if (user) await deliver(user, 'verification');
  res.status(202).json({ message: resendMessage });
}));

router.post('/verify-email', endpoint(async (req, res) => {
  if (!validToken(req.body.token)) return res.status(400).json({ error: 'This verification link is invalid or expired. Request a new one.' });
  const user = await users().findOneAndUpdate({ verificationTokenHash: hashToken(req.body.token),
    verificationExpiresAt: { $gt: new Date() }, emailVerified: false, accountClosing: { $ne: true } },
  { $set: { emailVerified: true, verifiedAt: new Date() },
    $unset: { verificationTokenHash: '', verificationExpiresAt: '' } },
  { returnDocument: 'after', includeResultMetadata: false });
  if (!user) return res.status(400).json({ error: 'This verification link is invalid or expired. Request a new one.' });
  res.json({ message: 'Your email is verified. You can now sign in.' });
}));

router.post('/forgot-password', endpoint(async (req, res) => {
  const email = emailAddress(req.body.email);
  if (!email) return res.status(400).json({ error: 'A valid email address is required' });
  const user = await users().findOne({ email, accountClosing: { $ne: true } });
  // Unverified users receive verification first; the reset never bypasses signup.
  if (user) await deliver(user, user.emailVerified ? 'reset' : 'verification');
  res.status(202).json({ message: recoveryMessage });
}));

router.post('/reset-password', endpoint(async (req, res) => {
  const error = passwordError(req.body.password);
  if (error) return res.status(400).json({ error });
  if (!validToken(req.body.token)) return res.status(400).json({ error: 'This reset link is invalid or expired. Request a new one.' });
  const password = await bcrypt.hash(req.body.password, 12);
  const result = await users().updateOne({ resetTokenHash: hashToken(req.body.token), resetExpiresAt: { $gt: new Date() },
    emailVerified: true, accountClosing: { $ne: true } },
  { $set: { password }, $inc: { sessionVersion: 1 }, $unset: { resetTokenHash: '', resetExpiresAt: '' } });
  if (!result.modifiedCount) return res.status(400).json({ error: 'This reset link is invalid or expired. Request a new one.' });
  res.json({ message: 'Your password has been reset. Sign in with your new password.' });
}));

router.post('/change-password', auth, endpoint(async (req, res) => {
  const error = passwordError(req.body.newPassword);
  if (error) return res.status(400).json({ error });
  const user = await users().findOne({ _id: new ObjectId(req.user.id) });
  if (typeof req.body.currentPassword !== 'string' || Buffer.byteLength(req.body.currentPassword, 'utf8') > 72 ||
      !user || !await bcrypt.compare(req.body.currentPassword, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (await bcrypt.compare(req.body.newPassword, user.password)) return res.status(400).json({ error: 'Choose a different new password' });
  const updated = await users().findOneAndUpdate({ _id: user._id, password: user.password,
    sessionVersion: req.user.version, accountClosing: { $ne: true } },
  { $set: { password: await bcrypt.hash(req.body.newPassword, 12) }, $inc: { sessionVersion: 1 },
    $unset: { resetTokenHash: '', resetExpiresAt: '' } },
  { returnDocument: 'after', includeResultMetadata: false });
  if (!updated) return res.status(409).json({ error: 'Account changed. Please sign in and try again.' });
  res.json({ ...session(updated), message: 'Password changed. Other sessions have been signed out.' });
}));

router.delete('/account', auth, endpoint(async (req, res) => {
  if (req.body.confirmation !== 'DELETE') return res.status(400).json({ error: 'Type DELETE to confirm account closure' });
  const user = await users().findOne({ _id: new ObjectId(req.user.id) });
  if (typeof req.body.password !== 'string' || Buffer.byteLength(req.body.password, 'utf8') > 72 ||
      !user || !await bcrypt.compare(req.body.password, user.password)) {
    return res.status(400).json({ error: 'Password is incorrect' });
  }
  const marked = await users().updateOne({ _id: user._id, password: user.password, sessionVersion: req.user.version },
    { $set: { accountClosing: true }, $unset: { resetTokenHash: '', resetExpiresAt: '', verificationTokenHash: '', verificationExpiresAt: '' } });
  if (!marked.matchedCount) return res.status(409).json({ error: 'Account changed. Please sign in and try again.' });
  // Disable access first. If the database fails, the same request can retry cleanup.
  await db.collection('tasks').deleteMany({ userId: req.user.id });
  await users().deleteOne({ _id: user._id, accountClosing: true });
  res.json({ message: 'Your account and all its tasks have been permanently deleted.' });
}));

router.use((err, req, res, next) => {
  console.error('Account request failed:', err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Account service is unavailable. Please try again.' });
});

module.exports = router;
module.exports.init = async (database) => {
  db = database;
  auth.init(db);
  rateLimit.init(db);
  dummyPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
  // Grandfather existing accounts; every newly inserted user has an explicit false.
  await users().updateMany({ emailVerified: { $exists: false } }, { $set: { emailVerified: true, sessionVersion: 0 } });
  await db.collection('auth_limits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await users().createIndex({ verificationTokenHash: 1 }, { sparse: true, unique: true });
  await users().createIndex({ resetTokenHash: 1 }, { sparse: true, unique: true });
};
