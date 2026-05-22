// ===== Main App =====
import { initSupabase, getSupabase } from "./supabase.js";
import {
  getCurrentUser,
  getSession,
  signOut,
  onAuthStateChange,
  requireAuth,
} from "./auth.js";
import { t, setLanguage, updatePageText, getCurrentLang } from "./i18n.js";
import {
  notify,
  closeAllModals,
  showLoading,
  toggleNotifications,
  closeNotifications,
  markAllRead,
  loadNotifications,
} from "./ui.js";
import {
  renderProfilePage,
  handleAvatarChange,
  renderProfileItems,
  loadProfileSkills,
  loadProfileQuests,
} from "./user.js";
import {
  loadSkills,
  renderSkills,
  unlockSkill,
  openEditSkillModal,
  saveSkillEdit,
  deleteSkill,
  closeModal as closeSkillModal,
} from "./skills.js";
import {
  loadQuests,
  renderQuests,
  completeQuest,
  openEditQuestModal,
  openAddQuestModal,
  saveQuestEdit,
  saveNewQuest,
  deleteQuest,
  closeModal as closeQuestModal,
} from "./quests.js";
import {
  loadFriends,
  loadFriendRequests,
  renderFriends,
  renderRequests,
  renderSearchResults,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  switchTab,
  updateBadges,
} from "./friends.js";

let currentPage = "skillTree";
let isSidebarCollapsed = false;

// ===== Initialization =====
async function init() {
  // Load Supabase library
  if (!window.supabase) {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    script.onload = () => {
      initSupabase();
      startApp();
    };
    document.head.appendChild(script);
  } else {
    initSupabase();
    startApp();
  }
}

async function startApp() {
  showLoading(true);

  const isAuth = await requireAuth();
  if (!isAuth) {
    showLoading(false);
    return;
  }

  // Show app
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("auth-overlay").classList.add("hidden");

  // Setup auth listener
  onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      window.location.href = "login.html";
    }
  });

  // Setup event delegation
  setupEventDelegation();

  // Load initial data
  await renderProfilePage();
  await loadSkills();
  renderSkills();
  await loadQuests();
  renderQuests();
  await loadFriends();
  renderFriends();
  await loadFriendRequests();
  renderRequests();
  await updateBadges();
  await loadNotifications();

  // Set initial page
  navigateToPage("skillTree");
  updatePageText();

  showLoading(false);
}

// ===== Event Delegation =====
function setupEventDelegation() {
  document.addEventListener("click", async (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    e.preventDefault();

    switch (action) {
      // Navigation
      case "navigate":
        const page = target.dataset.page;
        if (page) navigateToPage(page);
        break;

      case "logout":
        await handleLogout();
        break;

      // Skills
      case "unlockSkill":
        if (id) {
          showLoading(true);
          await unlockSkill(id);
          showLoading(false);
        }
        break;

      case "editSkill":
        if (id) openEditSkillModal(id);
        break;

      case "deleteSkill":
        if (id && confirm(t("common.confirmDelete"))) {
          showLoading(true);
          await deleteSkill(id);
          showLoading(false);
        }
        break;

      case "saveSkillEdit":
        showLoading(true);
        await saveSkillEdit();
        showLoading(false);
        break;

      // Quests
      case "completeQuest":
        if (id) {
          showLoading(true);
          await completeQuest(id);
          showLoading(false);
        }
        break;

      case "showAddQuest":
        openAddQuestModal();
        break;

      case "saveNewQuest":
        showLoading(true);
        await saveNewQuest();
        showLoading(false);
        break;

      case "editQuest":
        if (id) openEditQuestModal(id);
        break;

      case "deleteQuest":
        if (id && confirm(t("common.confirmDelete"))) {
          showLoading(true);
          await deleteQuest(id);
          showLoading(false);
        }
        break;

      case "saveQuestEdit":
        showLoading(true);
        await saveQuestEdit();
        showLoading(false);
        break;

      // Friends
      case "switchTab":
        const tab = target.dataset.tab;
        if (tab) switchTab(tab);
        break;

      case "searchFriends":
        const input = document.getElementById("friend-search-input");
        if (input) {
          showLoading(true);
          await searchUsers(input.value);
          showLoading(false);
        }
        break;

      case "sendRequest":
        if (id) {
          showLoading(true);
          await sendFriendRequest(id);
          showLoading(false);
          // Refresh search results
          const searchInput = document.getElementById("friend-search-input");
          if (searchInput) await searchUsers(searchInput.value);
        }
        break;

      case "acceptRequest":
        if (id) {
          showLoading(true);
          await acceptFriendRequest(id);
          showLoading(false);
          await loadNotifications();
        }
        break;

      case "declineRequest":
        if (id) {
          showLoading(true);
          await declineFriendRequest(id);
          showLoading(false);
          await loadNotifications();
        }
        break;

      case "removeFriend":
        if (id && confirm(t("common.confirmDelete"))) {
          showLoading(true);
          await removeFriend(id);
          showLoading(false);
        }
        break;

      // Notifications
      case "toggleNotifications":
        toggleNotifications();
        break;

      case "markAllRead":
        markAllRead();
        break;

      // Profile
      case "changeAvatar":
        const avatarInput = document.getElementById("avatar-input");
        if (avatarInput) avatarInput.click();
        break;

      // Settings
      case "changeLanguage":
        const select = target;
        if (select) {
          setLanguage(select.value);
          updatePageText();
        }
        break;

      case "deleteAccount":
        if (confirm(t("settings.confirmDelete"))) {
          await handleDeleteAccount();
        }
        break;

      // Modals
      case "closeModal":
        closeAllModals();
        break;
    }
  });

  // Sidebar toggle
  const sidebarToggle = document.getElementById("sidebar-toggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar");
      isSidebarCollapsed = !isSidebarCollapsed;
      sidebar.classList.toggle("collapsed", isSidebarCollapsed);
    });
  }

  // Avatar input change
  const avatarInput = document.getElementById("avatar-input");
  if (avatarInput) {
    avatarInput.addEventListener("change", async (e) => {
      showLoading(true);
      await handleAvatarChange(e);
      showLoading(false);
    });
  }

  // Friend search input enter key
  const friendSearchInput = document.getElementById("friend-search-input");
  if (friendSearchInput) {
    friendSearchInput.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        showLoading(true);
        await searchUsers(friendSearchInput.value);
        showLoading(false);
      }
    });
  }

  // Close modals on backdrop click
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });

  // Close notifications on escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllModals();
      closeNotifications();
    }
  });
}

// ===== Page Navigation =====
function navigateToPage(page) {
  currentPage = page;

  // Update page title
  const titleEl = document.getElementById("page-title");
  if (titleEl) {
    const titles = {
      skillTree: t("nav.skillTree"),
      dailyQuests: t("nav.dailyQuests"),
      friends: t("nav.friends"),
      profile: t("nav.profile"),
      settings: t("nav.settings"),
    };
    titleEl.textContent = titles[page] || page;
  }

  // Update nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === page);
  });

  // Show/hide pages
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.toggle("active", p.id === page);
  });

  // Page-specific refresh
  if (page === "profile") {
    renderProfilePage();
    renderProfileItems();
  } else if (page === "friends") {
    loadFriends().then(renderFriends);
    loadFriendRequests().then(() => {
      renderRequests();
      updateBadges();
    });
  } else if (page === "skillTree") {
    loadSkills().then(renderSkills);
  } else if (page === "dailyQuests") {
    loadQuests().then(renderQuests);
  }
}

// ===== Logout =====
async function handleLogout() {
  showLoading(true);
  const { error } = await signOut();
  showLoading(false);

  if (error) {
    notify(error.message, "error");
    return;
  }

  window.location.href = "login.html";
}

// ===== Delete Account =====
async function handleDeleteAccount() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return;

  showLoading(true);

  // Delete user data from tables
  await supabase.from("user_skills").delete().eq("user_id", user.id);
  await supabase.from("quests").delete().eq("user_id", user.id);
  await supabase
    .from("friendships")
    .delete()
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
  await supabase.from("activity_history").delete().eq("user_id", user.id);
  await supabase.from("user_stats").delete().eq("user_id", user.id);
  await supabase.from("profiles").delete().eq("id", user.id);

  // Sign out
  await signOut();

  showLoading(false);
  window.location.href = "login.html";
}

// ===== Start =====
document.addEventListener("DOMContentLoaded", init);
