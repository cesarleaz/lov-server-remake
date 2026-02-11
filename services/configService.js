import fs from 'fs';
import path from 'path';
import toml from '@iarna/toml';
import { BASE_API_URL, CONFIG_PATH as configFilePath, USER_DATA_DIR } from '../constants.js';

export const FILES_DIR = path.join(USER_DATA_DIR, 'files');

const DEFAULT_PROVIDERS_CONFIG = {
  jaaz: {
    models: {
      'gpt-4o': { type: 'text' },
      'gpt-4o-mini': { type: 'text' },
      'deepseek/deepseek-chat-v3-0324': { type: 'text' },
      'anthropic/claude-sonnet-4': { type: 'text' },
      'anthropic/claude-3.7-sonnet': { type: 'text' },
    },
    url: BASE_API_URL.replace(/\/$/, '') + '/api/v1/',
    api_key: '',
    max_tokens: 8192,
  },
  comfyui: {
    models: {},
    url: 'http://127.0.0.1:8188',
    api_key: '',
  },
  ollama: {
    models: {},
    url: 'http://localhost:11434',
    api_key: '',
    max_tokens: 8192,
  },
  openai: {
    models: {
      'gpt-4o': { type: 'text' },
      'gpt-4o-mini': { type: 'text' },
    },
    url: 'https://api.openai.com/v1/',
    api_key: '',
    max_tokens: 8192,
  },
};

let appConfig = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS_CONFIG));

function getJaazUrl() {
  return BASE_API_URL.replace(/\/$/, '') + '/api/v1/';
}

export async function initialize() {
  try {
    const dir = path.dirname(configFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(configFilePath)) {
      console.log(`Config file not found at ${configFilePath}, creating default configuration`);
      fs.writeFileSync(configFilePath, toml.stringify(appConfig));
      return;
    }

    const content = fs.readFileSync(configFilePath, 'utf8');
    const config = toml.parse(content);

    for (const [provider, providerConfig] of Object.entries(config)) {
      if (!DEFAULT_PROVIDERS_CONFIG[provider]) {
        providerConfig.is_custom = true;
      }
      appConfig[provider] = providerConfig;

      const providerModels = appConfig[provider].models || {};
      const defaultModels = DEFAULT_PROVIDERS_CONFIG[provider]?.models || {};

      if (providerConfig.models) {
        for (const [modelName, modelConfig] of Object.entries(providerConfig.models)) {
          if (modelConfig.type === 'text' && !defaultModels[modelName]) {
            providerModels[modelName] = modelConfig;
            providerModels[modelName].is_custom = true;
          }
        }
      }
      appConfig[provider].models = providerModels;
    }

    if (appConfig.jaaz) {
      appConfig.jaaz.url = getJaazUrl();
    }
  } catch (e) {
    console.error(`Error loading config: ${e.message}`);
  }
}

export function getConfig() {
  if (appConfig.jaaz) {
    appConfig.jaaz.url = getJaazUrl();
  }
  return appConfig;
}

export async function updateConfig(data) {
  try {
    if (data.jaaz) {
      data.jaaz.url = getJaazUrl();
    }

    const dir = path.dirname(configFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(configFilePath, toml.stringify(data));
    appConfig = data;

    return {
      status: 'success',
      message: 'Configuration updated successfully',
    };
  } catch (e) {
    console.error(e);
    return { status: 'error', message: e.message };
  }
}

export function existsConfig() {
  return fs.existsSync(configFilePath);
}
