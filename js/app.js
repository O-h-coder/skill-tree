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
import { notify, showLoading, closeAllModals } from "./utils.js";
import {
  toggleNotifications,
  closeNotifications,
  markAllRead,
  loadNotifications,
  setLoadFriendRequestsFn,
} from "./ui.js";
import {
  renderProfilePage,
  handleAvatarChange,
  renderProfileItems,
  loadProfileSkills,
  loadProfileQuests,
  openAddSkillModal,
  openEditSkillModal,
  saveSkillEdit,
  saveNewSkill,
  openAddQuestModal,
  openEditQuestModal,
  saveQuestEdit,
  saveNewQuest,
  deleteSkill,
  deleteQuest,
  updateStats,
  closeModal,
  resetUserData,
} from "./user.js";
import { loadSkills, renderSkills, completeSkill } from "./skills.js";
import { loadQuests, renderQuests, completeQuest } from "./quests.js";
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
  setupFriendRequestsSubscription,
  cleanupFriendRequestsSubscription,
} from "./friends.js";

// ===== XP / Level Engine Config =====
const XP_CONFIG = {
  baseXp: 50,
  rankTitles: {
    E: { min: 1, max: 10, title: "E-Rank Hunter" },
    D: { min: 11, max: 20, title: "D-Rank Hunter" },
    C: { min: 21, max: 30, title: "C-Rank Hunter" },
    B: { min: 31, max: 40, title: "B-Rank Hunter" },
    A: { min: 41, max: 50, title: "A-Rank Hunter" },
    S: { min: 51, max: Infinity, title: "S-Rank Hunter" },
  },
};

// ===== Global Theme Colors =====
const THEME_COLORS = {
  indigo: {
    primary: "#6366f1",
    primaryDark: "#4f46e5",
    primaryLight: "#818cf8",
  },
  emerald: {
    primary: "#10b981",
    primaryDark: "#059669",
    primaryLight: "#34d399",
  },
  rose: { primary: "#f43f5e", primaryDark: "#e11d48", primaryLight: "#fb7185" },
  amber: {
    primary: "#f59e0b",
    primaryDark: "#d97706",
    primaryLight: "#fbbf24",
  },
  cyan: { primary: "#06b6d4", primaryDark: "#0891b2", primaryLight: "#22d3ee" },
};

let currentPage = "skillTree";
let isSidebarCollapsed = false;
let isDarkMode = true;
let authInitialized = false;

// NEW: Friend request refresh tracking
let lastFriendRequestsFetch = 0;

// ===== Page Icons =====
const PAGE_ICONS = {
  skillTree: "fa-gem",
  dailyQuests: "fa-scroll",
  friends: "fa-users",
  profile: "fa-id-card",
  settings: "fa-cog",
};

// ===== Initialization =====
async function init() {
  if (!window.supabase) {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    script.onload = () => {
      initSupabase();
      startApp();
    };
    script.onerror = () => {
      notify("Failed to load Supabase library. Please refresh.", "error");
    };
    document.head.appendChild(script);
  } else {
    initSupabase();
    startApp();
  }
}

async function startApp() {
  try {
    showLoading(true);

    const isAuth = await requireAuth();
    if (!isAuth) {
      showLoading(false);
      return;
    }

    const appEl = document.getElementById("app");
    const authOverlay = document.getElementById("auth-overlay");
    if (appEl) appEl.classList.remove("hidden");
    if (authOverlay) authOverlay.classList.add("hidden");

    if (!authInitialized) {
      onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          cleanupFriendRequestsSubscription();
          window.location.href = "login.html";
        }
      });

      authInitialized = true;
    }

    setupEventDelegation();
    initMobileNav();

    // Load data with individual error boundaries - don't let one failure crash everything
    await safeLoad("renderProfilePage", () => renderProfilePage());
    await safeLoad("loadSkills", () => loadSkills());
    renderSkills();
    await safeLoad("loadQuests", () => loadQuests());
    renderQuests();
    await safeLoad("loadFriends", () => loadFriends());
    renderFriends();
    await safeLoad("loadFriendRequests", () => loadFriendRequests());
    renderRequests();
    await safeLoad("updateBadges", () => updateBadges());
    await safeLoad("loadNotifications", () => loadNotifications());

    setLoadFriendRequestsFn(loadFriendRequests);

    // NEW: Setup realtime friend request subscription
    await setupFriendRequestsSubscription();

    await safeLoad("initXpEngine", () => initXpEngine());
    await safeLoad("loadThemeColor", () => loadThemeColor());

    // Check system preference
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
      isDarkMode = false;
      document.body.classList.add("light-mode");
      updateThemeToggleUI();
    }

    navigateToPage("skillTree");
    updatePageText();

    // NEW: Refresh friend requests when user returns to tab
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState !== "visible") return;

      const now = Date.now();
      const MIN_REFRESH_INTERVAL = 30000;

      if (now - lastFriendRequestsFetch < MIN_REFRESH_INTERVAL) {
        return;
      }

      lastFriendRequestsFetch = now;

      try {
        await loadFriendRequests();
        renderRequests();
        updateBadges();
      } catch (err) {
        console.error("visibilitychange refresh error:", err);
      }
    });
  } catch (err) {
    console.error("startApp error:", err);
    notify("Failed to initialize app. Please refresh.", "error");
  } finally {
    showLoading(false);
  }
}
