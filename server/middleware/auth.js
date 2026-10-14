const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
let db;

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let payload;
  try {
    payload = jwt.verify(header.slice(7), secret, { algorithms: ['HS256'] });
    if (!ObjectId.isValid(payload.id)) throw new Error('Invalid user');
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
  try {
    const user = await db.collection('users').findOne({ _id: new ObjectId(payload.id) });
    // Failed cleanup can be retried, but a closing account cannot access its board.
    const retryingClosure = req.baseUrl === '/api/auth' && req.path === '/account' && req.method === 'DELETE';
    if (!user || !user.emailVerified || (user.accountClosing && !retryingClosure) ||
        (payload.version || 0) !== (user.sessionVersion || 0)) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    req.user = { id: user._id.toString(), email: user.email, version: user.sessionVersion || 0 };
    next();
  } catch (err) {
    return res.status(503).json({ error: 'Account service is unavailable. Please try again.' });
  }
}

module.exports = auth;
module.exports.secret = secret;
module.exports.init = (database) => { db = database; };
