// ===== UI Module - Notification Panel =====
import { t } from "./i18n.js";
import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { notify } from "./utils.js";

let notifications = [];
let isNotificationsOpen = false;
let _loadFriendRequestsFn = null;

export function setLoadFriendRequestsFn(fn) {
  _loadFriendRequestsFn = fn;
}

export async function loadNotifications() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  const { data: activities, error: actError } = await supabase
    .from("activity_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (actError) console.error("Load activities error:", actError);

  let requestNotifications = [];
  if (_loadFriendRequestsFn) {
    const requests = await _loadFriendRequestsFn();
    requestNotifications = (requests || []).map((r) => ({
      id: `req_${r.id}`,
      type: "friend-request",
      title: t("notifications.friendRequest", { name: r.username }),
      message: r.email,
      time: r.created_at,
      read: false,
      data: r,
    }));
  }

  const activityNotifications = (activities || []).map((a) => ({
    id: `act_${a.id}`,
    type: a.type === "quest_complete" ? "quest-complete" : "skill-unlock",
    title: a.title,
    message: a.description,
    time: a.created_at,
    read: true,
    data: a,
  }));

  notifications = [...requestNotifications, ...activityNotifications];
  renderNotifications();
  updateNotificationBadge();

  return notifications;
}

export function renderNotifications() {
  const list = document.getElementById("notification-list");
  if (!list) return;

  if (notifications.length === 0) {
    list.innerHTML = `<p class="empty-state">${t("notifications.empty")}</p>`;
    return;
  }

  list.innerHTML = notifications
    .map((n) => {
      const timeAgo = getTimeAgo(n.time);
      const iconClass =
        n.type === "friend-request"
          ? "fa-user-plus"
          : n.type === "quest-complete"
            ? "fa-check-circle"
            : "fa-star";

      let actionsHtml = "";
      if (n.type === "friend-request" && n.data) {
        actionsHtml = `
                <div class="notification-actions">
                    <button class="btn-accept" data-action="acceptRequest" data-id="${n.data.id}">${t("friends.accept")}</button>
                    <button class="btn-decline" data-action="declineRequest" data-id="${n.data.id}">${t("friends.decline")}</button>
                </div>
            `;
      }

      return `
            <div class="notification-item ${n.read ? "" : "unread"} ${n.type}" data-notif-id="${n.id}">
                <i class="fas ${iconClass}"></i>
                <div class="notification-content">
                    <p>${n.title}</p>
                    <span class="time">${timeAgo}</span>
                    ${actionsHtml}
                </div>
            </div>
        `;
    })
    .join("");
}

export function toggleNotifications() {
  const panel = document.getElementById("notification-panel");
  if (!panel) return;

  isNotificationsOpen = !isNotificationsOpen;
  panel.classList.toggle("hidden", !isNotificationsOpen);

  if (isNotificationsOpen) {
    loadNotifications();
  }
}

export function closeNotifications() {
  const panel = document.getElementById("notification-panel");
  if (panel) panel.classList.add("hidden");
  isNotificationsOpen = false;
}

export function markAllRead() {
  notifications.forEach((n) => (n.read = true));
  renderNotifications();
  updateNotificationBadge();
}

export function updateNotificationBadge() {
  const badge = document.getElementById("notification-badge");
  if (!badge) return;

  const unreadCount = notifications.filter((n) => !n.read).length;
  badge.textContent = unreadCount;
  badge.classList.toggle("hidden", unreadCount === 0);
}

function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// ===== Click Outside to Close =====
document.addEventListener("click", (e) => {
  const panel = document.getElementById("notification-panel");
  const btn = document.getElementById("notification-btn");

  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    closeNotifications();
  }
});
