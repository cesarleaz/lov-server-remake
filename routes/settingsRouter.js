import express from 'express';
import * as settingsService from '../services/settingsService.js';
import * as dbService from '../services/dbService.js';
import { initialize as initializeTools } from '../services/toolService.js';
import { FILES_DIR } from '../services/configService.js';
import fs from 'fs';
import { z, validateBody, validateParams } from '../utils/validation.js';
import { fetchWithTimeout } from '../utils/httpUtils.js';

const router = express.Router();

const settingsUpdateSchema = z.record(z.any());
const proxyUpdateSchema = z.object({
  proxy: z.string().min(1)
});
const workflowSchema = z.object({
  name: z.string().min(1),
  api_json: z.record(z.any()),
  description: z.string().min(1),
  inputs: z.array(z.any()),
  outputs: z.any().optional().nullable()
});
const deleteWorkflowSchema = z.object({
  id: z.string().regex(/^\d+$/)
});
const comfyProxySchema = z.object({
  url: z.string().url(),
  path: z.string().min(1),
  method: z.enum(['GET','POST','PUT','DELETE','PATCH']).optional().default('GET'),
  body: z.any().optional().nullable()
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

router.post('/comfyui/create_workflow', validateBody(workflowSchema), async (req, res) => {
  const { name, api_json, description, inputs, outputs } = req.body;
  try {
    await dbService.createComfyWorkflow(name.replaceAll(' ', '_'), JSON.stringify(api_json), description, JSON.stringify(inputs), JSON.stringify(outputs ?? null));
    await initializeTools();
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ detail: `Failed to create workflow: ${e.message}` });
  }
});

router.get('/comfyui/list_workflows', async (req, res) => {
  res.json(await dbService.listComfyWorkflows());
});

router.delete('/comfyui/delete_workflow/:id', validateParams(deleteWorkflowSchema), async (req, res) => {
  await dbService.deleteComfyWorkflow(Number(req.params.id));
  await initializeTools();
  res.json({ success: true });
});

router.post('/comfyui/proxy', validateBody(comfyProxySchema), async (req, res) => {
  try {
    const target = new URL(req.body.path, req.body.url).toString();
    const hasBody = req.body.body !== undefined && req.body.body !== null;
    const response = await fetchWithTimeout(target, {
      method: req.body.method,
      timeout: 15000,
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(req.body.body) : undefined
    });
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      return res.status(response.status).json({ detail: `ComfyUI server returned status ${response.status}` });
    }

    if (contentType.includes('application/json')) {
      return res.json(await response.json());
    }

    return res.send(await response.text());
  } catch (e) {
    return res.status(503).json({ detail: `Failed to connect to ComfyUI: ${e.message}` });
  }
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
