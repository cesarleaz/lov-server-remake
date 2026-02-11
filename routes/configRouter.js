import express from 'express';
import { existsConfig, getConfig, updateConfig } from '../services/configService.js';
import { initialize as initializeTools } from '../services/toolService.js';

const router = express.Router();

router.get('/exists', (req, res) => {
  res.json({ exists: existsConfig() });
});

router.get('', (req, res) => {
  res.json(getConfig());
});

router.post('', async (req, res) => {
  const result = await updateConfig(req.body);
  await initializeTools();
  res.json(result);
});

export default router;
