const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(mongoUri);
let db;

async function connectDB() {
  await client.connect();
  db = client.db('tasklist');
  await col().createIndex({ userId: 1, date: -1, position: 1 });
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  console.log('Connected to MongoDB');
  return db;
}

function col() {
  return db.collection('tasks');
}

// Get all tasks
router.get('/tasks', async (req, res) => {
  try {
    const userId = req.user.id;

    // One-time migration: assign orphaned tasks to the first user who logs in
    const orphaned = await col().countDocuments({ userId: { $exists: false } });
    if (orphaned > 0) {
      await col().updateMany({ userId: { $exists: false } }, { $set: { userId } });
    }

    const tasks = await col().find({ userId }).sort({ date: -1, position: 1 }).toArray();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create task
router.post('/task', async (req, res) => {
  const { _id, ...task } = req.body;
  if (!task.title || task.state !== 'To Do') {
    return res.status(400).json({ error: 'Bad Data' });
  }
  try {
    const userId = req.user.id;
    task.userId = userId;
    const count = await col().countDocuments({ userId });
    if (count > 0) {
      const [last] = await col().find({ userId }).sort({ position: -1 }).limit(1).toArray();
      task.position = parseInt(last.position, 10) + 1;
    } else {
      task.position = 1;
    }
    task.date = new Date();
    const result = await col().insertOne(task);
    res.json({ ...task, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task
router.put('/task/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }
  try {
    const { _id, userId: _u, ...taskData } = req.body;
    const result = await col().updateOne(
      { _id: new ObjectId(req.params.id), userId: req.user.id },
      { $set: taskData },
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
router.delete('/task/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }
  try {
    const result = await col().deleteOne({ _id: new ObjectId(req.params.id), userId: req.user.id });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.connectDB = connectDB;
