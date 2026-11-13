import { get, ref, remove, runTransaction, set } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { ensureFirebaseReady } from "./firebase-browser";
import { cloudWriteIsStale, interpretSaveTransaction, prepareCampaignForRtdb } from "./rtdb-util";
import { explainCloudError } from "./cloud-errors.mjs";

export { explainCloudError };

async function waitForUser(auth, timeoutMs = 5000) {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        unsub();
        resolve(null);
      }
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!done && user) {
        done = true;
        clearTimeout(timer);
        unsub();
        resolve(user);
      }
    });
  });
}

async function getClient() {
  const { auth, db, error } = await ensureFirebaseReady();
  if (error) return { db: null, user: null, error };
  const user = await waitForUser(auth);
  if (!user) return { db, user: null, error: "Faça login para continuar." };
  return { db, user, error: null };
}

function campaignsRef(db, userId) {
  return ref(db, `users/${userId}/campaigns`);
}

function campaignRef(db, userId, campaignId) {
  return ref(db, `users/${userId}/campaigns/${String(campaignId)}`);
}

function withTimeout(promise, ms, label = "timeout") {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error(label), { code: "TIMEOUT" })), ms); }),
  ]).finally(() => clearTimeout(timer));
}

export async function cloudSaveCampaign(campaign) {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, code: "AUTH", error };
  if (!campaign?.id) return { ok: false, error: "Campanha sem ID." };

  try {
    const now = new Date().toISOString();
    const pathRef = campaignRef(db, user.uid, campaign.id);
    const payload = prepareCampaignForRtdb({
      ...campaign,
      id: String(campaign.id),
      updatedAt: campaign.updatedAt || now,
    });
    // Sem baixar a campanha inteira antes: a data de criação vem da própria transação.
    const commit = async () => {
      let staleWrite = false;
      const result = await runTransaction(pathRef, (current) => {
        if (cloudWriteIsStale(current, payload)) {
          staleWrite = true;
          return;
        }
        staleWrite = false;
        return { ...payload, createdAt: current?.createdAt || payload.createdAt || now };
      }, { applyLocally: false });
      return { committed: result.committed, staleWrite };
    };
    let outcome = await withTimeout(commit(), 25000);
    if (!outcome.committed && !outcome.staleWrite) outcome = await withTimeout(commit(), 25000);
    return interpretSaveTransaction(outcome);
  } catch (err) {
    console.error("cloudSaveCampaign:", err);
    const info = explainCloudError(err);
    return { ok: false, code: info.code, error: info.error, fix: info.fix };
  }
}

/** Teste rápido: grava e lê um valor pequeno na área do jogador. */
export async function cloudPing() {
  const started = Date.now();
  const { db, user, error } = await getClient();
  if (error) return { ok: false, code: "AUTH", error, fix: "Entre na sua conta e tente de novo." };
  try {
    const pingRef = ref(db, `users/${user.uid}/sessao/ping`);
    await withTimeout(set(pingRef, { at: started }), 12000);
    const snap = await withTimeout(get(pingRef), 12000);
    if (snap.val()?.at !== started) throw new Error("A leitura não bateu com a gravação.");
    return { ok: true, ms: Date.now() - started };
  } catch (err) {
    return { ok: false, ...explainCloudError(err) };
  }
}

export async function cloudLoadCampaign(id) {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error, data: null };

  try {
    const snap = await withTimeout(get(campaignRef(db, user.uid, id)), 20000);
    if (!snap.exists()) {
      return { ok: false, error: "Campanha não encontrada.", data: null };
    }
    return { ok: true, data: snap.val() };
  } catch (err) {
    return { ok: false, error: explainCloudError(err).error, data: null };
  }
}

export async function cloudListCampaigns() {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error, data: [] };

  try {
    const snap = await withTimeout(get(campaignsRef(db, user.uid)), 20000);
    if (!snap.exists()) return { ok: true, data: [] };

    const data = Object.values(snap.val() || {})
      .map((r) => ({
        id: r.id,
        world: r.world,
        charName: r.charName,
        updatedAt: r.updatedAt,
        createdAt: r.createdAt,
      }))
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: explainCloudError(err).error, data: [] };
  }
}

export async function cloudDeleteCampaign(id) {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error };

  try {
    await remove(campaignRef(db, user.uid, id));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || "Erro ao apagar." };
  }
}

export async function cloudHealthCheck() {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error };

  try {
    await get(campaignsRef(db, user.uid));
    return { ok: true, userId: user.uid };
  } catch (err) {
    const code = err.code || "";
    if (code === "PERMISSION_DENIED" || code === "permission-denied") {
      return {
        ok: false,
        error:
          "Realtime Database sem permissão. Publique as rules em firebase/database.rules.json no console.",
      };
    }
    return { ok: false, error: err.message };
  }
}

// ─── Histórias criadas pelo jogador (modelos) ─────────────────────────
function templatesRef(db, userId, id) {
  return ref(db, id ? `users/${userId}/templates/${String(id)}` : `users/${userId}/templates`);
}

export async function cloudSaveTemplate(template) {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error };
  if (!template?.id) return { ok: false, error: "Modelo sem ID." };
  try {
    await set(templatesRef(db, user.uid, template.id), JSON.parse(JSON.stringify(template)));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || "Erro ao salvar a história." };
  }
}

export async function cloudListTemplates() {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error, data: [] };
  try {
    const snap = await get(templatesRef(db, user.uid));
    const data = snap.exists() ? Object.values(snap.val() || {}) : [];
    data.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message, data: [] };
  }
}

export async function cloudDeleteTemplate(id) {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error };
  try {
    await remove(templatesRef(db, user.uid, id));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || "Erro ao apagar a história." };
  }
}
