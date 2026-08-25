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

## 30-day onboarding plan

Each employee's detail view also has a "30-Day Plan" tab: a day-by-day
curriculum (Foundation, Tools, Analysis, Communication, Shadow, Capstone)
with a progress bar, category filter chips, a jump-to-day grid, per-day
reflection notes, printable daily plans, and JSON export. The current day is
auto-derived from the employee's start date. An admin dashboard at
`/admin.html` lists every employee's current day and completion % in one
table, with links back into their individual plan.

## Notes

- Data is stored in `data/employees.json` (no external database required).
- API: `GET/POST /api/employees`, `GET/DELETE /api/employees/:id`,
  `PATCH /api/employees/:id/tasks/:taskId`,
  `GET /api/employees/:id/curriculum`, `PATCH /api/employees/:id/curriculum/:day`,
  `GET /api/admin/curriculum`,
  `POST /api/employees/:id/agent/message`, `POST /api/employees/:id/agent/reset`.
