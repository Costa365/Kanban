const express = require('express');
const tasks = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const auth = require('./middleware/auth');
const { validateConfiguration } = require('./services/email');

const port = process.env.PORT || 3000;
const app = express();

validateConfiguration();
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('Production requires a JWT_SECRET of at least 32 characters');
}
// Set only to the number of trusted reverse proxies in front of Express.
if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

// CORS for local development (nginx handles this in Docker)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Task routes (protected)
app.use('/api', auth, tasks);

tasks.connectDB().then(async (db) => {
  await authRoutes.init(db);
  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
}).catch((err) => {
  console.error('Server startup failed:', err.message);
  process.exitCode = 1;
});
