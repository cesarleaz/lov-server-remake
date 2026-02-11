import fs from 'fs';
import path from 'path';
import { SETTINGS_PATH as settingsFilePath } from '../constants.js';

const DEFAULT_SETTINGS = {
  proxy: 'system',
  enabled_knowledge: [],
  enabled_knowledge_data: []
};

let appSettings = {};

export function existsSettings() {
  return fs.existsSync(settingsFilePath);
}

export function getSettings() {
  try {
    if (!fs.existsSync(settingsFilePath)) {
      createDefaultSettings();
    }

    const content = fs.readFileSync(settingsFilePath, 'utf8');
    const settings = JSON.parse(content);

    const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
    appSettings = mergedSettings;
    return mergedSettings;
  } catch (e) {
    console.error(`Error loading settings: ${e.message}`);
    return { ...DEFAULT_SETTINGS };
  }
}

export function getRawSettings() {
  return getSettings();
}

export function getProxyConfig() {
  const settings = getRawSettings();
  return settings.proxy || 'system';
}

export function createDefaultSettings() {
  try {
    const dir = path.dirname(settingsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(settingsFilePath, JSON.stringify(DEFAULT_SETTINGS, null, 2));
  } catch (e) {
    console.error(`Error creating default settings: ${e.message}`);
  }
}

export async function updateSettings(data) {
  try {
    let existingSettings = { ...DEFAULT_SETTINGS };
    if (fs.existsSync(settingsFilePath)) {
      try {
        const content = fs.readFileSync(settingsFilePath, 'utf8');
        existingSettings = JSON.parse(content);
      } catch (e) {
        console.error(`Error reading existing settings: ${e.message}`);
      }
    }

    for (const [key, value] of Object.entries(data)) {
      if (
        existingSettings[key] &&
        typeof existingSettings[key] === 'object' &&
        !Array.isArray(existingSettings[key]) &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        existingSettings[key] = { ...existingSettings[key], ...value };
      } else {
        existingSettings[key] = value;
      }
    }

    const dir = path.dirname(settingsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(settingsFilePath, JSON.stringify(existingSettings, null, 2));
    appSettings = existingSettings;

    return { status: 'success', message: 'Settings updated successfully' };
  } catch (e) {
    console.error(e);
    return { status: 'error', message: e.message };
  }
}

export async function updateProxy(proxy) {
  return updateSettings({ proxy });
}

export function getEnabledKnowledge() {
  const settings = getSettings();
  return settings.enabled_knowledge || [];
}

// Initialize on import
getRawSettings();
