// ===== Main App =====
import { initSupabase, getSupabase } from "./supabase.js";
import {
  getCurrentUser,
  getCachedUser,
  clearCachedUser,
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

// Dynamic imports to avoid circular dependency with skills.js & quests.js
let skillsMod = null;
let questsMod = null;

async function loadSkillModules() {
  if (!skillsMod) skillsMod = await import("./skills.js");
  if (!questsMod) questsMod = await import("./quests.js");
}

let currentPage = "skillTree";
let isSidebarCollapsed = false;
let isDarkMode = true;
let authInitialized = false;
let authSubscription = null;
let appInitialized = false;

// ===== Cached User (avoid repeated getSession calls) =====
let currentUser = null;

export function getAppUser() {
  return currentUser;
}

export function setAppUser(user) {
  currentUser = user;
}

// ===== Page Icons =====
const PAGE_ICONS = {
  skillTree: "fa-gem",
  dailyQuests: "fa-scroll",
  friends: "fa-users",
  profile: "fa-id-card",
  settings: "fa-cog",
};

// ===== XP / Level Engine Config =====
const XP_CONFIG = {
  baseXp: 50,
  rankTitles: {
    F: { min: 1, max: 10, title: "F-Rank Hunter" },
    E: { min: 11, max: 20, title: "E-Rank Hunter" },
    D: { min: 21, max: 30, title: "D-Rank Hunter" },
    C: { min: 31, max: 40, title: "C-Rank Hunter" },
    B: { min: 41, max: 50, title: "B-Rank Hunter" },
    A: { min: 51, max: 60, title: "A-Rank Hunter" },
    S: { min: 61, max: 70, title: "S-Rank Hunter" },
    SS: { min: 71, max: 80, title: "SS-Rank Hunter" },
    SSS: { min: 81, max: 90, title: "SSS-Rank Hunter" },
    X: { min: 91, max: Infinity, title: "X-Rank Hunter" },
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

// ===== Initialization =====
async function init() {
  // Prevent multiple init calls (e.g. from DOMContentLoaded + script load)
  if (appInitialized) {
    console.log("[App] init() already running, skipping...");
    return;
  }
  appInitialized = true;

  if (!window.supabase) {
    // Check if script tag already exists to avoid duplicates
    const existingScript = document.querySelector(
      'script[src*="supabase.min.js"]',
    );
    if (existingScript) {
      // Wait for existing script to load
      if (!existingScript.dataset.loaded) {
        existingScript.addEventListener("load", () => {
          existingScript.dataset.loaded = "true";
          initSupabase();
          startApp();
        });
        return;
      }
      initSupabase();
      startApp();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    script.onload = () => {
      script.dataset.loaded = "true";
      initSupabase();
      startApp();
    };
    script.onerror = () => {
      console.error("[App] Failed to load Supabase library");
      notify("Failed to load required libraries. Please refresh.", "error");
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

    // Cache the user locally ONCE to avoid repeated getSession() calls
    // getCurrentUser() now has internal caching + concurrent call prevention
    currentUser = await getCurrentUser();
    if (!currentUser) {
      window.location.href = "login.html";
      return;
    }

    const appEl = document.getElementById("app");
    const authOverlay = document.getElementById("auth-overlay");
    if (appEl) appEl.classList.remove("hidden");
    if (authOverlay) authOverlay.classList.add("hidden");

    // Setup auth state listener ONCE only
    if (!authInitialized) {
      const { subscription } = onAuthStateChange((event, session) => {
        console.log("[Auth] Event:", event);
        if (event === "SIGNED_OUT") {
          currentUser = null;
          clearCachedUser();
          window.location.href = "login.html";
        } else if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          if (session && session.user) {
            currentUser = session.user;
          }
        } else if (event === "INITIAL_SESSION") {
          if (session && session.user) {
            currentUser = session.user;
          }
        }
      });
      authSubscription = subscription;
      authInitialized = true;
    }

    await loadSkillModules();
    setupEventDelegation();
    initMobileNav();

    await renderProfilePage();
    await skillsMod.loadSkills();
    skillsMod.renderSkills();
    await questsMod.loadQuests();
    questsMod.renderQuests();
    await loadFriends();
    renderFriends();
    await loadFriendRequests();
    renderRequests();
    await updateBadges();
    await loadNotifications();
    setLoadFriendRequestsFn(loadFriendRequests);

    await initXpEngine();
    await loadThemeColor();

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
  } catch (err) {
    console.error("startApp error:", err);
    notify("Failed to initialize app. Please refresh.", "error");
  } finally {
    showLoading(false);
  }
}

// ===== Mobile Navigation =====
function initMobileNav() {
  const mobileToggle = document.getElementById("mobile-menu-toggle");
  if (mobileToggle) {
    mobileToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMobileSidebar();
    });
  }

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 768) {
        closeMobileSidebar();
      }
    });
  });

  document.addEventListener("click", (e) => {
    const sidebar = document.getElementById("sidebar");
    const mobileToggle = document.getElementById("mobile-menu-toggle");
    if (
      window.innerWidth <= 768 &&
      sidebar &&
      sidebar.classList.contains("mobile-open") &&
      !sidebar.contains(e.target) &&
      (!mobileToggle || !mobileToggle.contains(e.target))
    ) {
      closeMobileSidebar();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      closeMobileSidebar();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMobileSidebar();
    }
  });
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("mobile-overlay");
  if (!sidebar) return;

  const isOpen = sidebar.classList.toggle("mobile-open");
  if (overlay) overlay.classList.toggle("active", isOpen);
  document.body.classList.toggle("mobile-nav-open", isOpen);
}

function closeMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("mobile-overlay");
  if (sidebar) sidebar.classList.remove("mobile-open");
  if (overlay) overlay.classList.remove("active");
  document.body.classList.remove("mobile-nav-open");
}

// ===== Event Delegation =====
function setupEventDelegation() {
  document.addEventListener("click", async (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    const value = target.dataset.value;
    e.preventDefault();

    switch (action) {
      case "navigate": {
        const page = target.dataset.page;
        if (page) navigateToPage(page);
        break;
      }

      case "logout":
        await handleLogout();
        break;

      case "completeSkill":
        if (id && skillsMod) {
          showLoading(true);
          await skillsMod.completeSkill(id);
          showLoading(false);
        }
        break;

      case "completeQuest":
        if (id && questsMod) {
          showLoading(true);
          await questsMod.completeQuest(id);
          showLoading(false);
        }
        break;

      case "showAddSkill":
        openAddSkillModal();
        break;

      case "saveNewSkill": {
        showLoading(true);
        await saveNewSkill();
        showLoading(false);
        break;
      }

      case "editProfileSkill":
        if (id) openEditSkillModal(id);
        break;

      case "saveSkillEdit": {
        showLoading(true);
        await saveSkillEdit();
        showLoading(false);
        break;
      }

      case "deleteProfileSkill":
        if (id && confirm(t("common.confirmDelete"))) {
          showLoading(true);
          await deleteSkill(id);
          showLoading(false);
        }
        break;

      case "showAddQuest":
        openAddQuestModal();
        break;

      case "saveNewQuest": {
        showLoading(true);
        await saveNewQuest();
        showLoading(false);
        break;
      }

      case "editProfileQuest":
        if (id) openEditQuestModal(id);
        break;

      case "saveQuestEdit": {
        showLoading(true);
        await saveQuestEdit();
        showLoading(false);
        break;
      }

      case "deleteProfileQuest":
        if (id && confirm(t("common.confirmDelete"))) {
          showLoading(true);
          await deleteQuest(id);
          showLoading(false);
        }
        break;

      case "switchTab": {
        const tab = target.dataset.tab;
        if (tab) switchTab(tab);
        break;
      }

      case "searchFriends": {
        const input = document.getElementById("friend-search-input");
        if (input) {
          showLoading(true);
          await searchUsers(input.value);
          showLoading(false);
        }
        break;
      }

      case "sendRequest":
        if (id) {
          showLoading(true);
          await sendFriendRequest(id);
          showLoading(false);
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
          setLoadFriendRequestsFn(loadFriendRequests);
        }
        break;

      case "declineRequest":
        if (id) {
          showLoading(true);
          await declineFriendRequest(id);
          showLoading(false);
          await loadNotifications();
          setLoadFriendRequestsFn(loadFriendRequests);
        }
        break;

      case "removeFriend":
        if (id && confirm(t("common.confirmDelete"))) {
          showLoading(true);
          await removeFriend(id);
          showLoading(false);
        }
        break;

      case "toggleNotifications":
        toggleNotifications();
        break;

      case "markAllRead":
        markAllRead();
        break;

      case "changeAvatar": {
        const avatarInput = document.getElementById("avatar-input");
        if (avatarInput) avatarInput.click();
        break;
      }

      case "changeLanguage": {
        const lang = value || target.value;
        if (lang) {
          setLanguage(lang);
          updatePageText();
        }
        break;
      }

      case "toggleDarkMode":
        toggleDarkMode();
        break;

      case "resetLevel":
        if (confirm(t("settings.resetConfirm"))) {
          await handleResetLevel();
        }
        break;

      case "resetData":
        if (confirm(t("settings.resetDataConfirm"))) {
          await handleResetData();
        }
        break;

      case "deleteAccount":
        if (confirm(t("settings.confirmDelete"))) {
          await handleDeleteAccount();
        }
        break;

      case "changeColor": {
        const color = target.dataset.color;
        if (color) setThemeColor(color);
        break;
      }

      case "closeModal":
        closeAllModals();
        break;
    }
  });

  const sidebarToggle = document.getElementById("sidebar-toggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar");
      isSidebarCollapsed = !isSidebarCollapsed;
      sidebar.classList.toggle("collapsed", isSidebarCollapsed);
    });
  }

  const avatarInput = document.getElementById("avatar-input");
  if (avatarInput) {
    avatarInput.addEventListener("change", async (e) => {
      showLoading(true);
      await handleAvatarChange(e);
      showLoading(false);
    });
  }

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

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAllModals();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllModals();
      closeNotifications();
      closeMobileSidebar();
    }
  });
}

// ===== Page Navigation =====
function navigateToPage(page) {
  currentPage = page;

  const titleEl = document.getElementById("page-title");
  const pageIconEl = document.getElementById("page-icon");

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

  if (pageIconEl) {
    const iconClass = PAGE_ICONS[page] || "fa-circle";
    pageIconEl.innerHTML = `<i class="fas ${iconClass}"></i>`;
  }

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === page);
  });

  document.querySelectorAll(".page").forEach((p) => {
    p.classList.toggle("active", p.id === page);
  });

  if (window.innerWidth <= 768) {
    closeMobileSidebar();
  }

  if (page === "profile") {
    renderProfilePage().then(() => {
      renderProfileItems();
    });
  } else if (page === "friends") {
    loadFriends().then(renderFriends);
    loadFriendRequests().then(() => {
      renderRequests();
      updateBadges();
    });
  } else if (page === "skillTree" && skillsMod) {
    skillsMod.loadSkills().then(() => skillsMod.renderSkills());
  } else if (page === "dailyQuests" && questsMod) {
    questsMod.loadQuests().then(() => questsMod.renderQuests());
  }
}

// ===== Logout =====
async function handleLogout() {
  showLoading(true);
  // Unsubscribe from auth listener to prevent race-condition redirect
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
    authInitialized = false;
  }
  currentUser = null;
  clearCachedUser();
  const { error } = await signOut();
  showLoading(false);
  if (error) {
    notify(error.message, "error");
    return;
  }
  window.location.href = "login.html";
}

// ===== Reset Level & XP =====
async function handleResetLevel() {
  const supabase = getSupabase();
  if (!supabase || !currentUser) return;

  showLoading(true);
  await updateStats({ level: 1, xp: 0 });

  updateXpDisplay(calculateLevel(0));

  notify(
    t("settings.resetSuccess") || "تم إعادة تعيين المستوى بنجاح",
    "success",
  );
  showLoading(false);
}

// ===== Reset Data (Skills & Quests only) =====
async function handleResetData() {
  showLoading(true);
  const { error } = await resetUserData();
  if (!error) {
    if (skillsMod) {
      await skillsMod.loadSkills();
      skillsMod.renderSkills();
    }
    if (questsMod) {
      await questsMod.loadQuests();
      questsMod.renderQuests();
    }
    await renderProfileItems();
  }
  showLoading(false);
}

// ===== Delete Account =====
async function handleDeleteAccount() {
  const supabase = getSupabase();
  if (!supabase || !currentUser) return;

  showLoading(true);

  await supabase.from("skills").delete().eq("user_id", currentUser.id);
  await supabase.from("quests").delete().eq("user_id", currentUser.id);
  await supabase
    .from("friendships")
    .delete()
    .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);
  await supabase
    .from("activity_history")
    .delete()
    .eq("user_id", currentUser.id);
  await supabase.from("user_stats").delete().eq("user_id", currentUser.id);
  await supabase.from("profiles").delete().eq("id", currentUser.id);

  // Unsubscribe before signOut to prevent redirect race
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
    authInitialized = false;
  }
  currentUser = null;
  clearCachedUser();

  await signOut();
  showLoading(false);
  window.location.href = "login.html";
}

// ===== XP / Level Engine =====

function getTotalXpForLevel(level) {
  if (level <= 1) return 0;
  return XP_CONFIG.baseXp * (level - 1) * level;
}

export function calculateLevel(xp) {
  let level = 1;
  while (getTotalXpForLevel(level + 1) <= xp) {
    level++;
  }
  const currentLevelBase = getTotalXpForLevel(level);
  const nextLevelBase = getTotalXpForLevel(level + 1);
  const currentXp = xp - currentLevelBase;
  const nextLevelXp = nextLevelBase - currentLevelBase;
  const progress = nextLevelXp === 0 ? 100 : (currentXp / nextLevelXp) * 100;

  return {
    level,
    currentXp,
    nextLevelXp,
    progress: Math.min(100, Math.max(0, progress)),
    totalXp: xp,
  };
}

export function getRankTitle(level) {
  for (const config of Object.values(XP_CONFIG.rankTitles)) {
    if (level >= config.min && level <= config.max) {
      return config.title;
    }
  }
  return "Unknown";
}

export function getRankLetter(level) {
  if (level >= 51) return "S";
  if (level >= 41) return "A";
  if (level >= 31) return "B";
  if (level >= 21) return "C";
  if (level >= 11) return "D";
  return "E";
}

export function getXpForLevel(level) {
  return getTotalXpForLevel(level + 1) - getTotalXpForLevel(level);
}

export async function addXp(amount) {
  if (!amount || amount <= 0) return;

  const supabase = getSupabase();
  if (!supabase || !currentUser) return;

  const { data: stats } = await supabase
    .from("user_stats")
    .select("xp, level")
    .eq("user_id", currentUser.id)
    .single();

  const currentXp = stats?.xp || 0;
  const currentLevel = stats?.level || 1;

  const newXp = currentXp + amount;
  const newStats = calculateLevel(newXp);

  const { error } = await supabase.from("user_stats").upsert(
    {
      user_id: currentUser.id,
      xp: newXp,
      level: newStats.level,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Add XP error:", error);
    return;
  }

  if (newStats.level > currentLevel) {
    notify(
      `${t("xp.levelUp") || "Level Up!"} — ${getRankTitle(newStats.level)} (Lv.${newStats.level})`,
      "success",
    );
  } else {
    notify(`+${amount} XP`, "info");
  }

  updateXpDisplay(newStats);
}

export function updateXpDisplay(stats) {
  if (!stats) return;

  const headerLevelDisplay = document.getElementById("user-level-display");
  const headerXp = document.getElementById("user-xp");
  const headerRank = document.getElementById("user-rank");
  const headerXpText = document.getElementById("header-xp-text");
  const xpProgress = document.getElementById("xp-progress");
  const sidebarLevel = document.getElementById("sidebar-level");
  const sidebarRankBadge = document.getElementById("sidebar-rank-badge");
  const sidebarXpFill = document.getElementById("sidebar-xp-fill");
  const sidebarXpText = document.getElementById("sidebar-xp-text");
  const headerUserRank = document.getElementById("header-user-rank");

  const profileLevel = document.getElementById("profile-level");
  const profileXp = document.getElementById("profile-xp");
  const profileRank = document.getElementById("profile-rank");
  const profileXpText = document.getElementById("profile-xp-text");
  const profileProgress = document.getElementById("profile-progress");

  const rankLetter = getRankLetter(stats.level);
  const rankTitle = getRankTitle(stats.level);

  if (headerLevelDisplay) headerLevelDisplay.textContent = `Lv.${stats.level}`;
  if (headerXp)
    headerXp.textContent = `${stats.currentXp}/${stats.nextLevelXp} XP`;
  if (headerRank) headerRank.textContent = rankTitle;
  if (headerXpText)
    headerXpText.textContent = `${stats.currentXp}/${stats.nextLevelXp} XP`;
  if (xpProgress) xpProgress.style.width = `${stats.progress}%`;
  if (headerUserRank) headerUserRank.textContent = rankLetter;

  if (sidebarLevel) sidebarLevel.textContent = `Lv.${stats.level}`;
  if (sidebarRankBadge) sidebarRankBadge.textContent = `${rankLetter}-Rank`;
  if (sidebarXpFill) sidebarXpFill.style.width = `${stats.progress}%`;
  if (sidebarXpText)
    sidebarXpText.textContent = `${stats.currentXp}/${stats.nextLevelXp} XP`;

  if (profileLevel) profileLevel.textContent = stats.level;
  if (profileXp) profileXp.textContent = stats.totalXp;
  if (profileRank) profileRank.textContent = rankTitle;
  if (profileXpText)
    profileXpText.textContent = `${stats.currentXp}/${stats.nextLevelXp} XP`;
  if (profileProgress) profileProgress.style.width = `${stats.progress}%`;
}

export async function initXpEngine() {
  const supabase = getSupabase();
  if (!supabase || !currentUser) return;

  const { data: stats } = await supabase
    .from("user_stats")
    .select("xp, level")
    .eq("user_id", currentUser.id)
    .single();

  const xp = stats?.xp || 0;
  const levelStats = calculateLevel(xp);
  updateXpDisplay(levelStats);
}

// ===== Global Theme =====
export function setThemeColor(colorName) {
  const colors = THEME_COLORS[colorName];
  if (!colors) return;

  const root = document.documentElement;
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--primary-dark", colors.primaryDark);
  root.style.setProperty("--primary-light", colors.primaryLight);
  root.style.setProperty("--primary-glow", `${colors.primary}66`);

  document.querySelectorAll(".color-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.color === colorName);
  });

  saveThemeColor(colorName);
}

async function saveThemeColor(colorName) {
  const supabase = getSupabase();
  if (!supabase || !currentUser) return;

  await supabase
    .from("profiles")
    .update({ theme_color: colorName })
    .eq("id", currentUser.id);
}

export async function loadThemeColor() {
  const supabase = getSupabase();
  if (!supabase || !currentUser) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("theme_color")
    .eq("id", currentUser.id)
    .single();

  if (error || !data?.theme_color) return;

  const colorName = data.theme_color;
  const colors = THEME_COLORS[colorName];
  if (!colors) return;

  const root = document.documentElement;
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--primary-dark", colors.primaryDark);
  root.style.setProperty("--primary-light", colors.primaryLight);
  root.style.setProperty("--primary-glow", `${colors.primary}66`);

  document.querySelectorAll(".color-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.color === colorName);
  });
}

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle("light-mode", !isDarkMode);
  updateThemeToggleUI();
}

function updateThemeToggleUI() {
  const toggle = document.getElementById("dark-mode-toggle");
  if (toggle) {
    toggle.setAttribute("aria-pressed", isDarkMode ? "true" : "false");
  }
}

// ===== Start =====
document.addEventListener("DOMContentLoaded", init);
