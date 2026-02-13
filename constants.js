import * as path from 'node:path'

const SERVER_DIR = path.dirname(new URL(import.meta.url).pathname);

export const {
    PORT = 57988,
    UI_DIST_DIR = path.join(process.cwd(), '../react/dist'),
    WORKSPACE_ROOT = path.join(process.cwd(), 'workspace'),
    OLLAMA_HOST = 'http://localhost:11434',
    USER_DATA_DIR = path.join(SERVER_DIR, 'user_data'),
    FILES_DIR = path.join(USER_DATA_DIR, 'files'),
    BASE_API_URL = 'https://jaaz.app',
    CONFIG_PATH = path.join(USER_DATA_DIR, 'config.toml'),
    MONGODB_URI = 'mongodb://localhost:27017/localmanus',
    SETTINGS_PATH = path.join(USER_DATA_DIR, 'settings.json'),

    // Google Cloud
    VERTEX_API_KEY,
} = process.env
