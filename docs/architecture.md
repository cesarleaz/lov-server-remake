# Migration Architecture: Python to Express.js

## Overview
This document describes the architectural changes and mapping between the original Python FastAPI backend and the new Express.js backend.

## Technology Stack Transition

| Component | Python Stack | Express.js Stack |
|-----------|--------------|-------------------|
| Web Framework | FastAPI | Express.js |
| Language | Python 3.x | JavaScript (ESM) |
| Runtime | Uvicorn | Node.js |
| AI Orchestration | LangGraph / LangChain | Custom JS Agent System |
| Real-time | python-socketio | socket.io |
| Database | aiosqlite / sqlite3 | sqlite3 / sqlite |
| Configuration | TOML (toml) | @iarna/toml |
| HTTP Client | httpx / requests | fetch (Native/Node-fetch) |

## Directory Structure Mapping

| Python Directory | Express.js Directory |
|------------------|----------------------|
| `routers/` | `routes/` |
| `services/` | `services/` |
| `tools/` | `tools/` |
| `models/` | (Types defined in JS or JSDoc) |
| `utils/` | `utils/` |
| `main.py` | `server.js` |

## Key Architectural Principles for the Migration
1. **ESModules**: Use `import/export` instead of `require`.
2. **Modular Functions**: Avoid classes; use functional modules.
3. **Internal Agent System**: Implement agent logic (planning, tool calling, handoffs) directly in JS to remove LangChain dependency.
4. **Native Fetch**: Use the built-in `fetch` API for all external LLM and tool calls.
5. **CamelCase**: All JavaScript variables and function names should use `camelCase`.
