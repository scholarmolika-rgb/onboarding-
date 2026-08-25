#!/usr/bin/env node
const readline = require('readline');
const store = require('./store');
const agent = require('./agent');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const lines = rl[Symbol.asyncIterator]();

async function ask(prompt) {
  process.stdout.write(prompt);
  const { value, done } = await lines.next();
  if (done) {
    rl.close();
    process.exit(0);
  }
  return value;
}

async function pickOrCreateEmployee() {
  const employees = store.list();
  if (employees.length > 0) {
    console.log('\nExisting employees:');
    employees.forEach((e) => console.log(`  [${e.id}] ${e.name} - ${e.role}, ${e.department}`));
  }

  const choice = (await ask('\nEnter an employee id to continue onboarding, or type "new" to add one: ')).trim();

  if (choice.toLowerCase() === 'new') {
    const name = (await ask('Full name: ')).trim();
    const role = (await ask('Role: ')).trim();
    const department = (await ask('Department: ')).trim();
    const startDate = (await ask('Start date (YYYY-MM-DD): ')).trim();
    if (!name || !role || !department || !startDate) {
      console.log('All fields are required.');
      return pickOrCreateEmployee();
    }
    return store.create({ name, role, department, startDate });
  }

  const employee = store.get(choice);
  if (!employee) {
    console.log('No employee with that id.');
    return pickOrCreateEmployee();
  }
  return employee;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Set ANTHROPIC_API_KEY before running the onboarding agent, e.g.:\n  export ANTHROPIC_API_KEY=your-api-key\n  npm run onboard');
    process.exit(1);
  }

  const employee = await pickOrCreateEmployee();
  console.log(`\nOnboarding agent ready for ${employee.name} (${employee.role}, ${employee.department}).`);
  console.log('Type a message and press Enter. Type "exit" to quit.\n');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const message = (await ask('You: ')).trim();
    if (!message) continue;
    if (['exit', 'quit'].includes(message.toLowerCase())) break;

    try {
      const { reply } = await agent.chat(employee.id, message);
      console.log(`Assistant: ${reply || '(no response)'}\n`);
    } catch (err) {
      console.log(`[error] ${err.message}\n`);
    }
  }

  rl.close();
}

main();
