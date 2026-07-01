import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), gardenerConfigApi()],
  base: './',
});

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
