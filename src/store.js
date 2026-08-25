const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'employees.json');

const DEFAULT_TASKS = [
  { title: 'Sign offer letter', category: 'Paperwork' },
  { title: 'Complete tax & bank forms', category: 'Paperwork' },
  { title: 'Sign employee handbook acknowledgement', category: 'Paperwork' },
  { title: 'Provision laptop & accounts', category: 'IT Setup' },
  { title: 'Grant building & system access', category: 'IT Setup' },
  { title: 'Assign onboarding buddy', category: 'People' },
  { title: 'Schedule manager 1:1', category: 'People' },
  { title: 'Team introduction meeting', category: 'People' },
  { title: 'Complete compliance training', category: 'Training' },
  { title: 'Review role-specific training plan', category: 'Training' },
  { title: 'Set 30/60/90 day goals', category: 'Performance' }
];

function readAll() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function writeAll(employees) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(employees, null, 2));
}

function buildChecklist() {
  return DEFAULT_TASKS.map((t, i) => ({
    id: i + 1,
    title: t.title,
    category: t.category,
    done: false
  }));
}

function nextId(employees) {
  return employees.reduce((max, e) => Math.max(max, e.id), 0) + 1;
}

function list() {
  return readAll();
}

function get(id) {
  return readAll().find((e) => e.id === Number(id));
}

function create({ name, role, department, startDate }) {
  const employees = readAll();
  const employee = {
    id: nextId(employees),
    name,
    role,
    department,
    startDate,
    createdAt: new Date().toISOString(),
    checklist: buildChecklist()
  };
  employees.push(employee);
  writeAll(employees);
  return employee;
}

function remove(id) {
  const employees = readAll();
  const filtered = employees.filter((e) => e.id !== Number(id));
  writeAll(filtered);
  return filtered.length !== employees.length;
}

function setTaskDone(employeeId, taskId, done) {
  const employees = readAll();
  const employee = employees.find((e) => e.id === Number(employeeId));
  if (!employee) return null;
  const task = employee.checklist.find((t) => t.id === Number(taskId));
  if (!task) return null;
  task.done = Boolean(done);
  writeAll(employees);
  return employee;
}

module.exports = { list, get, create, remove, setTaskDone, buildChecklist };
