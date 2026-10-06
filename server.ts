import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const FASTAPI_PORT = parseInt(process.env.FASTAPI_PORT || '8000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Spawn Python FastAPI server process
console.log(`🐍 Starting Python FastAPI backend on http://127.0.0.1:${FASTAPI_PORT}...`);
const fastApiProcess = spawn(
  'python3',
  ['-m', 'uvicorn', 'main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', FASTAPI_PORT.toString()],
  { stdio: 'inherit', env: { ...process.env, PYTHONPATH: 'backend' } }
);

fastApiProcess.on('error', (err) => {
  console.error('Failed to start FastAPI process:', err);
});

process.on('exit', () => {
  fastApiProcess.kill();
});

app.use(cors());

// Proxy API requests to FastAPI
app.use('/api', async (req, res) => {
  try {
    const targetUrl = `http://127.0.0.1:${FASTAPI_PORT}/api${req.url}`;
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string' && key.toLowerCase() !== 'host') {
        headers[key] = value;
      }
    }

    const init: RequestInit = {
      method: req.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const buffers: Buffer[] = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      init.body = Buffer.concat(buffers);
    }

    const response = await fetch(targetUrl, init);
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBuffer = await response.arrayBuffer();
    res.send(Buffer.from(responseBuffer));
  } catch (err: any) {
    res.status(502).json({ error: 'Bad Gateway', detail: err.message });
  }
});

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
