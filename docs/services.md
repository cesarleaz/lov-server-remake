# Services Mapping

## Core Services

### Config Service (`services/configService.js`)
- **Responsibility**: Manages `config.toml`.
- **Functions**:
  - `loadConfig()`: Reads and parses TOML.
  - `getConfig()`: Returns current config.
  - `updateConfig(data)`: Validates and saves config.
  - `existsConfig()`: Check for file existence.

### Settings Service (`services/settingsService.js`)
- **Responsibility**: Manages `settings.json`.
- **Functions**:
  - `getSettings()`: Returns merged settings (with defaults).
  - `updateSettings(data)`: Merges and saves settings.
  - `getProxyConfig()`: Specialized getter for proxy.

### Database Service (`services/dbService.js`)
- **Responsibility**: SQLite interaction and migrations.
- **Functions**:
  - `initDb()`: Handles connection and runs migrations.
  - `createChatSession(sessionData)`
  - `createMessage(messageData)`
  - `getChatHistory(sessionId)`
  - `listSessions(canvasId)`
  - `createComfyWorkflow(...)`, `listComfyWorkflows()`, etc.

### Tool Service (`services/toolService.js`)
- **Responsibility**: Registration and retrieval of agent tools.
- **Functions**:
  - `initialize()`: Registers system and configured provider tools.
  - `getTool(toolId)`: Returns the tool function.
  - `listTools()`: Returns metadata for available tools.

### Chat Service (`services/chatService.js`)
- **Responsibility**: Orchestrates the chat flow.
- **Functions**:
  - `handleChat(data)`: Entry point for `/api/chat`.
  - `handleMagic(data)`: Entry point for `/api/magic`.

### WebSocket Service (`services/websocketService.js`)
- **Responsibility**: Encapsulates Socket.IO interactions.
- **Functions**:
  - `init(server)`: Attaches Socket.IO to Express.
  - `sendToSession(sessionId, payload)`: Emits data to a specific session room.

### Agent Service (`services/agentService.js`)
- **Responsibility**: Implementation of the custom agent swarm.
- **Functions**:
  - `runSwarm(messages, context)`: Main loop for the agent interaction.
  - `executeTool(toolId, args)`: Helper to run a tool and return formatted results.
