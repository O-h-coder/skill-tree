// ===== Auth Module =====
import { getSupabase } from "./supabase.js";
import { t } from "./i18n.js";

// Cached user to avoid repeated getSession() calls
let cachedUser = null;
let isRefreshing = false;
let refreshPromise = null;

/**
 * getCurrentUser - reads from LOCAL session, caches result, prevents concurrent calls
 * Uses getSession() which reads from memory/localStorage (NO network request).
 * BUT getSession() can trigger auto-refresh if token is near expiry.
 * We cache the result and prevent multiple concurrent calls to avoid refresh storms.
 */
export async function getCurrentUser() {
  if (cachedUser) return cachedUser;
  if (isRefreshing) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    const supabase = getSupabase();
    if (!supabase) {
      isRefreshing = false;
      refreshPromise = null;
      return null;
    }
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session || !session.user) {
      cachedUser = null;
      isRefreshing = false;
      refreshPromise = null;
      return null;
    }
    cachedUser = session.user;
    isRefreshing = false;
    refreshPromise = null;
    return cachedUser;
  })();

  return refreshPromise;
}

export function clearCachedUser() {
  cachedUser = null;
  isRefreshing = false;
  refreshPromise = null;
}

export function getCachedUser() {
  return cachedUser;
}

/**
 * getUserFromServer - ONLY use this when you need to verify with the server
 * This DOES make a network request. Use sparingly.
 */
export async function getUserFromServer() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(); // ← network request
  if (error || !user) return null;
  return user;
}

export async function getSession() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) return null;
  return session;
}

export async function signUp(email, password, username) {
  const supabase = getSupabase();
  if (!supabase) return { error: new Error("Supabase not initialized") };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: window.location.origin + "/login.html",
    },
  });

  if (error) return { error };

  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").insert([
      {
        id: data.user.id,
        username: username || email.split("@")[0],
        email: email,
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    ]);

    if (profileError) console.error("Profile creation error:", profileError);

    const { error: statsError } = await supabase.from("user_stats").insert([
      {
        user_id: data.user.id,
        level: 1,
        xp: 0,
        updated_at: new Date().toISOString(),
      },
    ]);

    if (statsError) console.error("Stats creation error:", statsError);
  }

  return { data, error: null };
}

export async function signIn(email, password) {
  const supabase = getSupabase();
  if (!supabase) return { error: new Error("Supabase not initialized") };

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

export async function signOut() {
  const supabase = getSupabase();
  if (!supabase) return { error: new Error("Supabase not initialized") };

  clearCachedUser();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export function onAuthStateChange(callback) {
  const supabase = getSupabase();
  if (!supabase) return { data: { subscription: null } };

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return data;
}

/**
 * requireAuth - checks session locally, redirects only on real failure
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}
