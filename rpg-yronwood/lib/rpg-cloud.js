import { get, ref, remove, set } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { ensureFirebaseReady } from "./firebase-browser";
import { prepareCampaignForRtdb } from "./rtdb-util";

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

export async function cloudSaveCampaign(campaign) {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error };
  if (!campaign?.id) return { ok: false, error: "Campanha sem ID." };

  try {
    const now = new Date().toISOString();
    const pathRef = campaignRef(db, user.uid, campaign.id);
    const existingSnap = await get(pathRef);
    const payload = prepareCampaignForRtdb({
      ...campaign,
      id: String(campaign.id),
      updatedAt: now,
      createdAt: existingSnap.exists() ? existingSnap.val()?.createdAt || now : now,
    });
    await set(pathRef, payload);
    return { ok: true };
  } catch (err) {
    console.error("cloudSaveCampaign:", err);
    const code = err.code || "";
    if (code === "PERMISSION_DENIED" || code === "permission-denied") {
      return {
        ok: false,
        error:
          "Sem permissão no Realtime Database. Publique firebase/database.rules.json e confirme que está logado.",
      };
    }
    return { ok: false, error: err.message || "Erro ao salvar campanha." };
  }
}

export async function cloudLoadCampaign(id) {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error, data: null };

  try {
    const snap = await get(campaignRef(db, user.uid, id));
    if (!snap.exists()) {
      return { ok: false, error: "Campanha não encontrada.", data: null };
    }
    return { ok: true, data: snap.val() };
  } catch (err) {
    return { ok: false, error: err.message, data: null };
  }
}

export async function cloudListCampaigns() {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error, data: [] };

  try {
    const snap = await get(campaignsRef(db, user.uid));
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
    return { ok: false, error: err.message, data: [] };
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
