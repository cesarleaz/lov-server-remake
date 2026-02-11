# Database Schema & Migrations

## Overview
The project uses SQLite for persistence. Migrations ensure the schema evolves correctly.

## Tables

### `db_version`
- `version`: INTEGER PRIMARY KEY

### `canvases`
- `id`: TEXT PRIMARY KEY
- `name`: TEXT NOT NULL
- `data`: TEXT (JSON)
- `description`: TEXT
- `thumbnail`: TEXT
- `created_at`: TEXT (ISO8601)
- `updated_at`: TEXT (ISO8601)

### `chat_sessions`
- `id`: TEXT PRIMARY KEY
- `canvas_id`: TEXT (Foreign Key -> canvases.id)
- `title`: TEXT
- `model`: TEXT
- `provider`: TEXT
- `created_at`: TEXT (ISO8601)
- `updated_at`: TEXT (ISO8601)

### `chat_messages`
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `session_id`: TEXT (Foreign Key -> chat_sessions.id)
- `role`: TEXT ('user', 'assistant', 'tool', 'system')
- `message`: TEXT (JSON serialized)
- `created_at`: TEXT (ISO8601)
- `updated_at`: TEXT (ISO8601)

### `comfy_workflows`
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `name`: TEXT NOT NULL
- `api_json`: TEXT (JSON)
- `description`: TEXT
- `inputs`: TEXT (JSON)
- `outputs`: TEXT (JSON)
- `created_at`: TEXT (ISO8601)
- `updated_at`: TEXT (ISO8601)

## Migration Logic
The migration system will check the `db_version` and apply scripts sequentially:
- `v1`: Initial schema (sessions and messages).
- `v2`: Add canvases and link sessions.
- `v3`: Add ComfyUI workflows.
