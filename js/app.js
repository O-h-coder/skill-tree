// File js/app.js
/**
 * app.js — المحرك الرئيسي للتطبيق
 */

import {
  onAuthStateChange,
  signOut,
  getCurrentUser,
  getCurrentUserId,
} from "./auth.js";
import {
  fetchUserData,
  getCachedUserData,
  uploadAvatar,
  resetSkillsAndLevel,
  resetUserSettings,
  updateUsername,
} from "./user.js";
import {
  fetchUserSkills,
  addSkill,
  renderSkillTreePage,
  renderSkillsList,
} from "./skills.js";
import {
  fetchDailyQuests,
  addQuest,
  renderDailyQuestsPage,
  renderQuestsList,
} from "./quests.js";
import {
  searchUserByUsername,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendsList,
  removeFriend,
} from "./friends.js";
import { t, renderTranslations, setLanguage } from "./i18n.js";
import { THEMES } from "./constants.js";
import {
  showToast,
  showModal,
  closeModal,
  updateXPBar,
  updateUserStatusSummary,
  navigateTo,
  toggleMobileMenu,
  toggleDarkMode,
  toggleThemeDropdown,
  populateThemeDropdown,
  setupGlobalEventListeners,
} from "./ui.js";

let isInitialized = false;

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", async () => {
  if (isInitialized) return;
  isInitialized = true;

  setupGlobalEventListeners();
  setupAppActions();
  setupPageListeners();

  try {
    const { user } = await getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    await initApp(user);

    onAuthStateChange(({ event }) => {
      if (event === "SIGNED_OUT") window.location.href = "login.html";
    });
  } catch (err) {
    console.error("Init error:", err);
    window.location.href = "login.html";
  }
});

async function initApp(user) {
  const loadingScreen = document.getElementById("loadingScreen");

  try {
    const { data, error } = await fetchUserData();
    if (error) {
      showToast(error, "error");
      hideLoadingScreen();
      return;
    }

    if (data?.language) setLanguage(data.language);
    else renderTranslations();

    // FIX: apply saved theme colors immediately
    if (data?.theme && THEMES[data.theme]) {
      const theme = THEMES[data.theme];
      document.documentElement.style.setProperty("--primary", theme.primary);
      document.documentElement.style.setProperty("--accent", theme.secondary);
    }

    // Check username — first visit modal
    if (!data?.username) {
      hideLoadingScreen();
      showUsernameModal();
      return;
    }

    // Show content
    document.getElementById("topbar").style.removeProperty("display");
    document.getElementById("mainContent").style.removeProperty("display");
    hideLoadingScreen();

    navigateTo("skillTree");
    populateThemeDropdown(THEMES, data?.theme || "neonBlue", handleThemeChange);

    // FIX: bind avatar input change directly so file picker works
    const avatarInput = document.getElementById("avatarInput");
    if (avatarInput) {
      avatarInput.addEventListener("change", async (e) => {
        window.dispatchEvent(
          new CustomEvent("appaction", {
            detail: { action: "handleAvatarChange", element: e.target },
            bubbles: true,
          }),
        );
      });
    }

    await loadPageData("skillTree");
  } catch (err) {
    console.error("initApp error:", err);
    showToast(t("failedLoad"), "error");
    hideLoadingScreen();
  }
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loadingScreen");
  if (!loadingScreen) return;
  loadingScreen.classList.add("fade-out");
  setTimeout(() => {
    loadingScreen.style.display = "none";
  }, 500);
}

function showUsernameModal() {
  const modal = document.getElementById("usernameModal");
  if (modal) modal.style.display = "flex";
}

async function handleSaveUsername() {
  const input = document.getElementById("usernameInput");
  const username = input?.value?.trim();

  if (!username) {
    showToast(t("usernameRequired"), "error");
    return;
  }
  if (username.length < 3) {
    showToast(t("usernameShort"), "error");
    return;
  }

  try {
    const { error } = await updateUsername(username);
    if (error) {
      showToast(error, "error");
      return;
    }

    showToast(t("saved"), "success");
    document.getElementById("usernameModal").style.display = "none";

    // Refresh user data and continue
    await fetchUserData();

    document.getElementById("topbar").style.removeProperty("display");
    document.getElementById("mainContent").style.removeProperty("display");
    navigateTo("skillTree");
    await loadPageData("skillTree");
  } catch (err) {
    console.error("handleSaveUsername error:", err);
    showToast(t("failedSaveUsername"), "error");
  }
}

// ========== Event Routing ==========
function setupAppActions() {
  window.addEventListener("appaction", async (e) => {
    const { action, mode, lang, element } = e.detail;

    switch (action) {
      case "toggleMobileMenu":
        toggleMobileMenu();
        break;
      case "toggleDarkMode":
        toggleDarkMode();
        break;
      case "setLanguage":
        await handleSetLanguage(lang);
        break;
      case "toggleThemeDropdown":
        toggleThemeDropdown();
        break;
      case "closeModal":
        closeModal();
        break;
      case "triggerAvatarUpload":
        document.getElementById("avatarInput")?.click();
        break;
      case "handleAvatarChange":
        await handleAvatarChange(element);
        break;
      case "addNewSkill":
        await handleAddNewSkill();
        break;
      case "addNewUserQuest":
        await handleAddNewUserQuest();
        break;
      case "handleResetSkills":
        await handleResetSkills();
        break;
      case "resetSettingsAndData":
        await handleResetSettings();
        break;
      case "deleteAccount":
        showToast(t("contactSupport"), "info");
        break;
      case "logout":
        await handleLogout();
        break;
      case "switchFriendsTab":
        handleSwitchFriendsTab(element);
        break;
      case "searchFriend":
        await handleSearchFriend();
        break;
      case "saveUsername":
        await handleSaveUsername();
        break;
    }
  });
}

function setupPageListeners() {
  window.addEventListener("pagechange", async (e) => {
    await loadPageData(e.detail.page);
  });
}

async function loadPageData(page) {
  switch (page) {
    case "skillTree":
      await renderSkillsPage();
      break;
    case "dailyQuests":
      await renderQuestsPage();
      break;
    case "friends":
      await renderFriendsPage();
      break;
    case "profile":
      await renderProfilePage();
      break;
    case "settings":
      await renderSettingsPage();
      break;
  }
}

// ========== Handlers ==========
async function handleSetLanguage(lang) {
  try {
    setLanguage(lang);
    const userId = getCurrentUserId();
    if (userId) {
      const { getSupabase } = await import("./supabase.js");
      const sb = await getSupabase();
      await sb.from("profiles").update({ language: lang }).eq("id", userId);
    }
  } catch (err) {
    console.error("handleSetLanguage error:", err);
  }
}

async function handleAvatarChange(input) {
  try {
    const file = input.files?.[0];
    if (!file) return;
    const { url, error } = await uploadAvatar(file);
    if (error) {
      showToast(error, "error");
      return;
    }
    const container = document.getElementById("profileAvatarContainer");
    if (container)
      container.innerHTML = `<img src="${url}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    showToast(t("avatarUpdated"), "success");
  } catch (err) {
    console.error("handleAvatarChange error:", err);
    showToast(t("failedUploadAvatar"), "error");
  }
}

async function handleAddNewSkill() {
  try {
    const name = document.getElementById("newSkillName")?.value?.trim();
    const xp = parseInt(document.getElementById("newSkillXP")?.value) || 100;
    const desc = document.getElementById("newSkillDesc")?.value?.trim();
    const icon = document.getElementById("newSkillIcon")?.value;

    if (!name) {
      showToast(t("skillNameRequired"), "error");
      return;
    }

    const { skill, error } = await addSkill({
      name,
      description: desc,
      icon,
      xp_required: xp,
    });
    if (error) {
      showToast(error, "error");
      return;
    }

    showToast(t("skillAdded"), "success");
    document.getElementById("newSkillName").value = "";
    document.getElementById("newSkillDesc").value = "";
    await renderSkillsPage();
    await renderProfilePage();
  } catch (err) {
    console.error("handleAddNewSkill error:", err);
    showToast(t("failedAddSkill"), "error");
  }
}

async function handleAddNewUserQuest() {
  try {
    const name = document.getElementById("newUserQuestName")?.value?.trim();
    const xp = parseInt(document.getElementById("newUserQuestXP")?.value) || 50;
    const desc = document.getElementById("newUserQuestDesc")?.value?.trim();

    if (!name) {
      showToast(t("questNameRequired"), "error");
      return;
    }

    const { quest, error } = await addQuest({
      name,
      description: desc,
      xp_reward: xp,
      is_daily: false,
    });
    if (error) {
      showToast(error, "error");
      return;
    }

    showToast(t("questAdded"), "success");
    document.getElementById("newUserQuestName").value = "";
    document.getElementById("newUserQuestDesc").value = "";
    await renderQuestsPage();
    await renderProfilePage();
  } catch (err) {
    console.error("handleAddNewUserQuest error:", err);
    showToast(t("failedAddQuest"), "error");
  }
}

async function handleResetSkills() {
  if (!confirm(t("resetConfirm"))) return;
  try {
    const { error } = await resetSkillsAndLevel();
    if (error) {
      showToast(error, "error");
      return;
    }
    showToast(t("resetDone"), "success");
    await renderSkillsPage();
    await renderProfilePage();
    updateUserStatusSummary();
  } catch (err) {
    console.error("handleResetSkills error:", err);
    showToast(t("failedReset"), "error");
  }
}

async function handleResetSettings() {
  if (!confirm(t("resetConfirm"))) return;
  try {
    const { error } = await resetUserSettings();
    if (error) {
      showToast(error, "error");
      return;
    }
    toggleDarkMode();
    setLanguage("ar");
    showToast(t("settingsReset"), "success");
  } catch (err) {
    console.error("handleResetSettings error:", err);
    showToast(t("failedReset"), "error");
  }
}

async function handleLogout() {
  try {
    const { error } = await signOut();
    if (error) showToast(error, "error");
    else {
      showToast(t("logoutSuccess"), "success");
      setTimeout(() => (window.location.href = "login.html"), 600);
    }
  } catch (err) {
    console.error("handleLogout error:", err);
    window.location.href = "login.html";
  }
}

// FIX: save selected theme to DB and apply CSS variables
async function handleThemeChange(themeKey) {
  const theme = THEMES[themeKey];
  if (!theme) return;
  document.documentElement.style.setProperty("--primary", theme.primary);
  document.documentElement.style.setProperty("--accent", theme.secondary);

  const userId = getCurrentUserId();
  if (userId) {
    try {
      const { getSupabase } = await import("./supabase.js");
      const sb = await getSupabase();
      await sb.from("profiles").update({ theme: themeKey }).eq("id", userId);
    } catch (err) {
      console.error("handleThemeChange save error:", err);
    }
  }

  showToast(t("themeSaved", { theme: theme.name }), "success");
}

async function handleSearchFriend() {
  const username = document
    .getElementById("searchFriendUsername")
    ?.value?.trim();
  const preview = document.getElementById("friendPreview");

  if (!username) {
    if (preview) preview.innerHTML = "";
    showToast(t("enterUsernameFirst"), "info");
    return;
  }

  try {
    const { user, error } = await searchUserByUsername(username);
    if (error) {
      showToast(error, "error");
      if (preview) preview.innerHTML = "";
      return;
    }

    if (preview) {
      preview.innerHTML = `
        <div class="friend-preview">
          <div class="friend-info">
            <div class="friend-avatar">${user.avatar_url ? `<img src="${escapeHtml(user.avatar_url)}">` : '<i class="fas fa-user"></i>'}</div>
            <div><strong>${escapeHtml(user.display_name || user.username)}</strong><small>${escapeHtml(user.title || "E-Rank Hunter")} — LVL ${user.level || 1}</small></div>
          </div>
          <button class="btn btn-primary" id="btnSendRequest"><i class="fas fa-user-plus"></i> ${t("addFriend")}</button>
        </div>
      `;
      document
        .getElementById("btnSendRequest")
        ?.addEventListener("click", async () => {
          try {
            const { error } = await sendFriendRequest(user.id);
            if (error) {
              showToast(error, "error");
            } else {
              showToast(t("friendRequestSent"), "success");
              preview.innerHTML = "";
              document.getElementById("searchFriendUsername").value = "";
              await renderFriendsPage();
            }
          } catch (err) {
            console.error("sendFriendRequest error:", err);
            showToast(t("failedSendRequest"), "error");
          }
        });
    }
  } catch (err) {
    console.error("handleSearchFriend error:", err);
    showToast(t("failedSearch"), "error");
    if (preview) preview.innerHTML = "";
  }
}

// ========== Page Renderers ==========
async function renderSkillsPage() {
  try {
    await renderSkillTreePage();
  } catch (err) {
    console.error("renderSkillsPage error:", err);
    showToast(t("failedLoadSkills"), "error");
  }
}

async function renderQuestsPage() {
  try {
    await renderDailyQuestsPage();
  } catch (err) {
    console.error("renderQuestsPage error:", err);
    showToast(t("failedLoadQuests"), "error");
  }
}

async function renderFriendsPage() {
  const list = document.getElementById("friendsList");
  const receivedList = document.getElementById("friendsReceivedList");
  const sentList = document.getElementById("friendsSentList");
  const receivedCount = document.getElementById("receivedCount");
  const sentCount = document.getElementById("sentCount");

  if (!list) return;

  try {
    const { friends, pending, error } = await getFriendsList();
    if (error) {
      showToast(error, "error");
      return;
    }

    // Badge counts
    if (receivedCount) {
      const count = pending.received?.length || 0;
      receivedCount.textContent = count;
      receivedCount.style.display = count > 0 ? "inline-flex" : "none";
    }
    if (sentCount) {
      const count = pending.sent?.length || 0;
      sentCount.textContent = count;
      sentCount.style.display = count > 0 ? "inline-flex" : "none";
    }

    // === RECEIVED REQUESTS ===
    if (receivedList) {
      if (pending.received?.length) {
        receivedList.innerHTML = pending.received
          .map(
            (req) => `
          <div class="friend-row pending">
            <div class="friend-info">
              <div class="friend-avatar">${req.avatar_url ? `<img src="${escapeHtml(req.avatar_url)}" alt="">` : '<i class="fas fa-user"></i>'}</div>
              <div>
                <strong>${escapeHtml(req.display_name || req.username)}</strong>
                <small>${escapeHtml(req.title || "E-Rank Hunter")} — LVL ${req.level || 1}</small>
              </div>
            </div>
            <div class="friend-actions">
              <button class="btn btn-sm btn-success btn-accept" data-request-id="${req.request_id}"><i class="fas fa-check"></i> ${t("accept")}</button>
              <button class="btn btn-sm btn-danger btn-reject" data-request-id="${req.request_id}"><i class="fas fa-times"></i> ${t("reject")}</button>
            </div>
          </div>
        `,
          )
          .join("");
      } else {
        receivedList.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>${t("noReceived")}</p></div>`;
      }

      receivedList.querySelectorAll(".btn-accept").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            const { error } = await acceptFriendRequest(btn.dataset.requestId);
            if (error) showToast(error, "error");
            else {
              showToast(t("friendRequestAccepted"), "success");
              await renderFriendsPage();
            }
          } catch (err) {
            console.error("acceptFriendRequest error:", err);
            showToast(t("failedAcceptRequest"), "error");
          }
        });
      });

      receivedList.querySelectorAll(".btn-reject").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            const { error } = await rejectFriendRequest(btn.dataset.requestId);
            if (error) showToast(error, "error");
            else {
              showToast(t("friendRequestRejected"), "info");
              await renderFriendsPage();
            }
          } catch (err) {
            console.error("rejectFriendRequest error:", err);
            showToast(t("failedRejectRequest"), "error");
          }
        });
      });
    }

    // === SENT REQUESTS ===
    if (sentList) {
      if (pending.sent?.length) {
        sentList.innerHTML = pending.sent
          .map(
            (req) => `
          <div class="friend-row pending">
            <div class="friend-info">
              <div class="friend-avatar">${req.avatar_url ? `<img src="${escapeHtml(req.avatar_url)}" alt="">` : '<i class="fas fa-user"></i>'}</div>
              <div>
                <strong>${escapeHtml(req.display_name || req.username)}</strong>
                <small>${escapeHtml(req.title || "E-Rank Hunter")} — LVL ${req.level || 1}</small>
              </div>
            </div>
            <div class="friend-actions">
              <span class="node-status available" style="font-size:0.8rem"><i class="fas fa-clock"></i> ${t("pending")}</span>
            </div>
          </div>
        `,
          )
          .join("");
      } else {
        sentList.innerHTML = `<div class="empty-state"><i class="fas fa-paper-plane"></i><p>${t("noSent")}</p></div>`;
      }
    }

    // === FRIENDS LEADERBOARD ===
    if (friends?.length) {
      list.innerHTML = friends
        .map(
          (friend, index) => `
        <div class="friend-row">
          <div class="friend-rank" style="${index < 3 ? "background: linear-gradient(135deg, var(--primary), var(--accent)); color: #fff; border: none; box-shadow: 0 4px 15px rgba(0,212,255,0.3);" : ""}">
            #${index + 1}
          </div>
          <div class="friend-info">
            <div class="friend-avatar">${friend.avatar_url ? `<img src="${escapeHtml(friend.avatar_url)}" alt="">` : '<i class="fas fa-user"></i>'}</div>
            <div>
              <strong>${escapeHtml(friend.display_name || friend.username)}</strong>
              <small>${escapeHtml(friend.title || "E-Rank Hunter")} — LVL ${friend.level || 1}</small>
            </div>
          </div>
          <div class="friend-actions">
            <button class="btn btn-sm btn-danger btn-remove" data-friendship-id="${friend.friendship_id}"><i class="fas fa-user-minus"></i> ${t("remove")}</button>
          </div>
        </div>
      `,
        )
        .join("");
    } else {
      list.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>${t("noFriends")}</p></div>`;
    }

    list.querySelectorAll(".btn-remove").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm(t("confirmRemoveFriend"))) return;
        try {
          const { error } = await removeFriend(btn.dataset.friendshipId);
          if (error) showToast(error, "error");
          else {
            showToast(t("friendRemoved"), "info");
            await renderFriendsPage();
          }
        } catch (err) {
          console.error("removeFriend error:", err);
          showToast(t("failedRemoveFriend"), "error");
        }
      });
    });
  } catch (err) {
    console.error("renderFriendsPage error:", err);
    showToast(t("failedLoadFriends"), "error");
  }
}

async function renderProfilePage() {
  try {
    const userData = getCachedUserData();
    if (!userData) return;

    const nameEl = document.getElementById("profName");
    const emailEl = document.getElementById("profEmail");
    const levelText = document.getElementById("profLevelText");
    const xpText = document.getElementById("profXPText");
    const avatar = document.getElementById("profileAvatarContainer");

    if (nameEl)
      nameEl.textContent =
        userData.display_name || userData.username || "Player";
    if (emailEl) emailEl.textContent = userData.email || "-";
    if (levelText) levelText.textContent = `Level ${userData.level || 1}`;
    if (xpText) xpText.textContent = `${userData.exp || 0} XP`;

    if (avatar) {
      if (userData.avatar_url) {
        avatar.innerHTML = `<img src="${escapeHtml(userData.avatar_url)}" alt="Avatar">`;
      } else {
        avatar.innerHTML = `<i class="fas fa-user"></i>`;
      }
    }

    const skillsCount = document.getElementById("profSkillsCount");
    const questsCount = document.getElementById("profQuestsCount");
    const friendsCount = document.getElementById("profFriendsCount");
    const streakCount = document.getElementById("profStreakCount");

    if (skillsCount)
      skillsCount.textContent = `${userData.stats?.skills_unlocked || 0} / ${userData.stats?.total_skills || 0}`;
    if (questsCount)
      questsCount.textContent = `${userData.stats?.quests_done || 0} / ${userData.stats?.total_quests || 0}`;
    if (friendsCount)
      friendsCount.textContent = userData.stats?.friends_count || 0;
    if (streakCount) streakCount.textContent = userData.stats?.streak || 0;

    // Render skills list in profile
    const { skills, error: skillsError } = await fetchUserSkills();
    if (skillsError) {
      console.error("fetchUserSkills error:", skillsError);
    } else {
      renderSkillsList("profilePersonalSkillsList", skills || []);
    }

    // Render quests list in profile
    const { quests, error: questsError } = await fetchDailyQuests();
    if (questsError) {
      console.error("fetchDailyQuests error:", questsError);
    } else {
      renderQuestsList("profileDailySkillsList", quests || []);
    }

    const historyList = document.getElementById("profileHistoryList");
    if (historyList) {
      try {
        const { getActivityHistory } = await import("./user.js");
        const { history, error: histError } = await getActivityHistory(20);
        if (histError) {
          console.error("getActivityHistory error:", histError);
          historyList.innerHTML = `<li class="history-empty">${t("failedLoadHistory")}</li>`;
        } else if (history?.length) {
          historyList.innerHTML = history
            .map(
              (h) => `
            <li><div>${escapeHtml(h.description)}</div><div class="hist-date">${new Date(h.created_at).toLocaleDateString()}</div></li>
          `,
            )
            .join("");
        } else {
          historyList.innerHTML = `<li class="history-empty">${t("noActivity")}</li>`;
        }
      } catch (err) {
        console.error("history render error:", err);
        historyList.innerHTML = `<li class="history-empty">${t("failedLoadHistory")}</li>`;
      }
    }
  } catch (err) {
    console.error("renderProfilePage error:", err);
    showToast(t("failedLoadProfile"), "error");
  }
}

async function renderSettingsPage() {
  try {
    const userData = getCachedUserData();
    if (!userData) return;

    const body = document.getElementById("appBody");
    const theme = userData.theme || "dark";
    if (theme === "light") {
      body?.classList.remove("dark-mode");
      body?.classList.add("light-mode");
    } else {
      body?.classList.remove("light-mode");
      body?.classList.add("dark-mode");
    }

    const lang = userData.language || "ar";
    setLanguage(lang);
  } catch (err) {
    console.error("renderSettingsPage error:", err);
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function handleSwitchFriendsTab(element) {
  const tab = element.dataset.friendsTab;
  if (!tab) return;
  document
    .querySelectorAll(".friends-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".friends-section")
    .forEach((s) => s.classList.remove("active"));
  element.classList.add("active");
  const sectionId =
    tab === "leaderboard"
      ? "friendsLeaderboardSection"
      : `friends${tab.charAt(0).toUpperCase() + tab.slice(1)}Section`;
  document.getElementById(sectionId)?.classList.add("active");
}
