# API Routes Documentation

## Base URL: `/api`

### Root Router
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/list_models` | Lists all available LLM models from configured providers. |
| GET | `/list_tools` | Lists all registered tools (excluding system tools). |
| GET | `/list_chat_sessions` | Returns all chat sessions. |
| GET | `/chat_session/:session_id` | Returns history for a specific session. |

### Chat Router
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat` | Handles incoming chat requests. Initiates the agent swarm. |
| POST | `/cancel/:session_id` | Cancels an ongoing chat stream for a session. |
| POST | `/magic` | Handles magic generation requests (likely a specialized agent flow). |
| POST | `/magic/cancel/:session_id` | Cancels an ongoing magic generation task. |

### Config Router
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/config/exists` | Checks if `config.toml` exists. |
| GET | `/config` | Returns the current application configuration. |
| POST | `/config` | Updates the application configuration and re-initializes tools. |

### Settings Router
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings/exists` | Checks if `settings.json` exists. |
| GET | `/settings` | Returns all application settings (proxy, system prompts, etc.). |
| POST | `/settings` | Updates application settings. |
| GET | `/settings/proxy/status` | Returns the status of the proxy configuration. |
| GET | `/settings/proxy` | Returns proxy-specific settings. |
| POST | `/settings/proxy` | Updates proxy settings. |
| POST | `/settings/comfyui/create_workflow` | Saves a new ComfyUI workflow to the database. |
| GET | `/settings/comfyui/list_workflows` | Lists all saved ComfyUI workflows. |
| DELETE | `/settings/comfyui/delete_workflow/:id` | Deletes a ComfyUI workflow. |
| POST | `/settings/comfyui/proxy` | Proxies requests to a ComfyUI server. |
| GET | `/settings/knowledge/enabled` | Returns the list of enabled knowledge bases. |
| GET | `/settings/my_assets_dir_path` | Returns the path to the user's assets directory. |

### WebSocket (Socket.IO)
- **Path**: `/socket.io`
- **Events**:
  - `connection`: Client connects.
  - `join`: Join a session-specific room.
  - `message`: (Outgoing) Streams agent responses, tool calls, and status updates.


### V1 Task & Generation Router
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/image` | Creates an image generation task and returns `task_id` immediately. |
| POST | `/v1/magic` | Creates a magic generation task and returns `task_id` immediately. |
| POST | `/v1/video` | Creates a video generation task and returns `task_id` immediately. |
| GET | `/v1/video/status/:task_id` | Returns status/progress for a video task (or any existing task id). |
| GET | `/v1/task/search?task_id=...` | Searches tasks by a single id or comma-separated `task_ids`. |
