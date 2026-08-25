const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const store = require('./store');
const agent = require('./agent');

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

app.post('/api/employees/:id/agent/message', async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
  }
  try {
    const result = await agent.chat(req.params.id, message);
    res.json(result);
  } catch (err) {
    if (err.statusCode === 404) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(502).json({ error: 'Invalid Anthropic API key' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Rate limited by Anthropic API, try again shortly' });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Anthropic API error: ${err.message}` });
    }
    console.error(err);
    res.status(500).json({ error: 'Unexpected error talking to the onboarding agent' });
  }
});

app.post('/api/employees/:id/agent/reset', (req, res) => {
  agent.reset(req.params.id);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`HR onboarding app running at http://localhost:${PORT}`);
});
