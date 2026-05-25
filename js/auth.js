// ===== Auth Module =====
import { getSupabase } from "./supabase.js";
import { t } from "./i18n.js";

export async function getCurrentUser() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session || !session.user) return null;
  return session.user;
}

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

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}
