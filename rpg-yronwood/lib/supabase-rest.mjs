// lib/supabase-rest.mjs — conversa do servidor com o Supabase (REST/PostgREST) usando a chave secreta.
// Só roda no servidor (rotas /api). O navegador nunca recebe a chave.

export const DEFAULT_SUPABASE_URL = "https://yjcxmuybnehbnndvqfyk.supabase.co";

export function httpError(status, message, code) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

// Endereço que respondeu por último (vale enquanto o servidor estiver quente).
let workingBase = "";

const hostOf = (base) => { try { return new URL(base).host; } catch { return String(base || "").slice(0, 80); } };
export const netReason = (error) => error?.cause?.code || (error?.name === "TimeoutError" ? "sem resposta" : error?.message || "falha de rede");

/**
 * Cliente mínimo do PostgREST (REST do Supabase) com a chave secreta, só no servidor.
 * Ordem dos endereços: SUPABASE_URL, o projeto onde as salas foram criadas e, por último,
 * o NEXT_PUBLIC_SUPABASE_URL antigo. Se um endereço nem responde, tenta o próximo.
 */
export function supabaseRest(env = process.env, fetchImpl = fetch) {
  // Aceita também o link do painel ("supabase.com/dashboard/project/<ref>") e o converte no endereço da API.
  const clean = (v) => {
    const raw = String(v || "").trim().replace(/\/+$/, "");
    const ref = raw.match(/supabase\.com\/dashboard\/project\/([a-z0-9]{20})/i)?.[1];
    if (ref) return `https://${ref.toLowerCase()}.supabase.co`;
    if (/^[a-z0-9]{20}$/i.test(raw)) return `https://${raw.toLowerCase()}.supabase.co`;
    return raw.replace(/\/rest\/v1$/, "");
  };
  const bases = [...new Set([clean(env.SUPABASE_URL), DEFAULT_SUPABASE_URL, clean(env.NEXT_PUBLIC_SUPABASE_URL)].filter((b) => /^https:\/\//.test(b)))];
  const key = String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!key) throw httpError(503, "O modo online ainda não foi ligado no servidor (falta SUPABASE_SECRET_KEY na Vercel).", "ONLINE_NOT_CONFIGURED");
  const headers = { apikey: key, "Content-Type": "application/json" };
  // Chave antiga (JWT "eyJ...") também precisa ir no Authorization.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  const tried = [];
  let usedHost = "";
  const call = async (path, { method = "GET", body, prefer } = {}) => {
    const order = bases.includes(workingBase) ? [workingBase, ...bases.filter((b) => b !== workingBase)] : bases;
    let lastError = null;
    for (const base of order) {
      let res;
      try {
        res = await fetchImpl(`${base}/rest/v1/${path}`, {
          method,
          headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (error) {
        lastError = error;
        tried.push({ host: hostOf(base), error: netReason(error) });
        continue;
      }
      const text = await res.text();
      let data = null;
      let isJson = true;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; isJson = false; }
      // Página HTML no lugar da API: endereço errado, tenta o próximo.
      if (!res.ok && !isJson) {
        lastError = new Error(`respondeu ${res.status} sem ser a API`);
        tried.push({ host: hostOf(base), error: `respondeu ${res.status} sem ser a API` });
        continue;
      }
      workingBase = base;
      usedHost = hostOf(base);
      if (!res.ok) {
        const msg = data?.message || data?.error || `Supabase respondeu ${res.status}`;
        throw httpError(res.status === 409 ? 409 : 502, msg, res.status === 409 ? "CONFLICT" : "ONLINE_ERROR");
      }
      return data;
    }
    const where = tried.map((t) => `${t.host}: ${t.error}`).join("; ");
    throw httpError(502, `O servidor não conseguiu alcançar o Supabase (${where || netReason(lastError)}).`, "ONLINE_UNREACHABLE");
  };
  return {
    select: (table, query) => call(`${table}?${query}`),
    insert: (table, row) => call(table, { method: "POST", body: row, prefer: "return=representation" }),
    update: (table, query, patch) => call(`${table}?${query}`, { method: "PATCH", body: patch, prefer: "return=representation" }),
    remove: (table, query) => call(`${table}?${query}`, { method: "DELETE", prefer: "return=representation" }),
    upsert: (table, row, onConflict) => call(`${table}?on_conflict=${encodeURIComponent(onConflict)}`, { method: "POST", body: row, prefer: "resolution=merge-duplicates,return=minimal" }),
    info: () => ({ host: usedHost, tried: [...tried], candidates: bases.map(hostOf) }),
  };
}
