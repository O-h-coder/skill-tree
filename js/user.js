// File: js/user.js
/**
 * user.js — إدارة بيانات المستخدم
 */

import { getSupabase } from "./supabase.js";
import { getCurrentUserId, updateUserProfile } from "./auth.js";
import { APP_CONSTANTS } from "./constants.js";
import { t, getCurrentLanguage } from "./i18n.js";

let userData = null;

export async function fetchUserData() {
  const userId = getCurrentUserId();
  if (!userId) return { data: null, error: t("errorAuth") };

  const sb = await getSupabase();
  try {
    const { data: profile, error: pErr } = await sb
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (pErr) throw pErr;

    let { data: stats, error: sErr } = await sb
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (sErr?.code === "PGRST116") {
      await sb.from("user_stats").insert({
        user_id: userId,
        skills_unlocked: 0,
        total_skills: 0,
        quests_done: 0,
        total_quests: 0,
        streak: 0,
        last_active: new Date().toISOString(),
      });
      stats = {
        skills_unlocked: 0,
        total_skills: 0,
        quests_done: 0,
        total_quests: 0,
        streak: 0,
        last_active: null,
      };
    } else if (sErr) {
      throw sErr;
    }

    const title = profile.title || getTitleByLevel(profile.level || 1);
    userData = { ...profile, title, stats: stats || {} };
    return { data: userData, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
}

export async function updateUsername(username) {
  const userId = getCurrentUserId();
  if (!userId) return { error: t("errorAuth") };
  const sb = await getSupabase();
  try {
    const { data: existing, error: checkErr } = await sb
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", userId)
      .maybeSingle();
    if (checkErr) throw checkErr;
    if (existing) return { error: t("usernameTaken") };

    const { error } = await sb
      .from("profiles")
      .update({ username, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw error;

    if (userData) userData.username = username;
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function addXP(amount, reason = "") {
  if (!userData) {
    const r = await fetchUserData();
    if (r.error) return r;
  }

  let newExp = (userData.exp || 0) + amount;
  let newLevel = userData.level || 1;
  let newMaxExp = userData.max_exp || 100;
  let leveledUp = false;

  while (newExp >= newMaxExp) {
    newExp -= newMaxExp;
    newLevel++;
    newMaxExp = Math.floor(newMaxExp * APP_CONSTANTS.XP_MULTIPLIER);
    leveledUp = true;
  }
  if (newExp < 0) newExp = 0;

  const newTitle = getTitleByLevel(newLevel);

  const { error } = await updateUserProfile({
    exp: newExp,
    max_exp: newMaxExp,
    level: newLevel,
    title: newTitle,
  });
  if (error) return { error };

  userData = {
    ...userData,
    exp: newExp,
    max_exp: newMaxExp,
    level: newLevel,
    title: newTitle,
  };

  if (amount > 0)
    await addActivity("xp_gain", `+${amount} XP — ${reason}`, amount);
  if (leveledUp)
    await addActivity(
      "level_up",
      `Level Up! ${newTitle} (LVL ${newLevel})`,
      newLevel,
    );

  return { leveledUp, newLevel, newExp, newMaxExp, newTitle, error: null };
}

export function getTitleByLevel(level) {
  const levels = Object.keys(APP_CONSTANTS.TITLES)
    .map(Number)
    .sort((a, b) => b - a);
  const lang = getCurrentLanguage();
  for (const l of levels) {
    if (level >= l) {
      return APP_CONSTANTS.TITLES[l][lang] || APP_CONSTANTS.TITLES[l].ar;
    }
  }
  return APP_CONSTANTS.TITLES[1][lang] || APP_CONSTANTS.TITLES[1].ar;
}

export async function updateStreak() {
  const userId = getCurrentUserId();
  if (!userId) return { error: t("errorAuth") };
  const sb = await getSupabase();

  const { data: stats } = await sb
    .from("user_stats")
    .select("streak, last_active")
    .eq("user_id", userId)
    .single();
  const today = new Date().toISOString().split("T")[0];
  const lastActive = stats?.last_active
    ? stats.last_active.split("T")[0]
    : null;

  if (lastActive === today)
    return { streak: stats?.streak || 0, updated: false };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const newStreak =
    lastActive === yesterday.toISOString().split("T")[0]
      ? (stats?.streak || 0) + 1
      : 1;

  await sb
    .from("user_stats")
    .update({ streak: newStreak, last_active: new Date().toISOString() })
    .eq("user_id", userId);
  return { streak: newStreak, updated: true };
}

export async function getActivityHistory(limit = 50) {
  const userId = getCurrentUserId();
  if (!userId) return { history: [], error: "Not authenticated" };
  const sb = await getSupabase();
  try {
    const { data, error } = await sb
      .from("activity_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { history: data || [], error: null };
  } catch (error) {
    return { history: [], error: error.message };
  }
}

export async function addActivity(type, description, value = null) {
  const userId = getCurrentUserId();
  if (!userId) return { error: t("errorAuth") };
  const sb = await getSupabase();
  try {
    await sb.from("activity_history").insert({
      user_id: userId,
      type,
      description,
      value,
      created_at: new Date().toISOString(),
    });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function uploadAvatar(file) {
  const userId = getCurrentUserId();
  if (!userId) return { url: null, error: "Not authenticated" };

  // Validate file
  if (!file || file.size > 5 * 1024 * 1024) {
    return { url: null, error: "File too large (max 5MB)" };
  }
  if (!file.type.startsWith("image/")) {
    return { url: null, error: "Only image files allowed" };
  }

  const sb = await getSupabase();
  try {
    const ext = file.name.split(".").pop().toLowerCase();
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const filePath = `${fileName}`; // FIX: Upload to root of bucket

    const { error: upErr } = await sb.storage
      .from("profiles")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });
    if (upErr) {
      console.error("Upload error:", upErr);
      throw upErr;
    }

    const {
      data: { publicUrl },
    } = sb.storage.from("profiles").getPublicUrl(filePath);

    // Update profile with new avatar URL
    const { error: updateErr } = await updateUserProfile({
      avatar_url: publicUrl,
    });
    if (updateErr) throw updateErr;

    if (userData) userData.avatar_url = publicUrl;
    return { url: publicUrl, error: null };
  } catch (error) {
    console.error("uploadAvatar error:", error);
    return { url: null, error: error.message || "Upload failed" };
  }
}

export async function resetSkillsAndLevel() {
  const userId = getCurrentUserId();
  if (!userId) return { error: t("errorAuth") };
  const sb = await getSupabase();
  try {
    await sb
      .from("profiles")
      .update({
        level: 1,
        exp: 0,
        max_exp: 100,
        title: getTitleByLevel(1),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    await sb
      .from("user_stats")
      .update({ skills_unlocked: 0, quests_done: 0, streak: 0 })
      .eq("user_id", userId);
    await sb.from("activity_history").delete().eq("user_id", userId);
    userData = null;
    await fetchUserData();
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function resetUserSettings() {
  const userId = getCurrentUserId();
  if (!userId) return { error: t("errorAuth") };
  const sb = await getSupabase();
  try {
    await sb
      .from("profiles")
      .update({
        theme: APP_CONSTANTS.DEFAULT_THEME,
        language: APP_CONSTANTS.DEFAULT_LANG,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export function getCachedUserData() {
  return userData;
}

export function getUserLevel() {
  return userData?.level || 1;
}

export function getUserXP() {
  return { current: userData?.exp || 0, max: userData?.max_exp || 100 };
}

export function getUserStreak() {
  return userData?.stats?.streak || 0;
}

export function getUserTitle() {
  return userData?.title || getTitleByLevel(getUserLevel());
}
