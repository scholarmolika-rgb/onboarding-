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

function groupByCategory(checklist) {
  const groups = {};
  checklist.forEach((task) => {
    if (!groups[task.category]) groups[task.category] = [];
    groups[task.category].push(task);
  });
  return groups;
}

async function openDetail(id) {
  const res = await fetch(`/api/employees/${id}`);
  if (!res.ok) return;
  const employee = await res.json();
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

  detailBodyEl.innerHTML = `
    <div class="detail-header">
      <div>
        <h2>${escapeHtml(employee.name)}</h2>
        <p>${escapeHtml(employee.role)} · ${escapeHtml(employee.department)} · starts ${employee.startDate}</p>
        <p>${done}/${total} tasks complete (${pct}%)</p>
      </div>
      <button class="remove-link" data-remove="${employee.id}">Remove</button>
    </div>
    ${checklistHtml}
    <div class="agent-panel">
      <h4>Onboarding Assistant</h4>
      <div id="chat-log" class="chat-log"></div>
      <form id="chat-form" class="chat-form" data-employee="${employee.id}">
        <input id="chat-input" type="text" placeholder="Ask about ${escapeHtml(employee.name)}'s onboarding..." autocomplete="off" />
        <button type="submit">Send</button>
      </form>
    </div>
  `;

  renderChatLog(employee.id);
  document.getElementById('chat-form').addEventListener('submit', (e) => handleChatSubmit(e, employee.id));

  detailBodyEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
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
    // view with fresh data, then restore the chat log and focus.
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
