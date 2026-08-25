# HR Onboarding

A small web app for tracking new-hire onboarding. Add a new employee, and they
get a standard onboarding checklist (paperwork, IT setup, people, training,
performance goals) that you can check off as they progress. Each employee also
gets a dedicated onboarding agent - a Claude-powered assistant that can answer
questions about their onboarding and update their checklist for you.

## Run it

```bash
npm install
npm start
```

Then open http://localhost:3000

## Onboarding agent

The "Onboarding Assistant" chat panel in each employee's detail view is
powered by the Claude API. To enable it, set an API key before starting the
server:

```bash
export ANTHROPIC_API_KEY=your-api-key
npm start
```

Without a key, the rest of the app works normally but the chat panel returns
a "not configured" error. Each employee has their own agent context (name,
role, department, start date) and conversation history, scoped to that
employee for the lifetime of the server process. The agent has tools to view
the checklist, check items off, and add role-specific tasks - it can act on
the checklist directly instead of just describing what to do.

## Notes

- Data is stored in `data/employees.json` (no external database required).
- API: `GET/POST /api/employees`, `GET/DELETE /api/employees/:id`,
  `PATCH /api/employees/:id/tasks/:taskId`,
  `POST /api/employees/:id/agent/message`, `POST /api/employees/:id/agent/reset`.
