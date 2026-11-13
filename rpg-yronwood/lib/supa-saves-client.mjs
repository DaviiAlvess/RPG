// lib/supa-saves-client.mjs — lado do navegador dos saves no Supabase (via /api/saves).
// Compacta a campanha antes de enviar: a Vercel aceita até ~4 MB por pedido.

const SEND_LIMIT = 3.6 * 1024 * 1024;

export const canGzip = () => typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function gzipToBase64(text) {
  if (!canGzip()) return null;
  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    return bytesToBase64(new Uint8Array(await new Response(stream).arrayBuffer()));
  } catch {
    return null;
  }
}

export async function gunzipBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

/** Tira os saves manuais mais antigos até caber (só quando nem compactada a campanha cabe). */
function dropOldestSaves(camp) {
  if (!Array.isArray(camp.saves) || !camp.saves.length) return null;
  return { ...camp, saves: camp.saves.slice(Math.max(1, Math.floor(camp.saves.length / 2))) };
}

/** Monta o pedido de salvar: compactado quando o aparelho sabe; senão, a campanha como objeto. */
export async function buildSaveBody(camp) {
  let current = camp;
  for (let round = 0; round < 8 && current; round++) {
    const json = JSON.stringify(current);
    const gz = await gzipToBase64(json);
    if (gz && gz.length < SEND_LIMIT) return { action: "save", id: String(camp.id), updatedAt: camp.updatedAt, gz, trimmed: current !== camp };
    if (!gz && json.length < SEND_LIMIT) return { action: "save", id: String(camp.id), updatedAt: camp.updatedAt, campaign: current, trimmed: current !== camp };
    current = dropOldestSaves(current);
  }
  throw Object.assign(new Error("A história ficou grande demais para a nuvem do Supabase."), { code: "TOO_LARGE" });
}

/** Lê a resposta de "abrir" (compactada ou não). */
export async function readLoadedCampaign(reply) {
  if (reply?.gz) return JSON.parse(await gunzipBase64(reply.gz));
  return reply?.data ?? null;
}

/** Monta a frase do status a partir do estado de cada nuvem. */
export function cloudStatusText({ firebase = "idle", supabase = "idle", local = false, conflict = false } = {}) {
  if (conflict) return "Nuvem mais recente — reabra a campanha";
  const ok = [firebase === "ok" && "Firebase", supabase === "ok" && "Supabase"].filter(Boolean);
  const syncing = firebase === "sync" || supabase === "sync";
  if (ok.length === 2) return "Salvo na nuvem";
  if (ok.length === 1) return `Salvo na nuvem (${ok[0]})${syncing ? " · sincronizando…" : ""}`;
  if (syncing) return local ? "Salvo neste aparelho · sincronizando…" : "Sincronizando…";
  return local ? "Salvo neste aparelho · nuvem pendente" : "Falha ao salvar — tente novamente";
}
