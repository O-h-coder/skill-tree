// File js/auth.js
/**
 * auth.js — المصادقة والجلسات
 */

import { getSupabase } from "./supabase.js";

let currentUser = null;

export async function getCurrentUser() {
  try {
    const sb = await getSupabase();
    if (!sb) return { user: null, error: "Supabase not initialized" };

    const { data, error } = await sb.auth.getUser();
    if (error) {
      currentUser = null;
      return { user: null, error: error.message };
    }
    currentUser = data?.user || null;
    return { user: currentUser, error: null };
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return { user: null, error: err.message };
  }
}

export function getCurrentUserId() {
  return currentUser?.id || null;
}

export async function signUp(email, password, displayName) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split("@")[0] },
    },
  });
  if (error) return { user: null, error: error.message };
  currentUser = data?.user || null;
  return { user: currentUser, error: null };
}

export async function signIn(email, password) {
  const sb = await getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { user: null, error: error.message };
  currentUser = data?.user || null;
  return { user: currentUser, error: null };
}

export async function resetPassword(email) {
  const sb = await getSupabase();
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/login.html",
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function signOut() {
  const sb = await getSupabase();
  const { error } = await sb.auth.signOut();
  if (error) return { error: error.message };
  currentUser = null;
  return { error: null };
}

export function onAuthStateChange(callback) {
  getSupabase().then((sb) => {
    if (!sb) return;
    sb.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      callback({ event, session, user: currentUser });
    });
  });
}

export async function updateUserProfile(updates) {
  const userId = getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };
  const sb = await getSupabase();
  const { error } = await sb
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { error: error.message };
  return { error: null };
}
