const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const { randomBytes } = require('node:crypto');
const taskRoutes = require('../routes/tasks');

let client, db, server, base;
const ownerId = new ObjectId();
const userId = ownerId.toString();

before(async () => {
  if (!process.env.TEST_MONGODB_URI) throw new Error('Set TEST_MONGODB_URI to a disposable MongoDB instance');
  client = new MongoClient(process.env.TEST_MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  db = client.db('kanban_tasks_test_' + randomBytes(8).toString('hex'));
  await taskRoutes.init(db);
  await db.collection('users').insertOne({ _id: ownerId, email: 'tasks@example.test' });
  const app = express();
  app.use(express.json());
  // Authentication is covered separately; exercise the real task routes and database.
  app.use('/api', (req, res, next) => { req.user = { id: userId }; next(); }, taskRoutes);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port + '/api';
});

beforeEach(async () => {
  await db.collection('tasks').deleteMany({});
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (db) await db.dropDatabase();
  if (client) await client.close();
});

async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal(response.status, 200);
  return response.json();
}

test('new tasks remain first after reload, preserving the existing column order', async () => {
  await db.collection('tasks').insertMany([
    { userId, title: 'First', state: 'To Do', position: 1, date: new Date('2020-01-01') },
    { userId, title: 'Second', state: 'To Do', position: 2, date: new Date('2025-01-01') },
    { userId, title: 'Done', state: 'Done', position: -100 },
    { userId: new ObjectId().toString(), title: 'Other owner', state: 'To Do', position: -200 },
  ]);
  const created = await request('/task', 'POST', { title: 'New', state: 'To Do', position: 99 });
  assert.equal(created.position, 0);
  await request('/task', 'POST', { title: 'Newest', state: 'To Do' });
  const tasks = await request('/tasks');
  assert.deepEqual(tasks.filter((task) => task.state === 'To Do').map((task) => task.title),
    ['Newest', 'New', 'First', 'Second']);
  assert.ok(tasks.every((task) => task.userId === userId));
});

test('a new task starts at position one when To Do is empty', async () => {
  const created = await request('/task', 'POST', { title: 'First', state: 'To Do' });
  assert.equal(created.position, 1);
});

test('saved positions take precedence over creation dates after moving a task', async () => {
  const older = await request('/task', 'POST', { title: 'Older', state: 'To Do' });
  const newer = await request('/task', 'POST', { title: 'Newer', state: 'To Do' });
  await request('/task/' + newer._id, 'PUT', { state: 'Done', position: 2 });
  await request('/task/' + older._id, 'PUT', { state: 'Done', position: 1 });
  const tasks = await request('/tasks');
  assert.deepEqual(tasks.filter((task) => task.state === 'Done').map((task) => task.title), ['Older', 'Newer']);
});
