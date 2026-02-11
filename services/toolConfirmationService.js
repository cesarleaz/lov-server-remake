const pendingConfirmations = new Map();

export function requestConfirmation({ toolCallId, sessionId, toolName, argumentsData }) {
  pendingConfirmations.set(toolCallId, {
    toolCallId,
    sessionId,
    toolName,
    arguments: argumentsData,
    createdAt: Date.now(),
    confirmed: null
  });
}

export function confirmTool(toolCallId) {
  const request = pendingConfirmations.get(toolCallId);
  if (!request) return false;
  request.confirmed = true;
  return true;
}

export function cancelConfirmation(toolCallId) {
  const request = pendingConfirmations.get(toolCallId);
  if (!request) return false;
  request.confirmed = false;
  return true;
}

export function getPendingRequest(toolCallId) {
  return pendingConfirmations.get(toolCallId) || null;
}
