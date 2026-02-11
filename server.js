import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

import { initDb } from './services/dbService.js';
import { initialize as initConfig } from './services/configService.js';
import { initialize as initTools } from './services/toolService.js';
import { initWebSocket, broadcastInitDone } from './services/websocketService.js';

import rootRouter from './routes/rootRouter.js';
import chatRouter from './routes/chatRouter.js';
import configRouter from './routes/configRouter.js';
import settingsRouter from './routes/settingsRouter.js';
import canvasRouter from './routes/canvasRouter.js';
import imageRouter from './routes/imageRouter.js';
import workspaceRouter from './routes/workspaceRouter.js';
import toolConfirmationRouter from './routes/toolConfirmationRouter.js';
import sslRouter from './routes/sslRouter.js';
import deviceRouter from './routes/deviceRouter.js';
import billingRouter from './routes/billingRouter.js';
import knowledgeRouter from './routes/knowledgeRouter.js';
import templateRouter from './routes/templateRouter.js';
import v1Router from './routes/v1Router.js';
import { PORT as port, UI_DIST_DIR as uiDistDir } from './constants.js';

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.use('/api', rootRouter);
app.use('/api', chatRouter);
app.use('/api/config', configRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', canvasRouter);
app.use('/api', imageRouter);
app.use('/api', workspaceRouter);
app.use('/api', toolConfirmationRouter);
app.use('/api', sslRouter);
app.use('/api', deviceRouter);
app.use('/api', billingRouter);
app.use('/api', knowledgeRouter);
app.use('/api', templateRouter);
app.use('/api/v1', v1Router);

const uiAssetsDir = path.join(uiDistDir, 'assets');
if (fs.existsSync(uiAssetsDir)) {
  app.use('/assets', express.static(uiAssetsDir, {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));
}

if (fs.existsSync(uiDistDir)) {
  app.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(uiDistDir, 'index.html'));
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(uiDistDir, 'index.html'));
  });
}

async function startServer() {
  console.log('Starting LocalManus Express Server...');

  await initDb();
  await initConfig();
  await initTools();
  initWebSocket(httpServer);
  await broadcastInitDone();

  httpServer.listen(port, '127.0.0.1', () => {
    console.log(`🌟 Server running at http://127.0.0.1:${port}`);
    console.log(`UI_DIST_DIR: ${uiDistDir}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
