// ===== Friends Module =====
import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { t } from "./i18n.js";
import { notify } from "./utils.js";

let currentFriends = [];
let currentRequests = [];
let searchResults = [];

export async function loadFriends() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  // Get accepted friendships where current user is either sender or recipient
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `
            id,
            user_id,
            friend_id,
            status,
            created_at,
            profiles!friendships_friend_id_fkey(id, username, email, avatar_url),
            requester:profiles!friendships_user_id_fkey(id, username, email, avatar_url)
        `,
    )
    .eq("status", "accepted")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  if (error) {
    console.error("Load friends error:", error);
    return [];
  }

  // Normalize friend data — pick the profile that is NOT the current user
  currentFriends = (data || []).map((f) => {
    const isUserSender = f.user_id === user.id;
    const friendProfile = isUserSender ? f.profiles : f.requester;
    return {
      id: f.id,
      friendship_id: f.id,
      friend_id: isUserSender ? f.friend_id : f.user_id,
      username: friendProfile?.username || "Unknown",
      email: friendProfile?.email || "",
      avatar_url: friendProfile?.avatar_url,
      created_at: f.created_at,
    };
  });

  return currentFriends;
}

export async function loadFriendRequests() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  // Get pending requests where current user is the recipient (friend_id)
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `
            id,
            user_id,
            friend_id,
            status,
            created_at,
            requester:profiles!friendships_user_id_fkey(id, username, email, avatar_url)
        `,
    )
    .eq("status", "pending")
    .eq("friend_id", user.id);

  if (error) {
    console.error("Load requests error:", error);
    return [];
  }

  currentRequests = (data || []).map((r) => ({
    id: r.id,
    requester_id: r.user_id,
    username: r.requester?.username || "Unknown",
    email: r.requester?.email || "",
    avatar_url: r.requester?.avatar_url,
    created_at: r.created_at,
  }));

  return currentRequests;
}

export async function sendFriendRequest(friendId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  if (friendId === user.id) {
    return { error: new Error("Cannot send request to yourself") };
  }

  // Check if already friends or request exists in either direction
  const { data: existing, error: checkError } = await supabase
    .from("friendships")
    .select("*")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`,
    )
    .maybeSingle();

  if (checkError) {
    console.error("Check existing error:", checkError);
  }

  if (existing) {
    if (existing.status === "accepted") {
      return { error: new Error("Already friends") };
    }
    if (existing.status === "pending") {
      return { error: new Error("Request already sent") };
    }
  }

  // Send request
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
}

export async function acceptFriendRequest(requestId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  // Update status only — accepted_at may not exist in rebuilt schema
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
}

export async function declineFriendRequest(requestId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

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
}

export async function removeFriend(friendshipId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

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

  const searchTerm = query.trim().toLowerCase();

  // Search by username or email
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email, avatar_url")
    .or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .neq("id", user.id)
    .limit(20);

  if (error) {
    console.error("Search error:", error);
    return [];
  }

  // Check friendship status for each result
  const { data: friendships } = await supabase
    .from("friendships")
    .select("*")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  searchResults = (data || []).map((profile) => {
    const existing = friendships?.find(
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
                <img class="friend-avatar" src="${friend.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.username)}&background=6366f1&color=fff`}" alt="${friend.username}" loading="lazy">
                <h4 class="friend-name">${friend.username}</h4>
                <p class="friend-level">${friend.email}</p>
                <div class="friend-actions">
                    <button class="btn-view-friend" data-action="viewFriend" data-id="${friend.friend_id}">
                        <i class="fas fa-eye"></i> <span data-i18n="common.view">${t("common.view") || t("common.edit") || "View"}</span>
                    </button>
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
                <img class="request-avatar" src="${req.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.username)}&background=6366f1&color=fff`}" alt="${req.username}" loading="lazy">
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
    container.innerHTML = `<div class="empty-state">${t("friends.noResults")}</div>`;
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
                <img class="friend-avatar" src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=6366f1&color=fff`}" alt="${user.username}" loading="lazy">
                <h4 class="friend-name">${user.username}</h4>
                <p class="friend-email">${user.email}</p>
                ${buttonHtml}
            </div>
        `;
    })
    .join("");
}

export async function updateBadges() {
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
}

export function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.toggle("active", content.id === `${tabName}-tab`);
  });
}
