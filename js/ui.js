// File: js/ui.js
/**
 * ui.js — واجهة المستخدم والتنقل
 */

import {
  getCachedUserData,
  getUserXP,
  getUserLevel,
  getUserStreak,
  getUserTitle,
} from "./user.js";
import { t, setLanguage as i18nSetLanguage } from "./i18n.js";

// ===== BROWSER NOTIFICATIONS =====
let notificationPermission = false;

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") {
    notificationPermission = true;
    return true;
  }
  const permission = await Notification.requestPermission();
  notificationPermission = permission === "granted";
  return notificationPermission;
}

export function sendBrowserNotification(title, body, icon = "/favicon.ico") {
  if (!notificationPermission || Notification.permission !== "granted") return;

  try {
    new Notification(title, {
      body,
      icon,
      badge: icon,
      tag: "skill-tree-" + Date.now(),
      requireInteraction: false,
    });
  } catch (e) {
    console.error("Notification error:", e);
  }
}

export function notify(action, details = "") {
  // Always show toast
  const messages = {
    skillUnlocked: { msg: "Skill unlocked!", type: "success" },
    questCompleted: { msg: "Quest completed!", type: "success" },
    friendRequestSent: { msg: "Friend request sent", type: "info" },
    friendRequestAccepted: { msg: "Friend request accepted", type: "success" },
    avatarUpdated: { msg: "Avatar updated", type: "success" },
    settingsSaved: { msg: "Settings saved", type: "success" },
    levelUp: { msg: "Level up!", type: "success" },
  };

  const notification = messages[action] || { msg: action, type: "info" };
  showToast(
    notification.msg + (details ? " " + details : ""),
    notification.type,
  );

  // Send browser notification too
  sendBrowserNotification("Skill Tree", notification.msg);
}

export function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon =
    type === "success"
      ? "fa-check-circle"
      : type === "error"
        ? "fa-exclamation-circle"
        : "fa-info-circle";
  toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function showModal(title, text, icon = "fa-unlock") {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalIcon = modal?.querySelector(".modal-icon i");
  if (modalTitle) modalTitle.textContent = title;
  if (modalText) modalText.textContent = text;
  if (modalIcon) modalIcon.className = `fas ${icon}`;
  if (modal) modal.classList.add("active");
}

export function closeModal() {
  document.getElementById("modal")?.classList.remove("active");
}

export function updateXPBar() {
  const xp = getUserXP();
  const level = getUserLevel();
  const percent = xp.max > 0 ? Math.round((xp.current / xp.max) * 100) : 0;

  const fill = document.getElementById("xpProgress");
  const text = document.getElementById("xpText");
  const badge = document.getElementById("userLevelName");
  const streak = document.getElementById("streakDisplay");

  if (fill) fill.style.width = `${percent}%`;
  if (text) text.textContent = `${xp.current} / ${xp.max} XP`;
  if (badge) badge.textContent = `${getUserTitle()} (LVL ${level})`;
  if (streak) {
    const count = getUserStreak();
    streak.innerHTML = `<i class="fas fa-fire"></i> ${count} ${t("days")}`;
  }
}

export function updateUserStatusSummary() {
  updateXPBar();
}

let currentPage = "skillTree";

export function navigateTo(page) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-link")
    .forEach((n) => n.classList.remove("active"));

  const targetPage = document.getElementById(`${page}Page`);
  if (targetPage) targetPage.classList.add("active");

  const targetNav = document.querySelector(`[data-page="${page}"]`);
  if (targetNav) targetNav.classList.add("active");

  currentPage = page;
  window.dispatchEvent(new CustomEvent("pagechange", { detail: { page } }));
}

export function toggleMobileMenu() {
  document.getElementById("navLinks")?.classList.toggle("mobile-open");
}

export function toggleDarkMode() {
  const body = document.getElementById("appBody");
  const isDark = body?.classList.contains("dark-mode");
  if (isDark) {
    body?.classList.remove("dark-mode");
    body?.classList.add("light-mode");
  } else {
    body?.classList.remove("light-mode");
    body?.classList.add("dark-mode");
  }
  updateThemeIcon();
}

export function updateThemeIcon() {
  const body = document.getElementById("appBody");
  const icon = document.getElementById("themeIcon");
  const label = document.getElementById("themeLabel");
  const isDark = body?.classList.contains("dark-mode");
  if (icon) icon.className = isDark ? "fas fa-sun" : "fas fa-moon";
  if (label) label.textContent = isDark ? t("lightMode") : t("darkMode");
}

export function setLanguage(lang) {
  i18nSetLanguage(lang);
  const arBtn = document.getElementById("langArBtn");
  const enBtn = document.getElementById("langEnBtn");
  if (arBtn) arBtn.classList.toggle("active", lang === "ar");
  if (enBtn) enBtn.classList.toggle("active", lang === "en");
  updateThemeIcon();
  updateXPBar();
}

export function toggleThemeDropdown() {
  document.getElementById("themeDropdownMenu")?.classList.toggle("hidden");
}

export function populateThemeDropdown(themes, currentTheme, onSelect) {
  const menu = document.getElementById("themeDropdownMenu");
  const currentName = document.getElementById("currentThemeName");
  if (!menu) return;
  if (currentName)
    currentName.textContent = themes[currentTheme]?.name || currentTheme;

  menu.innerHTML = Object.entries(themes)
    .map(
      ([key, theme]) => `
    <div class="theme-option ${key === currentTheme ? "active" : ""}" data-theme="${key}">
      <span class="theme-color-preview" style="background: ${theme.primary}"></span>
      <span>${theme.name}</span>
    </div>
  `,
    )
    .join("");

  menu.querySelectorAll(".theme-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      const themeKey = opt.dataset.theme;
      onSelect(themeKey);
      populateThemeDropdown(themes, themeKey, onSelect);
      toggleThemeDropdown();
    });
  });
}

export function setupGlobalEventListeners() {
  // Unified click handler for actions and pages
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action], [data-page]");
    if (!target) return;

    const action = target.dataset.action;
    const page = target.dataset.page;

    if (target.tagName === "A" || target.tagName === "BUTTON") {
      e.preventDefault();
    }

    if (page) {
      navigateTo(page);
      return;
    }

    if (action) {
      const mode = target.dataset.mode;
      const lang = target.dataset.lang;

      window.dispatchEvent(
        new CustomEvent("appaction", {
          detail: { action, mode, lang, element: target, originalEvent: e },
          bubbles: true,
        }),
      );
    }
  });

  // Listen for change events on file inputs (avatar upload)
  document.addEventListener("change", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "handleAvatarChange") {
      window.dispatchEvent(
        new CustomEvent("appaction", {
          detail: { action, element: target, originalEvent: e },
          bubbles: true,
        }),
      );
    }
  });

  // Close theme dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".theme-dropdown-wrapper")) {
      document.getElementById("themeDropdownMenu")?.classList.add("hidden");
    }
  });
}
