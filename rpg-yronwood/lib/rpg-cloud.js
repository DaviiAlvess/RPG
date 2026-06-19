import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ensureFirebaseReady } from "./firebase-browser";
import { prepareCampaignForFirestore } from "./firestore-util";

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

function campaignRef(db, userId, campaignId) {
  return doc(db, "users", userId, "campaigns", String(campaignId));
}

export async function cloudSaveCampaign(campaign) {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error };
  if (!campaign?.id) return { ok: false, error: "Campanha sem ID." };

  try {
    const now = new Date().toISOString();
    const ref = campaignRef(db, user.uid, campaign.id);
    const existing = await getDoc(ref);
    const payload = prepareCampaignForFirestore({
      ...campaign,
      id: String(campaign.id),
      updatedAt: now,
      createdAt: existing.exists() ? existing.data().createdAt || now : now,
    });
    await setDoc(ref, payload);
    return { ok: true };
  } catch (err) {
    console.error("cloudSaveCampaign:", err);
    const code = err.code || "";
    if (code === "permission-denied") {
      return {
        ok: false,
        error: "Sem permissão no Firestore. Publique firebase/firestore.rules e confirme que está logado.",
      };
    }
    return { ok: false, error: err.message || "Erro ao salvar campanha." };
  }
}

export async function cloudLoadCampaign(id) {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error, data: null };

  try {
    const snap = await getDoc(campaignRef(db, user.uid, id));
    if (!snap.exists()) {
      return { ok: false, error: "Campanha não encontrada.", data: null };
    }
    return { ok: true, data: snap.data() };
  } catch (err) {
    return { ok: false, error: err.message, data: null };
  }
}

export async function cloudListCampaigns() {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error, data: [] };

  try {
    const snap = await getDocs(collection(db, "users", user.uid, "campaigns"));
    const data = snap.docs
      .map((d) => {
        const r = d.data();
        return {
          id: r.id,
          world: r.world,
          charName: r.charName,
          updatedAt: r.updatedAt,
          createdAt: r.createdAt,
        };
      })
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
    await deleteDoc(campaignRef(db, user.uid, id));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message || "Erro ao apagar." };
  }
}

export async function cloudHealthCheck() {
  const { db, user, error } = await getClient();
  if (error) return { ok: false, error };

  try {
    await getDocs(collection(db, "users", user.uid, "campaigns"));
    return { ok: true, userId: user.uid };
  } catch (err) {
    const code = err.code || "";
    if (code === "permission-denied") {
      return {
        ok: false,
        error: "Firestore sem permissão. Crie o banco e publique as rules em firebase/firestore.rules.",
      };
    }
    if (code === "not-found" || err.message?.includes("NOT_FOUND")) {
      return {
        ok: false,
        error: "Firestore não criado. No Firebase Console: Build → Firestore → Create database.",
      };
    }
    return { ok: false, error: err.message };
  }
}
