// File friends.js
/**
 * friends.js — نظام الأصدقاء
 */

import { getSupabase } from "./supabase.js";
import { getCurrentUserId } from "./auth.js";
import { t } from "./i18n.js";

export async function searchUserByUsername(username) {
  if (!username || username.trim().length < 3)
    return { user: null, error: t("usernameShort") };
  const sb = await getSupabase();
  try {
    const { data, error } = await sb
      .from("profiles")
      .select("id, username, display_name, avatar_url, level, title")
      .eq("username", username.trim())
      .single();
    if (error?.code === "PGRST116")
      return { user: null, error: t("userNotFound") };
    if (error) throw error;
    if (data.id === getCurrentUserId())
      return { user: null, error: t("cannotAddSelf") };
    return { user: data, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

export async function sendFriendRequest(friendId) {
  const userId = getCurrentUserId();
  if (!userId) return { error: t("errorAuth") };
  if (friendId === userId) return { error: "Cannot add yourself" };
  const sb = await getSupabase();

  try {
    const { data: existing } = await sb
      .from("friends")
      .select("id, status")
      .or(
        `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`,
      )
      .single();
    if (existing) {
      if (existing.status === "accepted") return { error: t("alreadyFriends") };
      if (existing.status === "pending")
        return { error: t("requestAlreadySent") };
    }
    const { data, error } = await sb
      .from("friends")
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return { request: data, error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function acceptFriendRequest(requestId) {
  const userId = getCurrentUserId();
  if (!userId) return { error: t("errorAuth") };
  const sb = await getSupabase();
  try {
    const { data, error } = await sb
      .from("friends")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("friend_id", userId)
      .eq("status", "pending")
      .select()
      .single();
    if (error) throw error;
    return { friendship: data, error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function rejectFriendRequest(requestId) {
  const userId = getCurrentUserId();
  if (!userId) return { error: t("errorAuth") };
  const sb = await getSupabase();
  try {
    const { error } = await sb
      .from("friends")
      .delete()
      .eq("id", requestId)
      .eq("friend_id", userId)
      .eq("status", "pending");
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function getFriendsList() {
  const userId = getCurrentUserId();
  if (!userId)
    return {
      friends: [],
      pending: { sent: [], received: [] },
      error: "Not authenticated",
    };
  const sb = await getSupabase();

  try {
    const { data: sentPending } = await sb
      .from("friends")
      .select(
        "id, friend_id, created_at, profiles:friend_id(id, username, display_name, avatar_url, level, title)",
      )
      .eq("user_id", userId)
      .eq("status", "pending");
    const { data: receivedPending } = await sb
      .from("friends")
      .select(
        "id, user_id, created_at, profiles:user_id(id, username, display_name, avatar_url, level, title)",
      )
      .eq("friend_id", userId)
      .eq("status", "pending");
    const { data: acceptedAsUser } = await sb
      .from("friends")
      .select(
        "id, friend_id, profiles:friend_id(id, username, display_name, avatar_url, level, title)",
      )
      .eq("user_id", userId)
      .eq("status", "accepted");
    const { data: acceptedAsFriend } = await sb
      .from("friends")
      .select(
        "id, user_id, profiles:user_id(id, username, display_name, avatar_url, level, title)",
      )
      .eq("friend_id", userId)
      .eq("status", "accepted");

    const friends = [
      ...(acceptedAsUser?.map((f) => ({
        ...f.profiles,
        friendship_id: f.id,
        direction: "sent",
      })) || []),
      ...(acceptedAsFriend?.map((f) => ({
        ...f.profiles,
        friendship_id: f.id,
        direction: "received",
      })) || []),
    ];
    friends.sort((a, b) => (b.level || 0) - (a.level || 0));

    const pending = {
      sent:
        sentPending?.map((f) => ({ ...f.profiles, request_id: f.id })) || [],
      received:
        receivedPending?.map((f) => ({ ...f.profiles, request_id: f.id })) ||
        [],
    };
    return { friends, pending, error: null };
  } catch (error) {
    return {
      friends: [],
      pending: { sent: [], received: [] },
      error: error.message,
    };
  }
}

export async function removeFriend(friendshipId) {
  const userId = getCurrentUserId();
  if (!userId) return { error: t("errorAuth") };
  const sb = await getSupabase();
  try {
    const { error } = await sb.from("friends").delete().eq("id", friendshipId);
    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}
