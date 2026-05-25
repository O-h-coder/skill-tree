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
        autoRefreshToken: false, // ← DISABLED: prevents refresh storm
        persistSession: true, // keep session in localStorage
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
    console.log("[Supabase] Client initialized (autoRefresh: OFF)");
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
