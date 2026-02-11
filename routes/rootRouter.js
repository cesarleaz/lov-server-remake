import express from 'express';
import { getConfig } from '../services/configService.js';
import * as dbService from '../services/dbService.js';
import { listTools } from '../services/toolService.js';

const router = express.Router();

const ENABLED_MODELS_CATALOG = {
  jaaz: ['gemini-2.5-pro', 'gemini-2.5-flash', 'nano-banana'],
};

router.get('/list_models', async (req, res) => {
  const config = getConfig();
  const result = [];

  for (const [provider, providerConfig] of Object.entries(config)) {
    if (!providerConfig.url || !providerConfig.api_key) continue;

    const configuredModels = providerConfig.models || {};
    const catalogModels = ENABLED_MODELS_CATALOG[provider] || [];
    const modelNames = Object.keys(configuredModels).length > 0 ? Object.keys(configuredModels) : catalogModels;

    for (const modelName of modelNames) {
      const modelCfg = configuredModels[modelName] || { type: 'text' };
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
