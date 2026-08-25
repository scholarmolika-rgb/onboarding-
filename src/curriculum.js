const TEMPLATE = [
  { day: 1, category: 'Foundation', title: 'Company & team orientation', description: 'Meet your manager and team; review the org chart and communication norms.' },
  { day: 2, category: 'Foundation', title: 'Mission, values & product overview', description: 'Read the company handbook and product overview docs.' },
  { day: 3, category: 'Foundation', title: 'Set up your workspace & tools', description: 'Confirm access to core tools (email, chat, docs, ticketing).' },
  { day: 4, category: 'Foundation', title: 'Review key business metrics & KPIs', description: 'Learn how the business measures success and where the numbers live.' },
  { day: 5, category: 'Foundation', title: 'Foundation check-in with manager', description: 'Recap week 1 learnings and open questions with your manager.' },

  { day: 6, category: 'Tools', title: 'Data & analytics tooling overview', description: 'Get access to BI tools, dashboards, and the data warehouse.' },
  { day: 7, category: 'Tools', title: 'SQL & querying fundamentals refresher', description: 'Practice writing queries against sample datasets.' },
  { day: 8, category: 'Tools', title: 'Spreadsheet & reporting conventions', description: 'Learn team conventions for spreadsheets and reporting templates.' },
  { day: 9, category: 'Tools', title: 'Version control & documentation practices', description: 'Learn how the team tracks analysis and documents findings.' },
  { day: 10, category: 'Tools', title: 'Tools check-in', description: 'Demo a query or report you built this week.' },

  { day: 11, category: 'Analysis', title: 'Shadow an existing analysis', description: "Review a past analyst project end-to-end." },
  { day: 12, category: 'Analysis', title: 'Practice dataset deep-dive', description: 'Explore a real or sample dataset and note initial observations.' },
  { day: 13, category: 'Analysis', title: 'Framing a business question', description: 'Practice turning a stakeholder ask into an analysis plan.' },
  { day: 14, category: 'Analysis', title: 'Build a first mini-analysis', description: 'Produce a small analysis with findings and a recommendation.' },
  { day: 15, category: 'Analysis', title: 'Analysis check-in with manager', description: 'Present your mini-analysis for feedback.' },

  { day: 16, category: 'Communication', title: 'Stakeholder communication norms', description: 'Learn how findings are shared - meetings, docs, chat.' },
  { day: 17, category: 'Communication', title: 'Data storytelling basics', description: 'Study examples of clear, well-structured analysis writeups.' },
  { day: 18, category: 'Communication', title: 'Present findings to a peer', description: 'Practice presenting your mini-analysis to a teammate.' },
  { day: 19, category: 'Communication', title: 'Handling questions & pushback', description: 'Learn how to defend and refine an analysis under scrutiny.' },
  { day: 20, category: 'Communication', title: 'Communication check-in', description: 'Get feedback on a written summary you produced.' },

  { day: 21, category: 'Shadow', title: 'Shadow a live stakeholder meeting', description: 'Observe how analysts engage with stakeholders.' },
  { day: 22, category: 'Shadow', title: 'Shadow a full analysis cycle', description: "Follow a teammate's project from request to delivery." },
  { day: 23, category: 'Shadow', title: 'Contribute to a live project', description: 'Take on a small piece of an active analysis.' },
  { day: 24, category: 'Shadow', title: 'Pair on a real ticket', description: 'Work alongside a senior analyst on an active request.' },
  { day: 25, category: 'Shadow', title: 'Shadow check-in', description: 'Reflect on what you observed and contributed this week.' },

  { day: 26, category: 'Capstone', title: 'Capstone kickoff', description: 'Scope an independent analysis project with your manager.' },
  { day: 27, category: 'Capstone', title: 'Capstone: data gathering & exploration', description: 'Pull and validate the data for your capstone.' },
  { day: 28, category: 'Capstone', title: 'Capstone: analysis & synthesis', description: 'Build out findings and recommendations.' },
  { day: 29, category: 'Capstone', title: 'Capstone: prepare presentation', description: 'Polish your writeup and prepare to present.' },
  { day: 30, category: 'Capstone', title: 'Capstone presentation & 30-day wrap-up', description: 'Present your capstone project and review your first 30 days.' }
];

function buildProgress() {
  return TEMPLATE.map((t) => ({ day: t.day, done: false, reflection: '' }));
}

function categories() {
  return [...new Set(TEMPLATE.map((t) => t.category))];
}

function currentDayFor(startDate) {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;
  const today = new Date();
  const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.floor((todayUTC - startUTC) / 86400000) + 1;
  return Math.min(Math.max(diffDays, 1), TEMPLATE.length);
}

module.exports = { TEMPLATE, buildProgress, categories, currentDayFor };
