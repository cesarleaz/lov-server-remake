function mergeAbortSignals(signals) {
  const validSignals = signals.filter(Boolean);
  if (validSignals.length === 0) return undefined;
  if (validSignals.length === 1) return validSignals[0];

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const signal of validSignals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}

export async function fetchWithTimeout(url, options = {}) {
  const { timeout = 30000, signal, ...fetchOptions } = options;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);
  const mergedSignal = mergeAbortSignals([signal, timeoutController.signal]);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: mergedSignal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
