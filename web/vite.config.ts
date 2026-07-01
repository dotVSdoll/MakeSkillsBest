import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export default defineConfig({
  plugins: [react(), gardenerConfigApi(), availableSkillsApi()],
  base: './',
});

/** API endpoint: POST /api/gardener-config — save config to disk */
function gardenerConfigApi() {
  return {
    name: 'gardener-config-api',
    configureServer(server) {
      server.middlewares.use('/api/gardener-config', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'method-not-allowed' }));
          return;
        }

        try {
          const body = await readBody(req);
          const config = JSON.parse(body);
          const publicPath = path.resolve(server.config.root, 'public', 'gardener-config.json');
          const runtimeMeta = await readRuntimeMeta(server.config.root);
          const projectPath = runtimeMeta?.configPath
            ? path.resolve(runtimeMeta.configPath)
            : process.env.GARDENER_PROJECT_PATH
              ? path.resolve(process.env.GARDENER_PROJECT_PATH, '.gardener-config.json')
              : null;

          await writeJsonAtomic(publicPath, config);
          if (projectPath) {
            await writeJsonAtomic(projectPath, config);
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, projectConfigPath: projectPath, publicConfigPath: publicPath }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
        }
      });
    },
  };
}

/** API endpoint: GET /api/available-skills — scan skill directories */
function availableSkillsApi() {
  return {
    name: 'available-skills-api',
    configureServer(server) {
      server.middlewares.use('/api/available-skills', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        try {
          const skills = await scanAllSkills(server.config.root);
          res.statusCode = 200;
          res.end(JSON.stringify({ skills }));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ skills: [], error: error instanceof Error ? error.message : String(error) }));
        }
      });
    },
  };
}

interface SkillEntry {
  name: string;
  path: string;
  description: string;
  source: 'claude' | 'project';
}

async function scanAllSkills(root: string): Promise<SkillEntry[]> {
  const skills: SkillEntry[] = [];
  const seen = new Set<string>();

  // 1. Scan ~/.claude/skills/
  const claudeSkillsDir = path.join(os.homedir(), '.claude', 'skills');
  await scanSkillDir(claudeSkillsDir, 'claude', skills, seen);

  // 2. Scan project-local skills/ if GARDENER_PROJECT_PATH is set
  const projectPath = process.env.GARDENER_PROJECT_PATH
    ? path.resolve(process.env.GARDENER_PROJECT_PATH)
    : null;
  if (projectPath) {
    const projectSkillsDir = path.join(projectPath, 'skills');
    await scanSkillDir(projectSkillsDir, 'project', skills, seen);
  } else {
    // fallback: skills/ relative to vite root parent
    const fallbackDir = path.resolve(root, '..', 'skills');
    await scanSkillDir(fallbackDir, 'project', skills, seen);
  }

  return skills;
}

async function scanSkillDir(
  dir: string,
  source: 'claude' | 'project',
  skills: SkillEntry[],
  seen: Set<string>,
): Promise<void> {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (seen.has(entry.name)) continue;

      const skillDir = path.join(dir, entry.name);
      const meta = await readSkillMeta(skillDir, entry.name);
      seen.add(entry.name);
      skills.push({
        name: meta.name,
        path: entry.name,
        description: meta.description,
        source,
      });
    }
  } catch {
    // Directory doesn't exist or can't be read — skip silently
  }
}

async function readSkillMeta(skillDir: string, fallbackName: string): Promise<{ name: string; description: string }> {
  // Try SKILL.md with frontmatter first
  for (const candidate of ['SKILL.md', 'skill.md', 'definition.json']) {
    const filePath = path.join(skillDir, candidate);
    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const meta = parseSkillFrontmatter(raw);
      if (meta) return meta;
    } catch {
      // try next
    }
  }
  return { name: fallbackName, description: '' };
}

function parseSkillFrontmatter(raw: string): { name: string; description: string } | null {
  // Match YAML frontmatter between --- markers
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = match[1];
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  return {
    name: nameMatch ? nameMatch[1].trim() : '',
    description: descMatch ? descMatch[1].trim() : '',
  };
}

function readBody(req): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readRuntimeMeta(root: string): Promise<{ configPath?: string } | null> {
  const runtimePath = path.resolve(root, 'public', 'gardener-runtime.json');
  try {
    const raw = await fs.promises.readFile(runtimePath, 'utf8');
    return JSON.parse(raw) as { configPath?: string };
  } catch {
    return null;
  }
}

async function writeJsonAtomic(targetPath: string, data: unknown): Promise<void> {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
  const tmp = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await fs.promises.rename(tmp, targetPath);
      return;
    } catch (error) {
      if (!isWindowsLockError(error) || attempt === 7) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}

function isWindowsLockError(error: unknown): boolean {
  return error instanceof Error && (
    'code' in error
    && (error.code === 'EPERM' || error.code === 'EACCES')
  );
}
