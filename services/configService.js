import fs from 'fs';
import path from 'path';
import toml from '@iarna/toml';
import { CONFIG_PATH as configFilePath, USER_DATA_DIR } from '../constants.js';

export const FILES_DIR = path.join(USER_DATA_DIR, 'files');

const DEFAULT_PROVIDERS_CONFIG = {
  google: {
    models: {
      'gemini-2.5-pro': { type: 'text' },
      'gemini-2.5-flash': { type: 'text' },
    },
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/',
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

function migrateLegacyConfig(config = {}) {
  const migratedConfig = { ...config };

  // Legacy provider: jaaz -> google
  if (migratedConfig.jaaz) {
    const legacyJaaz = migratedConfig.jaaz;

    if (!migratedConfig.google) {
      migratedConfig.google = {
        ...DEFAULT_PROVIDERS_CONFIG.google,
        api_key: legacyJaaz.api_key || '',
      };

      if (legacyJaaz.max_tokens !== undefined) {
        migratedConfig.google.max_tokens = legacyJaaz.max_tokens;
      }
    }

    delete migratedConfig.jaaz;
  }

  return migratedConfig;
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
    const parsedConfig = toml.parse(content);
    const config = migrateLegacyConfig(parsedConfig);

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
  } catch (e) {
    console.error(`Error loading config: ${e.message}`);
  }
}

export function getConfig() {
  return appConfig;
}

export async function updateConfig(data) {
  try {
    const migratedData = migrateLegacyConfig(data);

    const dir = path.dirname(configFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(configFilePath, toml.stringify(migratedData));
    appConfig = migratedData;

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
