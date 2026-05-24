// ===== Friends Module =====
import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { t } from "./i18n.js";
import { notify } from "./utils.js";

let currentFriends = [];
let currentRequests = [];
let searchResults = [];

// ===== Helper: Get friend profile safely =====
async function getFriendProfile(supabase, friendId) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email, avatar_url")
      .eq("id", friendId)
      .single();
    if (error || !data)
      return { username: "Unknown", email: "", avatar_url: null };
    return data;
  } catch (e) {
    return { username: "Unknown", email: "", avatar_url: null };
  }
}

async function getFriendStats(supabase, friendId) {
  try {
    const { data, error } = await supabase
      .from("user_stats")
      .select("level, xp")
      .eq("user_id", friendId)
      .single();
    if (error || !data) return { level: 1, xp: 0 };
    return data;
  } catch (e) {
    return { level: 1, xp: 0 };
  }
}

export async function loadFriends() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  try {
    // Step 1: Get all accepted friendships (NO JOINS)
    const { data: friendships, error } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id, status, created_at")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) {
      console.error("Load friends error:", error);
      return [];
    }

    // Step 2: Build friend list with separate profile queries
    const friendPromises = (friendships || []).map(async (f) => {
      const isUserSender = f.user_id === user.id;
      const friendId = isUserSender ? f.friend_id : f.user_id;

      const [profile, stats] = await Promise.all([
        getFriendProfile(supabase, friendId),
        getFriendStats(supabase, friendId),
      ]);

      return {
        id: f.id,
        friendship_id: f.id,
        friend_id: friendId,
        username: profile.username || "Unknown",
        email: profile.email || "",
        avatar_url: profile.avatar_url,
        created_at: f.created_at,
        level: stats.level || 1,
        xp: stats.xp || 0,
      };
    });

    currentFriends = await Promise.all(friendPromises);

    // Sort by level descending
    currentFriends.sort((a, b) => b.level - a.level);

    return currentFriends;
  } catch (err) {
    console.error("loadFriends exception:", err);
    currentFriends = [];
    return [];
  }
}

export async function loadFriendRequests() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  try {
    // Step 1: Get pending requests where current user is the recipient (NO JOINS)
    const { data: requests, error } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id, status, created_at")
      .eq("status", "pending")
      .eq("friend_id", user.id);

    if (error) {
      console.error("Load requests error:", error);
      return [];
    }

    // Step 2: Get requester profiles separately
    const requestPromises = (requests || []).map(async (r) => {
      const profile = await getFriendProfile(supabase, r.user_id);
      return {
        id: r.id,
        requester_id: r.user_id,
        username: profile.username || "Unknown",
        email: profile.email || "",
        avatar_url: profile.avatar_url,
        created_at: r.created_at,
      };
    });

    currentRequests = await Promise.all(requestPromises);
    return currentRequests;
  } catch (err) {
    console.error("loadFriendRequests exception:", err);
    currentRequests = [];
    return [];
  }
}

export async function sendFriendRequest(friendId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  if (friendId === user.id) {
    return { error: new Error("Cannot send request to yourself") };
  }

  try {
    // Check for existing friendship in either direction
    const { data: existing1 } = await supabase
      .from("friendships")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("friend_id", friendId)
      .maybeSingle();

    const { data: existing2 } = await supabase
      .from("friendships")
      .select("id, status")
      .eq("user_id", friendId)
      .eq("friend_id", user.id)
      .maybeSingle();

    const existing = existing1 || existing2;

    if (existing) {
      if (existing.status === "accepted") {
        return { error: new Error("Already friends") };
      }
      if (existing.status === "pending") {
        return { error: new Error("Request already sent") };
      }
    }

    const { data, error } = await supabase
      .from("friendships")
      .insert([
        {
          user_id: user.id,
          friend_id: friendId,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Send request error:", error);
      return { error };
    }

    notify(t("friends.requestSent"), "success");
    return { data, error: null };
  } catch (err) {
    console.error("sendFriendRequest exception:", err);
    return { error: err };
  }
}

export async function acceptFriendRequest(requestId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  try {
    const { data, error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", requestId)
      .eq("friend_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Accept request error:", error);
      return { error };
    }

    notify(t("friends.requestAccepted"), "success");
    await loadFriendRequests();
    await loadFriends();
    renderFriends();
    renderRequests();
    updateBadges();

    return { data, error: null };
  } catch (err) {
    console.error("acceptFriendRequest exception:", err);
    return { error: err };
  }
}

export async function declineFriendRequest(requestId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  try {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", requestId)
      .eq("friend_id", user.id);

    if (error) {
      console.error("Decline request error:", error);
      return { error };
    }

    notify(t("friends.requestDeclined"), "success");
    await loadFriendRequests();
    renderRequests();
    updateBadges();

    return { error: null };
  } catch (err) {
    console.error("declineFriendRequest exception:", err);
    return { error: err };
  }
}

export async function removeFriend(friendshipId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  try {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      console.error("Remove friend error:", error);
      return { error };
    }

    notify(t("friends.removed"), "success");
    await loadFriends();
    renderFriends();

    return { error: null };
  } catch (err) {
    console.error("removeFriend exception:", err);
    return { error: err };
  }
}

export async function searchUsers(query) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  if (!query || query.trim().length < 2) {
    searchResults = [];
    renderSearchResults();
    return [];
  }

  try {
    const searchTerm = query.trim().toLowerCase();

    // Step 1: Search profiles
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, username, email, avatar_url")
      .or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .neq("id", user.id)
      .limit(20);

    if (error) {
      console.error("Search error:", error);
      searchResults = [];
      renderSearchResults();
      return [];
    }

    // Step 2: Get current user's friendships
    const { data: myFriendships } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id, status")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    searchResults = (profiles || []).map((profile) => {
      const existing = (myFriendships || []).find(
        (f) =>
          (f.user_id === user.id && f.friend_id === profile.id) ||
          (f.user_id === profile.id && f.friend_id === user.id),
      );

      return {
        ...profile,
        friendshipStatus: existing?.status || null,
        friendshipId: existing?.id || null,
      };
    });

    renderSearchResults();
    return searchResults;
  } catch (err) {
    console.error("searchUsers exception:", err);
    searchResults = [];
    renderSearchResults();
    return [];
  }
}

export function renderFriends() {
  const list = document.getElementById("friends-list");
  const noFriends = document.getElementById("no-friends");

  if (!list) return;

  if (currentFriends.length === 0) {
    list.innerHTML = "";
    if (noFriends) noFriends.classList.remove("hidden");
  } else {
    if (noFriends) noFriends.classList.add("hidden");
    list.innerHTML = currentFriends
      .map(
        (friend) => `
            <div class="friend-card" data-friend-id="${friend.friend_id}">
                <img class="friend-avatar" src="${friend.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.username)}&background=6366f1&color=fff`}" alt="${friend.username}" loading="lazy" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(friend.username)}&background=6366f1&color=fff'">
                <h4 class="friend-name">${friend.username}</h4>
                <p class="friend-level">Lv.${friend.level}</p>
                <p class="friend-rank">${friend.xp} XP</p>
                <div class="friend-actions">
                    <button class="btn-remove-friend" data-action="removeFriend" data-id="${friend.friendship_id}">
                        <i class="fas fa-user-minus"></i> <span data-i18n="friends.remove">${t("friends.remove")}</span>
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  }
}

export function renderRequests() {
  const list = document.getElementById("requests-list");
  const noRequests = document.getElementById("no-requests");

  if (!list) return;

  if (currentRequests.length === 0) {
    list.innerHTML = "";
    if (noRequests) noRequests.classList.remove("hidden");
  } else {
    if (noRequests) noRequests.classList.add("hidden");
    list.innerHTML = currentRequests
      .map(
        (req) => `
            <div class="request-card" data-request-id="${req.id}">
                <img class="request-avatar" src="${req.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.username)}&background=6366f1&color=fff`}" alt="${req.username}" loading="lazy" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(req.username)}&background=6366f1&color=fff'">
                <div class="request-info">
                    <h4 class="request-name">${req.username}</h4>
                    <p class="request-email">${req.email}</p>
                </div>
                <div class="request-actions">
                    <button class="btn-accept-request" data-action="acceptRequest" data-id="${req.id}">
                        <i class="fas fa-check"></i> ${t("friends.accept")}
                    </button>
                    <button class="btn-decline-request" data-action="declineRequest" data-id="${req.id}">
                        <i class="fas fa-times"></i> ${t("friends.decline")}
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  }
}

export function renderSearchResults() {
  const container = document.getElementById("search-results");
  if (!container) return;

  if (searchResults.length === 0) {
    container.innerHTML = `<div class="empty-state">${t("friends.noResults") || "لا توجد نتائج"}</div>`;
    return;
  }

  container.innerHTML = searchResults
    .map((user) => {
      let buttonHtml = "";
      if (user.friendshipStatus === "accepted") {
        buttonHtml = `<button class="btn-add-friend sent" disabled><i class="fas fa-user-check"></i> ${t("friends.friend")}</button>`;
      } else if (user.friendshipStatus === "pending") {
        buttonHtml = `<button class="btn-add-friend sent" disabled><i class="fas fa-clock"></i> ${t("friends.requestSent")}</button>`;
      } else {
        buttonHtml = `<button class="btn-add-friend" data-action="sendRequest" data-id="${user.id}"><i class="fas fa-user-plus"></i> ${t("friends.sendRequest")}</button>`;
      }

      return `
            <div class="search-result-card" data-user-id="${user.id}">
                <img class="friend-avatar" src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=6366f1&color=fff`}" alt="${user.username}" loading="lazy" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=6366f1&color=fff'">
                <h4 class="friend-name">${user.username}</h4>
                <p class="friend-email">${user.email}</p>
                ${buttonHtml}
            </div>
        `;
    })
    .join("");
}

export async function updateBadges() {
  try {
    const requestsBadge = document.getElementById("requests-badge");
    const friendsBadge = document.getElementById("friends-badge");
    const notificationBadge = document.getElementById("notification-badge");

    await loadFriendRequests();

    const requestCount = currentRequests.length;

    if (requestsBadge) {
      requestsBadge.textContent = requestCount;
      requestsBadge.classList.toggle("hidden", requestCount === 0);
    }

    if (friendsBadge) {
      friendsBadge.classList.toggle("hidden", requestCount === 0);
      friendsBadge.textContent = requestCount;
    }

    if (notificationBadge) {
      notificationBadge.classList.toggle("hidden", requestCount === 0);
      notificationBadge.textContent = requestCount;
    }
  } catch (err) {
    console.error("updateBadges error:", err);
  }
}

export function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.toggle("active", content.id === `${tabName}-tab`);
  });
}
