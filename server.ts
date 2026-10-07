import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import apiRouter from './server/api.js';
import { loadDatabase } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const FASTAPI_PORT = parseInt(process.env.FASTAPI_PORT || '8088', 10);
const isProd = process.env.NODE_ENV === 'production';

// Initialize in-memory / JSON database for embedded fallback
loadDatabase();

// Attempt to spawn Python FastAPI backend if available
let fastApiProcess: any = null;
try {
  fastApiProcess = spawn(
    'python3',
    ['-m', 'uvicorn', 'main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', FASTAPI_PORT.toString()],
    { stdio: 'pipe', env: { ...process.env, PYTHONPATH: 'backend' } }
  );

  fastApiProcess.on('error', () => {
    // Expected in environments without python packages installed
  });

  process.on('exit', () => {
    try {
      fastApiProcess?.kill();
    } catch {}
  });
} catch {}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', app: 'CampusFix AI', version: '2.4.0', backend: 'FastAPI / Hybrid' });
});

// Proxy API requests to FastAPI with transparent fallback to embedded API engine
app.use('/api', async (req, res, next) => {
  try {
    const targetUrl = `http://127.0.0.1:${FASTAPI_PORT}/api${req.url}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string' && key.toLowerCase() !== 'host') {
        headers[key] = value;
      }
    }

    const init: RequestInit = {
      method: req.method,
      headers,
      signal: controller.signal,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      init.body = JSON.stringify(req.body);
      headers['content-type'] = 'application/json';
    }

    const response = await fetch(targetUrl, init);
    clearTimeout(timeout);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBuffer = await response.arrayBuffer();
    res.send(Buffer.from(responseBuffer));
  } catch (_err) {
    // If FastAPI is not running or timed out, gracefully handle via embedded router
    return apiRouter(req, res, next);
  }
});

// Direct route fallback
app.use('/', apiRouter);

// Frontend Vite integration
async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CampusFix AI gateway running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
