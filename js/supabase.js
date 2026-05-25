// ===== Supabase Client =====
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./constants.js";

let supabase = null;

export function initSupabase() {
  if (supabase) return supabase;
  if (!window.supabase) {
    console.error("Supabase library not loaded");
    return null;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: "skilltree-auth-token",
      flowType: "pkce",
    },
  });
  return supabase;
}

export function getSupabase() {
  if (!supabase) {
    return initSupabase();
  }
  return supabase;
}
