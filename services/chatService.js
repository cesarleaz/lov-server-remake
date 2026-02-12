import { createChatSession, createMessage } from './dbService.js';
import { runSwarm } from './agentService.js';
import { sendToWebsocket } from './websocketService.js';

const activeTasks = new Map();

function getLastAssistantMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'assistant') return messages[i];
  }
  return null;
}

async function handleTask(data, taskType = 'chat') {
  const { messages, session_id, canvas_id, text_model, tool_list, system_prompt } = data;

  // console.log({ data: JSON.stringify(data, null, 2) })

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages is required');
  }

  if (messages.length === 1) {
    const prompt = messages[0].content?.text || '';
    await createChatSession(session_id, text_model.model, text_model.provider, canvas_id, prompt.substring(0, 200));
  }

  const lastMessage = messages[messages.length - 1];
  await createMessage(session_id, lastMessage.role, lastMessage);

  const abortController = new AbortController();
  const context = {
    session_id,
    canvas_id,
    text_model,
    tool_list,
    system_prompt,
    task_type: taskType,
    abortSignal: abortController.signal
  };

  const swarmPromise = runSwarm(messages, context, (update) => {
    sendToWebsocket(session_id, update);
  });

  activeTasks.set(session_id, { promise: swarmPromise, abortController });

  try {
    const finalMessages = await swarmPromise;
    const lastAssistantMessage = getLastAssistantMessage(finalMessages);

    if (lastAssistantMessage) {
      await createMessage(session_id, 'assistant', lastAssistantMessage);
    }

    if (taskType === 'magic' && lastAssistantMessage) {
      await sendToWebsocket(session_id, {
        type: 'all_messages',
        messages: [...messages, lastAssistantMessage]
      });
    }
  } catch (error) {
    if (abortController.signal.aborted) {
      sendToWebsocket(session_id, { type: 'cancelled', task_type: taskType });
    } else {
      console.error(`Error in swarm: ${error.message}`);
      sendToWebsocket(session_id, { type: 'error', error: error.message });
    }
  } finally {
    activeTasks.delete(session_id);
    sendToWebsocket(session_id, { type: 'done', task_type: taskType });
  }
}

export async function handleChat(data) {
  return handleTask(data, 'chat');
}

export async function handleMagic(data) {
  return handleTask(data, 'magic');
}

function cancelTask(sessionId) {
  const taskRef = activeTasks.get(sessionId);
  if (!taskRef) return false;
  taskRef.abortController.abort();
  activeTasks.delete(sessionId);
  return true;
}

export function cancelChat(sessionId) {
  return cancelTask(sessionId);
}

export function cancelMagic(sessionId) {
  return cancelTask(sessionId);
}
