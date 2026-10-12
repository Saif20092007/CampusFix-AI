import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './server/api.js';
import { loadDatabase } from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Initialize in-memory / JSON database for embedded fallback
loadDatabase();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', app: 'CampusFix AI', version: '2.4.0', backend: 'Node.js Express' });
});

// Primary API Router
app.use('/api', apiRouter);

// Static public assets fallback (logo, icons, pwa)
app.use(express.static(path.resolve(__dirname, 'public')));

// Direct route fallback
app.use('/', apiRouter);

// Frontend Vite integration
async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
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
