import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resourcesDir = path.join(root, 'resources');

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
        res.setHeader('Content-Type', contentType(filePath));
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

export default defineConfig({
  plugins: [serveResources()],
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
  },
});
