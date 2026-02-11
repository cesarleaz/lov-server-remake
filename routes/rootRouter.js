import express from 'express';
import { getConfig } from '../services/configService.js';
import * as dbService from '../services/dbService.js';
import { listTools } from '../services/toolService.js';
import { fetchWithTimeout } from '../utils/httpUtils.js';
import { OLLAMA_HOST } from '../constants.js';

const router = express.Router();

async function getOllamaModelList(baseUrl) {
  try {
    const res = await fetchWithTimeout(`${baseUrl.replace(/\/$/, '')}/api/tags`, { timeout: 5000 });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m) => m.name).filter(Boolean);
  } catch {
    return [];
  }
}

router.get('/list_models', async (req, res) => {
  const config = getConfig();
  const result = [];

  const ollamaUrl = config.ollama?.url || OLLAMA_HOST;
  const ollamaModels = await getOllamaModelList(ollamaUrl);
  for (const modelName of ollamaModels) {
    result.push({ provider: 'ollama', model: modelName, url: ollamaUrl, type: 'text' });
  }

  for (const [provider, providerConfig] of Object.entries(config)) {
    if (provider === 'ollama') continue;
    if (!providerConfig.url || !providerConfig.api_key) continue;

    const models = providerConfig.models || {};
    for (const [modelName, modelCfg] of Object.entries(models)) {
      if (modelCfg.type === 'text') {
        result.push({ provider, model: modelName, url: providerConfig.url, type: 'text' });
      }
    }
  }
  res.json(result);
});

router.get('/list_tools', async (req, res) => {
  res.json(listTools());
});

router.get('/list_chat_sessions', async (req, res) => {
  const sessions = await dbService.listSessions();
  res.json(sessions);
});

router.get('/chat_session/:session_id', async (req, res) => {
  const history = await dbService.getChatHistory(req.params.session_id);
  res.json(history);
});

export default router;
