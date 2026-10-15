import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';

const clientDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(clientDir, '..');
const resourcesDir = path.join(root, 'resources');
const appVersion = (JSON.parse(fs.readFileSync(path.join(clientDir, 'package.json'), 'utf8')) as { version: string }).version;

function gitHash(): string {
  try {
    const hash = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
    const dirty = execSync('git status --porcelain --untracked-files=no', { cwd: root }).toString().trim();
    return dirty ? `${hash}-dirty` : hash;
  } catch {
    return 'unknown';
  }
}

function serveResources(): Plugin {
  return {
    name: 'serve-resources',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/resources/')) return next();
        const relative = decodeURIComponent(req.url.split('?')[0].replace(/^\/resources\//, ''));
        const filePath = path.normalize(path.join(resourcesDir, relative));
        if (!filePath.startsWith(resourcesDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        const stat = fs.statSync(filePath);
        const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
        res.setHeader('Content-Type', contentType(filePath));
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('ETag', etag);
        res.setHeader('Last-Modified', stat.mtime.toUTCString());
        if (req.headers['if-none-match'] === etag) {
          res.statusCode = 304;
          res.end();
          return;
        }
        fs.createReadStream(filePath).pipe(res);
      });
    },
    closeBundle() {
      const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'dist/resources');
      copyDir(resourcesDir, outDir);
    },
  };
}

function contentType(filePath: string): string {
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.js')) return 'text/javascript';
  return 'application/octet-stream';
}

function copyDir(from: string, to: string): void {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

/** `/` locally. GitHub Pages sets VITE_BASE to the project path, such as `/cownter`. */
function siteBase(): string {
  const raw = process.env.VITE_BASE?.trim();
  if (!raw || raw === '/') return '/';
  const collapsed = raw.replace(/\/{2,}/g, '/');
  const withLead = collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

export default defineConfig({
  base: siteBase(),
  plugins: [serveResources()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __GIT_HASH__: JSON.stringify(gitHash()),
  },
  resolve: {
    alias: {
      '@ow2/core': path.join(root, 'packages/core/src/index.ts'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    fs: {
      allow: [root],
    },
  },
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
  },
});
