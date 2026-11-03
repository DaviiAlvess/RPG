// ─── Texto em tempo real no navegador ─────────────────────────────────
// Lê a transmissão da rota do Mestre (eventos "data: {...}") e entrega o texto
// acumulado a cada pedaço. Qualquer falha lança erro: quem chama refaz o pedido
// pelo caminho normal, sem perder a ação do jogador.

export function parseStreamEvents(buffer) {
  const events = [];
  const parts = String(buffer || "").split(/\r?\n\r?\n/);
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    const data = part.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
    if (!data) continue;
    try { events.push(JSON.parse(data)); } catch {}
  }
  return { events, rest };
}

function streamError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/** Lê a transmissão até o fim. onText(textoAcumulado) é chamado a cada pedaço. */
export async function readNarrationStream(response, onText = () => {}) {
  if (!response?.body?.getReader) throw streamError("Transmissão indisponível.", "STREAM_UNAVAILABLE");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let done = false;
  const handle = (events) => {
    for (const event of events) {
      if (event?.error) throw streamError(event.error, event.code || "STREAM_ERROR");
      if (typeof event?.t === "string" && event.t) {
        text += event.t;
        onText(text);
      }
      if (event?.done) done = true;
    }
  };
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const parsed = parseStreamEvents(buffer);
    buffer = parsed.rest;
    handle(parsed.events);
  }
  handle(parseStreamEvents(`${buffer}\n\n`).events);
  if (!done || !text) throw streamError("A transmissão terminou antes da hora.", "STREAM_INCOMPLETE");
  return text;
}

/**
 * Esconde o que ainda está pela metade no fim do texto parcial:
 * uma tag oculta aberta ("[PISTA:Pre…") ou a linha do IMAGE_PROMPT.
 */
export function visiblePartial(raw) {
  let text = String(raw || "");
  const open = text.lastIndexOf("[");
  if (open > text.lastIndexOf("]")) text = text.slice(0, open);
  text = text.replace(/(^|\n)\s*IMAGE[_ ]?PROMPT[^\n]*$/i, "$1").replace(/(^|\n)\s*IMAGE[_ ]?P?R?O?M?P?T?$/i, "$1");
  return text;
}
