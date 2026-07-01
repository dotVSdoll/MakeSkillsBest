const fs = require('fs');
const path = require('path');

function projectDir() {
  return process.env.CLAUDE_PROJECT_DIR || process.env.PWD || process.cwd();
}

function appendEvent(root) {
  const file = path.join(root, '.gardener-hooks.jsonl');
  const event = {
    at: new Date().toISOString(),
    event: process.env.CLAUDE_HOOK_EVENT_NAME || 'unknown',
    cwd: process.cwd(),
  };
  fs.appendFileSync(file, `${JSON.stringify(event)}\n`, 'utf8');
}

try {
  appendEvent(projectDir());
} catch {
  // Hooks must never block normal Claude Code work.
}

console.log([
  'Context Gardener is available.',
  'Use /gardener to run: python -m src.main web . --open',
  'The hook only records lightweight lifecycle events; the loop runs on explicit command.',
].join('\n'));
