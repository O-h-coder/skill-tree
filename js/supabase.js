// ===== Supabase Client =====
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./constants.js";

let supabase = null;

export function initSupabase() {
  if (supabase) return supabase;
  if (!window.supabase) {
    console.error("[Supabase] Library not loaded yet");
    return null;
  }

  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: "skilltree-auth-token",
        flowType: "pkce",
      },
      global: {
        headers: {
          "x-application-name": "skilltree",
        },
      },
    });
    console.log("[Supabase] Client initialized");
  } catch (err) {
    console.error("[Supabase] Failed to create client:", err);
    return null;
  }

  return supabase;
}

export function getSupabase() {
  if (!supabase) {
    return initSupabase();
  }
  return supabase;
}
