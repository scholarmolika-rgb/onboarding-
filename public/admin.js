function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadSummary() {
  const res = await fetch('/api/admin/curriculum');
  const rows = await res.json();
  render(rows);
}

function render(rows) {
  const wrap = document.getElementById('admin-table-wrap');
  if (rows.length === 0) {
    wrap.innerHTML = '<p class="empty-state">No employees yet.</p>';
    return;
  }

  const rowsHtml = rows
    .slice()
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .map((r) => {
      const pct = r.totalDays === 0 ? 0 : Math.round((r.completedDays / r.totalDays) * 100);
      return `
        <tr>
          <td><a href="index.html?employee=${r.id}">${escapeHtml(r.name)}</a></td>
          <td>${escapeHtml(r.role)}</td>
          <td>${escapeHtml(r.department)}</td>
          <td>${r.startDate}</td>
          <td>Day ${r.currentDay} / ${r.totalDays}</td>
          <td>
            <div class="progress-wrap">
              <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
              <span class="progress-label">${r.completedDays}/${r.totalDays}</span>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  document.getElementById('admin-table-wrap').innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Department</th>
          <th>Start date</th>
          <th>Current day</th>
          <th>30-day progress</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;
}

loadSummary();
