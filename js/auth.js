// ===== Auth Module =====
import { getSupabase } from "./supabase.js";

// Cached user — set once by initAuth(), updated by onAuthStateChange only
let cachedUser = null;
let initPromise = null;

/**
 * initAuth() — called ONCE in startApp().
 * Does getSession() ONE TIME only to populate cachedUser.
 * All subsequent getCurrentUser() calls read from memory (synchronous, zero network).
 */
export async function initAuth() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const supabase = getSupabase();
    if (!supabase) {
      cachedUser = null;
      return null;
    }
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session || !session.user) {
      cachedUser = null;
      return null;
    }
    cachedUser = session.user;
    return cachedUser;
  })();
  return initPromise;
}

/**
 * getCurrentUser() — PURE SYNCHRONOUS. Reads from memory only.
 * NO getSession(). NO network request. NO refresh trigger. EVER.
 */
export function getCurrentUser() {
  return cachedUser;
}

export function setCachedUser(user) {
  cachedUser = user || null;
}

export function clearCachedUser() {
  cachedUser = null;
  initPromise = null;
}

/**
 * getUserFromServer — ONLY when you need to verify with Supabase server.
 * This DOES make a network request. Use sparingly (e.g. manual refresh).
 */
export async function getUserFromServer() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
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
    cachedUser = data.user;

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

  if (data?.user) cachedUser = data.user;

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
    // Update cachedUser internally so getCurrentUser() always returns fresh data
    if (event === "SIGNED_OUT") {
      cachedUser = null;
    } else if (
      event === "TOKEN_REFRESHED" ||
      event === "USER_UPDATED" ||
      event === "INITIAL_SESSION"
    ) {
      if (session?.user) cachedUser = session.user;
    }
    callback(event, session);
  });
  return data;
}

/**
 * requireAuth — calls initAuth() once if needed, then checks cachedUser.
 */
export async function requireAuth() {
  if (!cachedUser) {
    await initAuth();
  }
  if (!cachedUser) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}
