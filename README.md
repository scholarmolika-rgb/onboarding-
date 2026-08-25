# HR Onboarding

A small web app for tracking new-hire onboarding. Add a new employee, and they
get a standard onboarding checklist (paperwork, IT setup, people, training,
performance goals) that you can check off as they progress.

## Run it

```bash
npm install
npm start
```

Then open http://localhost:3000

## Notes

- Data is stored in `data/employees.json` (no external database required).
- API: `GET/POST /api/employees`, `GET/DELETE /api/employees/:id`,
  `PATCH /api/employees/:id/tasks/:taskId`.
