const Anthropic = require('@anthropic-ai/sdk');
const store = require('./store');

const MODEL = 'claude-opus-5';
const MAX_TOOL_ITERATIONS = 6;

let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// Conversation history per employee, keyed by employee id (string). In-memory
// only - resets when the server restarts, same lifetime as the process.
const conversations = new Map();

const tools = [
  {
    name: 'view_checklist',
    description: "View the employee's current onboarding checklist, including which tasks are done.",
    input_schema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'complete_task',
    description: 'Mark an onboarding checklist task as complete or incomplete.',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'integer', description: 'id of the task to update' },
        done: { type: 'boolean', description: 'true to mark complete, false to mark incomplete' }
      },
      required: ['taskId', 'done'],
      additionalProperties: false
    }
  },
  {
    name: 'add_task',
    description: "Add a new task to the employee's onboarding checklist, e.g. a role-specific step that isn't in the standard list.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short, actionable task title' },
        category: {
          type: 'string',
          description: 'One of: Paperwork, IT Setup, People, Training, Performance (or a new short category name)'
        }
      },
      required: ['title', 'category'],
      additionalProperties: false
    }
  }
];

function systemPromptFor(employee) {
  return [
    `You are an HR onboarding assistant dedicated to one new hire: ${employee.name},`,
    `starting as ${employee.role} in ${employee.department} on ${employee.startDate}.`,
    'Be warm, concise, and practical - this is a real person\'s first days at a new job.',
    'Use the provided tools to look at and update their onboarding checklist whenever the',
    'conversation calls for it - actually make the change with a tool call rather than just',
    'describing what should happen. When asked for a plan or role-specific guidance, tailor it',
    'to their actual role and department instead of generic advice, and add concrete tasks to',
    'the checklist rather than only listing suggestions in text.'
  ].join(' ');
}

function executeTool(employeeId, name, input) {
  switch (name) {
    case 'view_checklist': {
      const employee = store.get(employeeId);
      if (!employee) return { error: 'Employee not found' };
      return { checklist: employee.checklist };
    }
    case 'complete_task': {
      const employee = store.setTaskDone(employeeId, input.taskId, input.done);
      if (!employee) return { error: 'Task not found' };
      return { ok: true, checklist: employee.checklist };
    }
    case 'add_task': {
      if (!input.title || !input.category) return { error: 'title and category are required' };
      const employee = store.addTask(employeeId, input.title, input.category);
      if (!employee) return { error: 'Employee not found' };
      return { ok: true, checklist: employee.checklist };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function chat(employeeId, userMessage) {
  const key = String(employeeId);
  const employee = store.get(employeeId);
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  if (!conversations.has(key)) conversations.set(key, []);
  const messages = conversations.get(key);
  messages.push({ role: 'user', content: userMessage });

  const request = () =>
    getClient().messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: systemPromptFor(employee),
      tools,
      messages
    });

  let response = await request();
  messages.push({ role: 'assistant', content: response.content });

  let iterations = 0;
  while (response.stop_reason === 'tool_use' && iterations < MAX_TOOL_ITERATIONS) {
    const toolResults = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = executeTool(employeeId, block.name, block.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result)
        });
      }
    }
    messages.push({ role: 'user', content: toolResults });

    response = await request();
    messages.push({ role: 'assistant', content: response.content });
    iterations += 1;
  }

  const reply = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n\n');

  return { reply, employee: store.get(employeeId) };
}

function reset(employeeId) {
  conversations.delete(String(employeeId));
}

module.exports = { chat, reset };
