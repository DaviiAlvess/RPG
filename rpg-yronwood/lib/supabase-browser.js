import { createClient } from '@supabase/supabase-js';

let browserClient = null;
let cachedConfig = null;
let configPromise = null;

function readBuildConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim() || null;
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim() || null;
  return {
    url,
    anonKey,
    configured: !!(url && anonKey),
    hasUrl: !!url,
    hasKey: !!anonKey,
  };
}

async function fetchServerConfig() {
  if (typeof window === 'undefined') return readBuildConfig();

  const buildCfg = readBuildConfig();
  if (buildCfg.configured) return buildCfg;

  try {
    const res = await fetch('/api/auth/config', { cache: 'no-store' });
    if (!res.ok) {
      return {
        ...buildCfg,
        configured: false,
        source: 'api-error',
      };
    }
    const serverCfg = await res.json();
    return {
      url: serverCfg.url || buildCfg.url,
      anonKey: serverCfg.anonKey || buildCfg.anonKey,
      configured: !!serverCfg.configured,
      hasUrl: !!serverCfg.hasUrl,
      hasKey: !!serverCfg.hasKey,
      source: 'api',
    };
  } catch {
    return {
      ...buildCfg,
      configured: buildCfg.configured,
      source: 'api-unreachable',
    };
  }
}

export async function getSupabaseConfig() {
  if (cachedConfig) return cachedConfig;
  if (!configPromise) configPromise = fetchServerConfig();
  cachedConfig = await configPromise;
  return cachedConfig;
}

export async function ensureSupabaseBrowser() {
  if (browserClient) return browserClient;

  const cfg = await getSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) return null;

  browserClient = createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}

/** @deprecated use ensureSupabaseBrowser — sync check só vê vars NEXT_PUBLIC_ no build */
export function getSupabaseBrowser() {
  const { url, anonKey } = readBuildConfig();
  if (!url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

export function isSupabaseConfigured() {
  return readBuildConfig().configured;
}

export async function isSupabaseConfiguredAsync() {
  const cfg = await getSupabaseConfig();
  return cfg.configured;
}

export function getSupabasePublicUrl() {
  return readBuildConfig().url;
}
