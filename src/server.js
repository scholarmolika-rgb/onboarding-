const express = require('express');
const path = require('path');
const store = require('./store');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/employees', (req, res) => {
  res.json(store.list());
});

app.get('/api/employees/:id', (req, res) => {
  const employee = store.get(req.params.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  res.json(employee);
});

app.post('/api/employees', (req, res) => {
  const { name, role, department, startDate } = req.body || {};
  if (!name || !role || !department || !startDate) {
    return res.status(400).json({ error: 'name, role, department, and startDate are required' });
  }
  const employee = store.create({ name, role, department, startDate });
  res.status(201).json(employee);
});

app.delete('/api/employees/:id', (req, res) => {
  const removed = store.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Employee not found' });
  res.status(204).end();
});

app.patch('/api/employees/:id/tasks/:taskId', (req, res) => {
  const { done } = req.body || {};
  const employee = store.setTaskDone(req.params.id, req.params.taskId, done);
  if (!employee) return res.status(404).json({ error: 'Employee or task not found' });
  res.json(employee);
});

app.listen(PORT, () => {
  console.log(`HR onboarding app running at http://localhost:${PORT}`);
});
