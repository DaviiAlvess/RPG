/** One request, including body reading, with a bounded wait and no blind retries. */
export async function requestJson(url, options = {}, { timeoutMs = 35000, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  let timer;
  try {
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        const error = new Error('A conexão com o Mestre demorou demais. Sua ação foi preservada; tente novamente.');
        error.code = 'CLIENT_TIMEOUT';
        reject(error);
      }, timeoutMs);
    });
    const request = (async () => {
      const response = await fetchImpl(url, { ...options, signal: controller.signal });
      let data;
      try { data = await response.json(); }
      catch {
        const error = new Error(response.status === 504
          ? 'O servidor excedeu o tempo de resposta. Sua ação foi preservada.'
          : 'O servidor retornou uma resposta inválida. Sua ação foi preservada.');
        error.code = 'INVALID_RESPONSE';
        throw error;
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        const error = new Error('O servidor retornou dados inválidos. Sua ação foi preservada.');
        error.code = 'INVALID_RESPONSE';
        throw error;
      }
      if (response.status === 429 && !data.retryAfter) data.retryAfter = Number(response.headers?.get?.('Retry-After')) || 30;
      return { ok: response.ok, status: response.status, headers: response.headers, json: async () => data };
    })();
    return await Promise.race([request, deadline]);
  } catch (error) {
    if (error.code) throw error;
    const failure = new Error('Não foi possível conectar ao Mestre. Confira sua conexão e tente novamente.');
    failure.code = 'CLIENT_NETWORK';
    throw failure;
  } finally { clearTimeout(timer); }
}
