/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FIREBASE SESSION LAYER — Auth + Salvamento Híbrido (Cloud + Local)
 * SDK Modular Firebase v10+ (sem biblioteca compat)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Princípios:
 *  - onAuthStateChanged é a ÚNICA fonte de verdade da sessão
 *  - Autenticado → RTDB em users/{uid}/sessao
 *  - Anônimo/deslogado → localStorage
 *  - Auto-save com debounce de 1000ms (agrupa escritas)
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getDatabase, ref, set, get } from "firebase/database";

// ─── Configuração ─────────────────────────────────────────────────────────────
// Em produção, prefira variáveis NEXT_PUBLIC_* na Vercel.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC3ImOHIc0ugpnmxsIJbcdfQDuakGAv9rU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "siterpg32.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "siterpg32",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "siterpg32.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "980644619215",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:980644619215:web:5fa7b28d6dd9da84f0e8ba",
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://siterpg32-default-rtdb.firebaseio.com",
};

const LOCAL_STORAGE_KEY = "rpg_sessao_local_v1";
const SAVE_DEBOUNCE_MS = 1000;
const RTDB_SESSION_PATH = (uid) => `users/${uid}/sessao`;

// ─── Estado interno (fonte de verdade derivada do listener) ───────────────────
let firebaseApp = null;
let auth = null;
let db = null;
let currentUser = null;
let authReady = false;
let saveTimeout = null;
let pendingPayload = null;
let authUnsubscribe = null;

/** Ouvintes registrados pela UI (React, vanilla, etc.) */
const sessionListeners = new Set();

function notifyListeners() {
  const snapshot = {
    user: currentUser,
    ready: authReady,
    isAnonymous: !currentUser,
    isAuthenticated: !!currentUser,
  };
  sessionListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error("[firebase-session] listener error:", err);
    }
  });
}

// ─── Inicialização (browser only) ─────────────────────────────────────────────
function ensureFirebase() {
  if (typeof window === "undefined") return false;
  if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) return false;

  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getDatabase(firebaseApp);
  }
  return true;
}

/**
 * Inicia o ouvinte de autenticação.
 * Deve ser chamado UMA vez no boot do app (ex: useEffect em _app ou DOMContentLoaded).
 * Redirecionamentos e carga inicial devem reagir ao callback de subscribeSession.
 *
 * @returns {() => void} função para cancelar o listener
 */
export function initFirebaseSession() {
  if (!ensureFirebase()) {
    authReady = true;
    currentUser = null;
    notifyListeners();
    return () => {};
  }

  if (authUnsubscribe) authUnsubscribe();

  authUnsubscribe = onAuthStateChanged(
    auth,
    (user) => {
      currentUser = user;
      authReady = true;
      notifyListeners();
    },
    (error) => {
      console.error("[firebase-session] onAuthStateChanged:", error);
      authReady = true;
      notifyListeners();
    }
  );

  return () => {
    if (authUnsubscribe) {
      authUnsubscribe();
      authUnsubscribe = null;
    }
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
  };
}

/**
 * Inscreve-se nas mudanças de sessão (usuário + ready).
 * @param {(state: { user, ready, isAnonymous, isAuthenticated }) => void} callback
 */
export function subscribeSession(callback) {
  sessionListeners.add(callback);
  callback({
    user: currentUser,
    ready: authReady,
    isAnonymous: !currentUser,
    isAuthenticated: !!currentUser,
  });
  return () => sessionListeners.delete(callback);
}

export function getSessionUser() {
  return currentUser;
}

export function isSessionReady() {
  return authReady;
}

// ─── Erros de Auth → Português (BR) ──────────────────────────────────────────
const AUTH_ERRORS_PT = {
  "auth/invalid-email": "E-mail inválido.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Este e-mail já está cadastrado.",
  "auth/weak-password": "Senha muito fraca. Use pelo menos 6 caracteres.",
  "auth/operation-not-allowed": "Login por e-mail/senha não está ativo no Firebase Console.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  "auth/network-request-failed": "Falha de rede. Verifique sua conexão.",
  "auth/missing-password": "Informe a senha.",
  "auth/missing-email": "Informe o e-mail.",
};

export function translateAuthError(error) {
  const code = error?.code || "";
  if (AUTH_ERRORS_PT[code]) return AUTH_ERRORS_PT[code];

  const msg = (error?.message || "").toLowerCase();
  if (msg.includes("invalid login") || msg.includes("invalid-credential")) {
    return "E-mail ou senha incorretos.";
  }
  if (msg.includes("email-already-in-use")) return AUTH_ERRORS_PT["auth/email-already-in-use"];
  if (msg.includes("weak-password")) return AUTH_ERRORS_PT["auth/weak-password"];

  return error?.message || "Erro desconhecido. Tente novamente.";
}

// ─── Auth: E-mail/Senha ───────────────────────────────────────────────────────
export async function signUpWithEmail(email, password) {
  if (!ensureFirebase()) return { ok: false, error: "Firebase não configurado." };
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    return { ok: true, user: credential.user };
  } catch (error) {
    return { ok: false, error: translateAuthError(error) };
  }
}

export async function signInWithEmail(email, password) {
  if (!ensureFirebase()) return { ok: false, error: "Firebase não configurado." };
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { ok: true, user: credential.user };
  } catch (error) {
    return { ok: false, error: translateAuthError(error) };
  }
}

export async function logoutUser() {
  if (!ensureFirebase()) return { ok: false, error: "Firebase não configurado." };
  try {
    await signOut(auth);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: translateAuthError(error) };
  }
}

/**
 * Modo anônimo / "Jogar sem salvar na nuvem".
 * Garante que não há usuário autenticado; saves vão só para localStorage.
 */
export async function enterAnonymousMode() {
  if (currentUser) {
    const result = await logoutUser();
    if (!result.ok) return result;
  }
  return { ok: true, mode: "anonymous" };
}

// ─── Payload de sessão ────────────────────────────────────────────────────────
/**
 * Monta o objeto a ser persistido.
 * Adapte os campos conforme seu RPG (charData, stats, gameTime, etc.).
 */
export function buildSessionPayload(gameState = {}) {
  return {
    ...gameState,
    savedAt: Date.now(),
    version: 1,
  };
}

// ─── Persistência híbrida ─────────────────────────────────────────────────────
async function writeSessionNow(payload) {
  const stamped = buildSessionPayload(payload);

  if (currentUser && db) {
    const pathRef = ref(db, RTDB_SESSION_PATH(currentUser.uid));
    await set(pathRef, stamped);
    return { ok: true, target: "cloud", savedAt: stamped.savedAt };
  }

  if (typeof localStorage === "undefined") {
    return { ok: false, error: "Armazenamento local indisponível." };
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stamped));
  return { ok: true, target: "local", savedAt: stamped.savedAt };
}

/**
 * Salva com debounce (1000ms).
 * Chamadas rápidas são agrupadas — só a última payload é enviada.
 */
export function saveSessionDebounced(payload) {
  pendingPayload = payload;

  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(async () => {
    saveTimeout = null;
    const toSave = pendingPayload;
    pendingPayload = null;
    try {
      await writeSessionNow(toSave);
    } catch (error) {
      console.error("[firebase-session] saveSessionDebounced:", error);
    }
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Salva imediatamente (cancela debounce pendente).
 * Use em "Salvar agora", pause, ou beforeunload.
 */
export async function saveSessionNow(payload) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  pendingPayload = null;

  try {
    return await writeSessionNow(payload);
  } catch (error) {
    console.error("[firebase-session] saveSessionNow:", error);
    const code = error?.code || "";
    if (code === "PERMISSION_DENIED" || code === "permission-denied") {
      return {
        ok: false,
        error: "Sem permissão no Realtime Database. Verifique as rules e se está logado.",
      };
    }
    return { ok: false, error: error?.message || "Erro ao salvar sessão." };
  }
}

/**
 * Carrega a sessão do destino correto (nuvem ou local).
 * Deve ser chamado após authReady === true (via subscribeSession).
 */
export async function loadSession() {
  if (currentUser && db) {
    try {
      const pathRef = ref(db, RTDB_SESSION_PATH(currentUser.uid));
      const snap = await get(pathRef);
      if (!snap.exists()) return { ok: true, data: null, target: "cloud" };
      return { ok: true, data: snap.val(), target: "cloud" };
    } catch (error) {
      console.error("[firebase-session] loadSession cloud:", error);
      return { ok: false, error: error?.message || "Erro ao carregar da nuvem.", data: null };
    }
  }

  if (typeof localStorage === "undefined") {
    return { ok: true, data: null, target: "local" };
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return { ok: true, data: null, target: "local" };
    return { ok: true, data: JSON.parse(raw), target: "local" };
  } catch (error) {
    return { ok: false, error: "Dados locais corrompidos.", data: null };
  }
}

export function clearLocalSession() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
