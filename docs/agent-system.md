# Internal Agent System (No LangChain)

## Overview
The new system replaces LangGraph Swarm with a custom implementation using native JavaScript and `fetch`.

## Components

### 1. Swarm Orchestrator
A loop that maintains the "active agent" and manages the conversation flow between agents and tools.

```javascript
async function runSwarm(messages, context) {
  let activeAgent = determineStartingAgent(messages);
  let currentMessages = [...messages];

  while (true) {
    // 1. Call LLM with activeAgent's system prompt and tools
    const response = await callLLM(activeAgent, currentMessages);

    // 2. Handle Tool Calls
    if (response.toolCalls) {
      for (const toolCall of response.toolCalls) {
        if (isHandoffTool(toolCall)) {
          activeAgent = switchAgent(toolCall);
        } else {
          const toolResult = await executeTool(toolCall, context);
          currentMessages.push({ role: 'tool', content: toolResult, tool_call_id: toolCall.id });
        }
      }
    } else {
      // 3. Final response from assistant
      return response.content;
    }
  }
}
```

### 2. Agents
Agents are defined by their system prompts and the subset of tools they can access.
- **Planner**: Designs the execution plan and hands off to the creator.
- **Image/Video Creator**: Executes generation tools.

### 3. Tool Handoffs
Handoffs are implemented as specialized tools. When an agent calls a `transfer_to_X` tool, the orchestrator updates the `activeAgent` for the next LLM call.

### 4. LLM Interface
A generic `callLLM` function that uses `fetch` to talk to OpenAI, Anthropic, or Ollama, following the specific provider's API format but abstracting it for the orchestrator.

## State Management
The agent state is primarily the conversation history. Context like `canvasId` and `sessionId` is passed to tools but usually not to the LLM itself unless part of the prompt.
