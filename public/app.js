const listEl = document.getElementById('employee-list');
const formEl = document.getElementById('new-hire-form');
const modalEl = document.getElementById('detail-modal');
const detailBodyEl = document.getElementById('detail-body');
const closeModalBtn = document.getElementById('close-modal');

async function fetchEmployees() {
  const res = await fetch('/api/employees');
  return res.json();
}

function progress(employee) {
  const total = employee.checklist.length;
  const done = employee.checklist.filter((t) => t.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

function renderList(employees) {
  listEl.innerHTML = '';
  if (employees.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No new hires yet. Add one to get started.</p>';
    return;
  }
  employees
    .slice()
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .forEach((employee) => {
      const { done, total, pct } = progress(employee);
      const card = document.createElement('div');
      card.className = 'employee-card';
      card.innerHTML = `
        <div class="info">
          <h3>${escapeHtml(employee.name)}</h3>
          <p>${escapeHtml(employee.role)} · ${escapeHtml(employee.department)} · starts ${employee.startDate}</p>
        </div>
        <div class="progress-wrap">
          <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
          <span class="progress-label">${done}/${total}</span>
        </div>
      `;
      card.addEventListener('click', () => openDetail(employee.id));
      listEl.appendChild(card);
    });
}

// Chat transcripts per employee, kept client-side only (server also keeps its
// own copy for the agent's context, but the UI doesn't re-fetch history).
const chatLogs = new Map();

// Curriculum state, per employee - cached data plus UI state that should
// survive a re-render but reset when a different employee is opened.
const curriculumCache = new Map();
const curriculumUiState = new Map(); // employeeId -> { filter, selectedDay }

let activeTab = 'checklist';
let currentEmployeeId = null;

function groupByCategory(checklist) {
  const groups = {};
  checklist.forEach((task) => {
    if (!groups[task.category]) groups[task.category] = [];
    groups[task.category].push(task);
  });
  return groups;
}

async function openDetail(id, options = {}) {
  const res = await fetch(`/api/employees/${id}`);
  if (!res.ok) return;
  const employee = await res.json();
  currentEmployeeId = String(id);
  activeTab = options.tab || 'checklist';
  renderDetail(employee);
  modalEl.classList.remove('hidden');
}

function renderDetail(employee) {
  const { done, total, pct } = progress(employee);
  const groups = groupByCategory(employee.checklist);

  let checklistHtml = '';
  Object.entries(groups).forEach(([category, tasks]) => {
    checklistHtml += `<div class="checklist-category"><h4>${escapeHtml(category)}</h4>`;
    tasks.forEach((task) => {
      checklistHtml += `
        <div class="task-row ${task.done ? 'done' : ''}">
          <input type="checkbox" id="task-${task.id}" data-employee="${employee.id}" data-task="${task.id}" ${task.done ? 'checked' : ''} />
          <label for="task-${task.id}">${escapeHtml(task.title)}</label>
        </div>
      `;
    });
    checklistHtml += '</div>';
  });

  const tab = (name) => (activeTab === name ? 'tab-btn active' : 'tab-btn');
  const panel = (name) => (activeTab === name ? 'tab-panel' : 'tab-panel hidden');

  detailBodyEl.innerHTML = `
    <div class="detail-header">
      <div>
        <h2>${escapeHtml(employee.name)}</h2>
        <p>${escapeHtml(employee.role)} · ${escapeHtml(employee.department)} · starts ${employee.startDate}</p>
        <p>${done}/${total} onboarding tasks complete (${pct}%)</p>
      </div>
      <button class="remove-link" data-remove="${employee.id}">Remove</button>
    </div>

    <div class="tab-nav">
      <button class="${tab('checklist')}" data-tab="checklist">Checklist</button>
      <button class="${tab('curriculum')}" data-tab="curriculum">30-Day Plan</button>
      <button class="${tab('assistant')}" data-tab="assistant">Assistant</button>
    </div>

    <div class="${panel('checklist')}" data-panel="checklist">
      ${checklistHtml}
    </div>

    <div class="${panel('curriculum')}" data-panel="curriculum">
      <div id="curriculum-body">Loading 30-day plan...</div>
    </div>

    <div class="${panel('assistant')}" data-panel="assistant">
      <div id="chat-log" class="chat-log"></div>
      <form id="chat-form" class="chat-form" data-employee="${employee.id}">
        <input id="chat-input" type="text" placeholder="Ask about ${escapeHtml(employee.name)}'s onboarding..." autocomplete="off" />
        <button type="submit">Send</button>
      </form>
    </div>
  `;

  detailBodyEl.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      renderDetail(employee);
    });
  });

  if (activeTab === 'curriculum') loadCurriculum(employee.id);
  if (activeTab === 'assistant') {
    renderChatLog(employee.id);
    document.getElementById('chat-form').addEventListener('submit', (e) => handleChatSubmit(e, employee.id));
  }

  detailBodyEl.querySelectorAll('input[type="checkbox"][data-task]').forEach((cb) => {
    cb.addEventListener('change', async (e) => {
      const empId = e.target.dataset.employee;
      const taskId = e.target.dataset.task;
      await fetch(`/api/employees/${empId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: e.target.checked })
      });
      const refreshed = await (await fetch(`/api/employees/${empId}`)).json();
      renderDetail(refreshed);
      refreshList();
    });
  });

  detailBodyEl.querySelector('[data-remove]').addEventListener('click', async (e) => {
    const empId = e.target.dataset.remove;
    if (!confirm('Remove this employee from onboarding?')) return;
    await fetch(`/api/employees/${empId}`, { method: 'DELETE' });
    modalEl.classList.add('hidden');
    refreshList();
  });
}

// ---------- 30-Day Plan tab ----------

async function loadCurriculum(employeeId) {
  const res = await fetch(`/api/employees/${employeeId}/curriculum`);
  if (!res.ok) {
    document.getElementById('curriculum-body').innerHTML = '<p class="empty-state">Could not load the 30-day plan.</p>';
    return;
  }
  const data = await res.json();
  curriculumCache.set(String(employeeId), data);
  if (!curriculumUiState.has(String(employeeId))) {
    curriculumUiState.set(String(employeeId), { filter: 'All', selectedDay: data.currentDay });
  }
  renderCurriculum(employeeId);
}

function renderCurriculum(employeeId) {
  const key = String(employeeId);
  const data = curriculumCache.get(key);
  const ui = curriculumUiState.get(key);
  const container = document.getElementById('curriculum-body');
  if (!data || !container) return;

  const pct = Math.round((data.completedDays / data.totalDays) * 100);
  const filters = ['All', ...data.categories];
  const filterChips = filters
    .map(
      (f) =>
        `<button class="filter-chip ${ui.filter === f ? 'active' : ''}" data-filter="${escapeHtml(f)}">${escapeHtml(f)}</button>`
    )
    .join('');

  const dayCells = data.days
    .map((d) => {
      const matches = ui.filter === 'All' || d.category === ui.filter;
      const classes = ['day-cell'];
      if (d.done) classes.push('done');
      if (d.day === data.currentDay) classes.push('current');
      if (d.day === ui.selectedDay) classes.push('selected');
      if (!matches) classes.push('dimmed');
      return `<button class="${classes.join(' ')}" data-day="${d.day}">${d.day}</button>`;
    })
    .join('');

  const selected = data.days.find((d) => d.day === ui.selectedDay) || data.days[0];

  container.innerHTML = `
    <div class="curriculum-progress">
      <div class="progress-wrap">
        <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <span class="progress-label">${data.completedDays}/${data.totalDays} days complete</span>
      </div>
      <span class="current-day-badge">Day ${data.currentDay} of ${data.totalDays}</span>
    </div>

    <div class="filter-chips">${filterChips}</div>

    <div class="day-grid">${dayCells}</div>

    <div class="day-detail">
      <div class="day-detail-head">
        <span class="category-tag">${escapeHtml(selected.category)}</span>
        <h4>Day ${selected.day}: ${escapeHtml(selected.title)}</h4>
      </div>
      <p class="day-description">${escapeHtml(selected.description)}</p>
      <label class="task-row">
        <input type="checkbox" id="day-done" ${selected.done ? 'checked' : ''} />
        Mark day ${selected.day} complete
      </label>
      <label class="reflection-label" for="day-reflection">Reflection notes</label>
      <textarea id="day-reflection" rows="3" placeholder="What did you learn today?">${escapeHtml(selected.reflection)}</textarea>
      <div class="day-nav">
        <button id="day-prev" ${selected.day <= 1 ? 'disabled' : ''}>&larr; Prev day</button>
        <button id="day-mark-today">Mark today complete</button>
        <button id="day-next" ${selected.day >= data.totalDays ? 'disabled' : ''}>Next day &rarr;</button>
      </div>
      <div class="curriculum-actions">
        <button id="day-print">Print this day's plan</button>
        <button id="curriculum-export">Export progress (JSON)</button>
      </div>
    </div>
  `;

  container.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      ui.filter = chip.dataset.filter;
      renderCurriculum(employeeId);
    });
  });

  container.querySelectorAll('.day-cell').forEach((cell) => {
    cell.addEventListener('click', () => {
      ui.selectedDay = Number(cell.dataset.day);
      renderCurriculum(employeeId);
    });
  });

  document.getElementById('day-done').addEventListener('change', async (e) => {
    await patchCurriculumDay(employeeId, selected.day, { done: e.target.checked });
  });

  document.getElementById('day-reflection').addEventListener('blur', async (e) => {
    await patchCurriculumDay(employeeId, selected.day, { reflection: e.target.value });
  });

  document.getElementById('day-prev').addEventListener('click', () => {
    ui.selectedDay = Math.max(1, selected.day - 1);
    renderCurriculum(employeeId);
  });
  document.getElementById('day-next').addEventListener('click', () => {
    ui.selectedDay = Math.min(data.totalDays, selected.day + 1);
    renderCurriculum(employeeId);
  });
  document.getElementById('day-mark-today').addEventListener('click', async () => {
    await patchCurriculumDay(employeeId, data.currentDay, { done: true });
    ui.selectedDay = data.currentDay;
    renderCurriculum(employeeId);
  });

  document.getElementById('day-print').addEventListener('click', () => window.print());

  document.getElementById('curriculum-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `onboarding-progress-employee-${employeeId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

async function patchCurriculumDay(employeeId, day, body) {
  const res = await fetch(`/api/employees/${employeeId}/curriculum/${day}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) return;
  const data = await res.json();
  curriculumCache.set(String(employeeId), data);
  renderCurriculum(employeeId);
}

// ---------- Assistant tab ----------

function renderChatLog(employeeId) {
  const logEl = document.getElementById('chat-log');
  if (!logEl) return;
  const log = chatLogs.get(employeeId) || [];
  if (log.length === 0) {
    logEl.innerHTML = '<p class="chat-empty">Ask for a personalized plan, or tell it what\'s been done - it can update the checklist for you.</p>';
  } else {
    logEl.innerHTML = log
      .map(
        (msg) => `<div class="chat-msg chat-${msg.role}"><strong>${msg.role === 'user' ? 'You' : 'Assistant'}:</strong> ${escapeHtml(msg.text)}</div>`
      )
      .join('');
  }
  logEl.scrollTop = logEl.scrollHeight;
}

async function handleChatSubmit(e, employeeId) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.disabled = true;

  const log = chatLogs.get(employeeId) || [];
  log.push({ role: 'user', text });
  chatLogs.set(employeeId, log);
  renderChatLog(employeeId);

  try {
    const res = await fetch(`/api/employees/${employeeId}/agent/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    if (!res.ok) {
      log.push({ role: 'assistant', text: `Error: ${data.error || 'something went wrong'}` });
      chatLogs.set(employeeId, log);
      renderChatLog(employeeId);
      return;
    }
    log.push({ role: 'assistant', text: data.reply || '(no response)' });
    chatLogs.set(employeeId, log);
    // The agent may have changed the checklist - re-render the whole detail
    // view with fresh data, staying on the assistant tab.
    renderDetail(data.employee);
    refreshList();
  } catch (err) {
    log.push({ role: 'assistant', text: 'Error: could not reach the onboarding assistant' });
    chatLogs.set(employeeId, log);
    renderChatLog(employeeId);
  } finally {
    const freshInput = document.getElementById('chat-input');
    if (freshInput) {
      freshInput.disabled = false;
      freshInput.focus();
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function refreshList() {
  const employees = await fetchEmployees();
  renderList(employees);
}

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(formEl);
  const payload = Object.fromEntries(formData.entries());
  const res = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    formEl.reset();
    refreshList();
  } else {
    const err = await res.json();
    alert(err.error || 'Failed to add employee');
  }
});

closeModalBtn.addEventListener('click', () => modalEl.classList.add('hidden'));
modalEl.addEventListener('click', (e) => {
  if (e.target === modalEl) modalEl.classList.add('hidden');
});

refreshList();

// Deep link from the admin dashboard: index.html?employee=3 opens that
// employee straight into their 30-day plan.
const deepLinkId = new URLSearchParams(window.location.search).get('employee');
if (deepLinkId) {
  openDetail(deepLinkId, { tab: 'curriculum' });
}
