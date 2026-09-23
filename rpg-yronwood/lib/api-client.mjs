const GM_ERROR_FALLBACKS = {
  RATE_LIMIT: 'A cota da IA esgotou. Aguarde o intervalo indicado e tente de novo; se persistir, confira a cota no Google AI Studio.',
  TIMEOUT: 'O Mestre demorou para responder. Tente novamente; o que já foi combinado permanece.',
  CLIENT_TIMEOUT: 'A conexão com o Mestre demorou demais. Tente novamente; o que já foi combinado permanece.',
  NO_API_KEY: 'O servidor está sem chave de IA (GEMINI_API_KEY). Configure a chave e publique novamente o site.',
  MODEL_UNAVAILABLE: 'O modelo do Mestre não está disponível. Atualize GEMINI_MODEL no servidor e publique novamente o site.',
  API_AUTH: 'A chave de IA foi recusada ou está sem permissão. Confira a GEMINI_API_KEY no servidor.',
  EMPTY_RESPONSE: 'O Mestre retornou uma resposta vazia. Sua ação foi preservada; tente novamente.',
  UPSTREAM_UNAVAILABLE: 'O serviço de IA está temporariamente indisponível. Tente novamente em instantes.',
  UPSTREAM_RESPONSE: 'O serviço de IA retornou uma resposta inválida. Tente novamente em instantes.',
};

/** Client wait: a little longer than the server Gemini deadline, under Vercel maxDuration 60s. */
export const GM_CLIENT_TIMEOUT_MS = 58000;

export function retryAfterWaitMs(retryAfter, capMs = 4000) {
  const sec = Math.min(300, Math.max(0, Number(retryAfter) || 0));
  if (sec <= 0) return 0;
  return Math.min(sec * 1000, capMs);
}

export function gmRequestError(data, status, fallback) {
  const code = data?.code;
  const retryAfter = data?.retryAfter;
  let message = typeof data?.error === 'string' && data.error.trim() ? data.error.trim() : '';
  if (!message) {
    if (code && GM_ERROR_FALLBACKS[code]) message = GM_ERROR_FALLBACKS[code];
    else if (status === 429) message = GM_ERROR_FALLBACKS.RATE_LIMIT;
    else if (status === 504) message = 'O servidor demorou para responder. Tente novamente; o que já foi combinado permanece.';
    else message = fallback || 'O servidor retornou uma resposta inválida. Tente novamente em instantes.';
  }
  const error = new Error(message);
  error.code = code || 'API_ERROR';
  error.retryAfter = retryAfter;
  return error;
}

export function isGmApiUrl(url) {
  return String(url || '').includes('/api/gm');
}

export function isRetryableGmTimeout(error, response) {
  if (error?.code === 'CLIENT_TIMEOUT' || error?.code === 'TIMEOUT') return true;
  if (Number(error?.status) === 504 || Number(response?.status) === 504) return true;
  return false;
}

function clientTimeoutError() {
  const error = new Error('A conexão com o Mestre demorou demais. Tente novamente; o que já foi combinado permanece.');
  error.code = 'CLIENT_TIMEOUT';
  error.status = 504;
  return error;
}

async function requestJsonOnce(url, options, { timeoutMs, fetchImpl }) {
  const controller = new AbortController();
  let timer;
  try {
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(clientTimeoutError());
      }, timeoutMs);
    });
    const request = (async () => {
      const response = await fetchImpl(url, { ...options, signal: controller.signal });
      let data;
      try { data = await response.json(); }
      catch {
        const error = new Error(response.status === 504
          ? 'O servidor excedeu o tempo de resposta. Tente novamente; o que já foi combinado permanece.'
          : 'O servidor retornou uma resposta inválida. Sua ação foi preservada.');
        error.code = 'INVALID_RESPONSE';
        error.status = response.status;
        throw error;
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        const error = new Error('O servidor retornou dados inválidos. Sua ação foi preservada.');
        error.code = 'INVALID_RESPONSE';
        error.status = response.status;
        throw error;
      }
      if (response.status === 429 && !data.retryAfter) data.retryAfter = Number(response.headers?.get?.('Retry-After')) || 30;
      return { ok: response.ok, status: response.status, headers: response.headers, json: async () => data };
    })();
    return await Promise.race([request, deadline]);
  } catch (error) {
    if (error.code) throw error;
    if (error.name === 'AbortError' || controller.signal.aborted) throw clientTimeoutError();
    const failure = new Error('Não foi possível conectar ao Mestre. Confira sua conexão e tente novamente.');
    failure.code = 'CLIENT_NETWORK';
    throw failure;
  } finally { clearTimeout(timer); }
}

/** One request, including body reading, with a bounded wait. Retries /api/gm 429 and timeout once. */
export async function requestJson(url, options = {}, {
  timeoutMs = GM_CLIENT_TIMEOUT_MS,
  fetchImpl = fetch,
  sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  retryOnce = true,
  maxRetryWaitMs = 4000,
} = {}) {
  const once = () => requestJsonOnce(url, options, { timeoutMs, fetchImpl });
  try {
    const first = await once();
    if (first.ok || !retryOnce) return first;
    const data = await first.json();
    const retryAfter = Number(data.retryAfter) || 0;
    if (retryAfter > 0) {
      const waitMs = retryAfterWaitMs(retryAfter, maxRetryWaitMs);
      if (waitMs > 0) await sleep(waitMs);
      return once();
    }
    if (isGmApiUrl(url) && isRetryableGmTimeout({ code: data.code, status: first.status }, first)) {
      return once();
    }
    return first;
  } catch (error) {
    if (retryOnce && isGmApiUrl(url) && isRetryableGmTimeout(error)) {
      return once();
    }
    throw error;
  }
}
