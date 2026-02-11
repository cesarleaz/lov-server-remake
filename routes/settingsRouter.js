import express from 'express';
import * as settingsService from '../services/settingsService.js';
import { FILES_DIR } from '../services/configService.js';
import fs from 'fs';
import { z, validateBody } from '../utils/validation.js';

const router = express.Router();

const settingsUpdateSchema = z.record(z.any());
const proxyUpdateSchema = z.object({
  proxy: z.string().min(1)
});

router.get('/exists', (req, res) => {
  res.json({ exists: settingsService.existsSettings() });
});

router.get('', (req, res) => {
  res.json(settingsService.getSettings());
});

router.post('', validateBody(settingsUpdateSchema), async (req, res) => {
  const result = await settingsService.updateSettings(req.body);
  res.json(result);
});

router.get('/proxy/status', (req, res) => {
  const settings = settingsService.getRawSettings();
  const proxySetting = settings.proxy || 'system';

  if (proxySetting === 'no_proxy') {
    return res.json({ enable: false, configured: true, message: 'Proxy is disabled' });
  }
  if (proxySetting === 'system') {
    return res.json({ enable: true, configured: true, message: 'Using system proxy' });
  }
  if (proxySetting.match(/^(http|https|socks4|socks5):\/\//)) {
    return res.json({ enable: true, configured: true, message: 'Using custom proxy' });
  }
  return res.json({ enable: true, configured: false, message: 'Proxy configuration is invalid' });
});

router.get('/proxy', (req, res) => {
  const proxy = settingsService.getProxyConfig();
  res.json({ proxy });
});

router.post('/proxy', validateBody(proxyUpdateSchema), async (req, res) => {
  const result = await settingsService.updateProxy(req.body.proxy);
  res.json(result);
});

router.get('/knowledge/enabled', (req, res) => {
  res.json(settingsService.getEnabledKnowledge());
});

router.get('/my_assets_dir_path', (req, res) => {
  if (!fs.existsSync(FILES_DIR)) {
    fs.mkdirSync(FILES_DIR, { recursive: true });
  }
  res.json({ success: true, path: FILES_DIR, message: 'My Assets directory path retrieved successfully' });
});

export default router;
