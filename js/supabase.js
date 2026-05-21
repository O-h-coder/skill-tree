// File js/supabase.js
/**
 * supabase.js — تهيئة عميل Supabase
 */

import { SUPABASE_URL, SUPABASE_KEY } from "./constants.js";

let _sb = null;

function waitForSupabase(maxMs = 10000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (
        typeof window !== "undefined" &&
        window.supabase &&
        window.supabase.createClient
      ) {
        resolve(true);
        return;
      }
      if (Date.now() - start > maxMs) {
        resolve(false);
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
}

export async function initSupabase() {
  if (_sb) return _sb;
  const ready = await waitForSupabase();
  if (!ready) {
    console.error("Supabase CDN not loaded in time");
    return null;
  }
  try {
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
    window._stSupabase = _sb;
    return _sb;
  } catch (e) {
    console.error("Supabase init error:", e);
    return null;
  }
}

initSupabase();

export function getSupabase() {
  if (!_sb) return initSupabase();
  return Promise.resolve(_sb);
}

export const supabase = new Proxy(
  {},
  {
    get(_, prop) {
      const sb = getSupabase();
      if (!sb) throw new Error("Supabase not initialized");
      return sb[prop];
    },
  },
);
