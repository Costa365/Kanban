const { createHash } = require('node:crypto');
let db;

async function consume(key, maximum, windowMs) {
  const window = Math.floor(Date.now() / windowMs);
  const id = createHash('sha256').update(`${key}:${window}`).digest('hex');
  let record;
  try {
    record = await db.collection('auth_limits').findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * windowMs) } },
      { upsert: true, returnDocument: 'after', includeResultMetadata: false },
    );
  } catch (err) {
    if (err.code !== 11000) throw err;
    record = await db.collection('auth_limits').findOneAndUpdate(
      { _id: id }, { $inc: { count: 1 } }, { returnDocument: 'after', includeResultMetadata: false },
    );
  }
  return record.count <= maximum;
}

async function rateLimit(req, res, next) {
  try {
    if (!await consume(`ip:${req.ip}`, 50, 15 * 60 * 1000)) {
      res.set('Retry-After', '900');
      return res.status(429).json({ error: 'Too many attempts. Please try again in 15 minutes.' });
    }
    next();
  } catch (err) {
    return res.status(503).json({ error: 'Account service is unavailable. Please try again.' });
  }
}

module.exports = rateLimit;
module.exports.init = (database) => { db = database; };
module.exports.allowEmail = (email) => consume(`email:${email}`, 5, 60 * 60 * 1000);
