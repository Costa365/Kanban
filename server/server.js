const express = require('express');
const tasks = require('./routes/tasks');
const authRoutes = require('./routes/auth');
const auth = require('./middleware/auth');

const port = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

tasks.connectDB().then((db) => {
  authRoutes.init(db);
  app.listen(port, () => {
    console.log(`Server started on port ${port}`);
  });
}).catch(console.error);
