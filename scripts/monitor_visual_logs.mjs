import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.resolve(__dirname, '..', 'summary', 'test-logs');

const entries = await fs.readdir(logsDir).catch(() => []);
const files = await Promise.all(entries.map(async (name) => {
  const fullPath = path.join(logsDir, name);
  const stat = await fs.stat(fullPath);
  return { name, fullPath, mtimeMs: stat.mtimeMs };
}));

const latest = files.sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
if (!latest) {
  console.log('No visual test logs found.');
  process.exit(0);
}

const content = await fs.readFile(latest.fullPath, 'utf8');
console.log(`== ${latest.name} ==`);
console.log(content.slice(-8000));
