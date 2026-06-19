import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "./firebase";

export { isFirebaseConfigured };

export function getFirebaseBrowser() {
  return getFirebaseAuth();
}

export async function ensureFirebaseReady() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  if (!auth || !db) {
    return { auth: null, db: null, error: "Firebase não configurado." };
  }
  return { auth, db, error: null };
}
