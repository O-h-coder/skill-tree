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
        // Only redirect on explicit sign-out to avoid init-time redirect loops
        if (event === "SIGNED_OUT") {
          window.location.href = "login.html";
        }
      });
      authInitialized = true;
    }

    setupEventDelegation();
    initMobileNav();

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
    setLoadFriendRequestsFn(loadFriendRequests);

    await initXpEngine();
    await loadThemeColor();

    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
      isDarkMode = false;
      document.body.classList.add("light-mode");
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
        if (id) {
          showLoading(true);
          const result = await completeSkill(id);
          const xpGain = result?.data?.xp_reward || 25;
          if (!result?.error) {
            await addXp(xpGain);
          }
          showLoading(false);
        }
        break;

      case "completeQuest":
        if (id) {
          showLoading(true);
          const result = await completeQuest(id);
          const xpGain = result?.data?.xp_reward || 10;
          if (!result?.error) {
            await addXp(xpGain);
          }
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
        const select = target;
        if (select) {
          setLanguage(select.value);
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

// ===== Reset Level & XP =====
async function handleResetLevel() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return;

  showLoading(true);
  await updateStats({ level: 1, xp: 0 });

  updateXpDisplay(calculateLevel(0));

  notify(t("settings.resetSuccess"), "success");
  showLoading(false);
}

// ===== Delete Account =====
async function handleDeleteAccount() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return;

  showLoading(true);

  await supabase.from("skills").delete().eq("user_id", user.id);
  await supabase.from("quests").delete().eq("user_id", user.id);
  await supabase
    .from("friendships")
    .delete()
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
  await supabase.from("activity_history").delete().eq("user_id", user.id);
  await supabase.from("user_stats").delete().eq("user_id", user.id);
  await supabase.from("profiles").delete().eq("id", user.id);

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

export function getXpForLevel(level) {
  return getTotalXpForLevel(level + 1) - getTotalXpForLevel(level);
}

export async function addXp(amount) {
  if (!amount || amount <= 0) return;

  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return;

  const { data: stats } = await supabase
    .from("user_stats")
    .select("xp, level")
    .eq("user_id", user.id)
    .single();

  const currentXp = stats?.xp || 0;
  const currentLevel = stats?.level || 1;

  const newXp = currentXp + amount;
  const newStats = calculateLevel(newXp);

  const { error } = await supabase.from("user_stats").upsert(
    {
      user_id: user.id,
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

  const profileLevel = document.getElementById("profile-level");
  const profileXp = document.getElementById("profile-xp");
  const profileRank = document.getElementById("profile-rank");
  const profileXpText = document.getElementById("profile-xp-text");
  const profileProgress = document.getElementById("profile-progress");

  if (headerLevelDisplay) headerLevelDisplay.textContent = `Lv.${stats.level}`;
  if (headerXp)
    headerXp.textContent = `${stats.currentXp}/${stats.nextLevelXp} XP`;
  if (headerRank) headerRank.textContent = getRankTitle(stats.level);
  if (headerXpText)
    headerXpText.textContent = `${stats.currentXp}/${stats.nextLevelXp} XP`;
  if (xpProgress) xpProgress.style.width = `${stats.progress}%`;

  if (profileLevel) profileLevel.textContent = stats.level;
  if (profileXp) profileXp.textContent = stats.currentXp;
  if (profileRank) profileRank.textContent = getRankTitle(stats.level);
  if (profileXpText)
    profileXpText.textContent = `${stats.currentXp}/${stats.nextLevelXp} XP`;
  if (profileProgress) profileProgress.style.width = `${stats.progress}%`;
}

export async function initXpEngine() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return;

  const { data: stats } = await supabase
    .from("user_stats")
    .select("xp, level")
    .eq("user_id", user.id)
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

  // Update active button state
  document.querySelectorAll(".color-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.color === colorName);
  });

  // Save to profile
  saveThemeColor(colorName);
}

async function saveThemeColor(colorName) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return;

  await supabase
    .from("profiles")
    .update({ theme_color: colorName })
    .eq("id", user.id);
}

export async function loadThemeColor() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("theme_color")
    .eq("id", user.id)
    .single();

  if (error || !data?.theme_color) return;

  const colorName = data.theme_color;
  const colors = THEME_COLORS[colorName];
  if (!colors) return;

  const root = document.documentElement;
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--primary-dark", colors.primaryDark);
  root.style.setProperty("--primary-light", colors.primaryLight);

  document.querySelectorAll(".color-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.color === colorName);
  });
}

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle("light-mode", !isDarkMode);
}

// ===== Start =====
document.addEventListener("DOMContentLoaded", init);
