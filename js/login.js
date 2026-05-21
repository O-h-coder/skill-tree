// File js/login.js
/**
 * login.js — شاشة تسجيل الدخول (منفصلة)
 */

import { signUp, signIn, resetPassword, getCurrentUser } from "./auth.js";
import { getSupabase } from "./supabase.js";
import { t } from "./i18n.js";

let isRegisterMode = false;

// ========== DOM Elements ==========
const els = {
  emailForm: () => document.getElementById("emailForm"),
  forgotForm: () => document.getElementById("forgotForm"),
  usernamePanel: () => document.getElementById("usernameSetupPanel"),
  authEmail: () => document.getElementById("authEmail"),
  authPassword: () => document.getElementById("authEmailPassword"),
  emailHint: () => document.getElementById("emailHint"),
  passwordHint: () => document.getElementById("emailPasswordHint"),
  btnText: () => document.getElementById("emailAuthBtnText"),
  toggleLink: () => document.getElementById("toggleAuthMode"),
  showForgot: () => document.getElementById("showForgot"),
  backToLogin: () => document.getElementById("backToLogin"),
  recoverEmail: () => document.getElementById("recoverEmail"),
  setupUsername: () => document.getElementById("setupUsername"),
  usernameHint: () => document.getElementById("setupUsernameHint"),
  btnContinue: () => document.getElementById("btnContinue"),
  authError: () => document.getElementById("auth-error"),
  authSuccess: () => document.getElementById("auth-success"),
  loading: () => document.getElementById("loading-overlay"),
  particles: () => document.getElementById("particles"),
};

// ========== Init ==========
document.addEventListener("DOMContentLoaded", async () => {
  const loadingScreen = document.getElementById("loginLoadingScreen");
  if (loadingScreen) loadingScreen.classList.add("active");

  try {
    const { user } = await getCurrentUser();
    if (user) {
      const sb = await getSupabase();
      const { data: profile } = await sb
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      if (profile?.username) {
        window.location.replace("index.html");
        return;
      }
      if (loadingScreen) loadingScreen.classList.remove("active");
      showUsernameSetup();
    } else {
      if (loadingScreen) loadingScreen.classList.remove("active");
    }
  } catch (err) {
    console.error("Login init error:", err);
    if (loadingScreen) loadingScreen.classList.remove("active");
  }

  createParticles();
  bindEvents();
});

function bindEvents() {
  // Form submissions
  els.emailForm()?.addEventListener("submit", handleEmailAuth);
  els.forgotForm()?.addEventListener("submit", handleRecover);

  // Links
  els.toggleLink()?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleAuthMode();
  });
  els.showForgot()?.addEventListener("click", (e) => {
    e.preventDefault();
    showForgotPassword();
  });
  els.backToLogin()?.addEventListener("click", (e) => {
    e.preventDefault();
    showLoginForm();
  });

  // Username setup
  els.btnContinue()?.addEventListener("click", handleUsernameSetup);
  els.setupUsername()?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUsernameSetup();
  });
}

// ========== Handlers ==========
async function handleEmailAuth(e) {
  e.preventDefault();
  clearMessages();

  const email = els.authEmail()?.value.trim();
  const password = els.authPassword()?.value;

  if (!email || !password) {
    showError(t("enterEmailPassword"));
    return;
  }
  if (password.length < 6) {
    showError(t("passwordShort"));
    return;
  }

  showLoading(true);

  if (isRegisterMode) {
    const { user, error } = await signUp(email, password, email.split("@")[0]);
    showLoading(false);
    if (error) {
      showError(error);
      return;
    }
    showSuccess(t("registerSuccess"));
    setTimeout(() => {
      toggleAuthMode();
      clearMessages();
    }, 2500);
  } else {
    const { user, error } = await signIn(email, password);
    showLoading(false);
    if (error) {
      showError(error);
      return;
    }
    if (user) {
      // Check if username is set
      const sb = await getSupabase();
      const { data: profile } = await sb
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (!profile?.username) {
        showUsernameSetup();
      } else {
        showSuccess(t("loginSuccess"));
        setTimeout(() => (window.location.href = "index.html"), 600);
      }
    }
  }
}

async function handleRecover(e) {
  e.preventDefault();
  clearMessages();
  const email = els.recoverEmail()?.value.trim();
  if (!email) {
    showError(t("enterEmail"));
    return;
  }

  showLoading(true);
  const { error } = await resetPassword(email);
  showLoading(false);
  if (error) {
    showError(error);
    return;
  }

  showSuccess(t("recoverSent"));
  setTimeout(() => showLoginForm(), 3000);
}

async function handleUsernameSetup() {
  const username = els.setupUsername()?.value.trim();
  const hint = els.usernameHint();

  if (!username || username.length < 3) {
    if (hint) {
      hint.textContent = t("usernameShort");
      hint.className = "input-hint error";
    }
    return;
  }

  showLoading(true);
  const sb = await getSupabase();
  const { data: userData } = await sb.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    showLoading(false);
    showError(t("errorAuth"));
    return;
  }

  const { data: existing } = await sb
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (existing && existing.id !== userId) {
    showLoading(false);
    if (hint) {
      hint.textContent = t("usernameTaken");
      hint.className = "input-hint error";
    }
    return;
  }

  const { error } = await sb
    .from("profiles")
    .update({
      username,
      display_name: username,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  showLoading(false);
  if (error) {
    showError(error.message);
    return;
  }

  showSuccess(t("saved"));
  setTimeout(() => (window.location.href = "index.html"), 800);
}

// ========== UI Toggles ==========
function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  const btnText = els.btnText();
  const toggle = els.toggleLink();

  if (isRegisterMode) {
    if (btnText) btnText.textContent = t("register");
    if (toggle) toggle.textContent = t("haveAccount");
  } else {
    if (btnText) btnText.textContent = t("login");
    if (toggle) toggle.textContent = t("noAccount");
  }
  clearMessages();
}

function showForgotPassword() {
  els.emailForm()?.classList.add("hidden");
  els.forgotForm()?.classList.remove("hidden");
  els.usernamePanel()?.classList.add("hidden");
  clearMessages();
}

function showLoginForm() {
  els.emailForm()?.classList.remove("hidden");
  els.forgotForm()?.classList.add("hidden");
  els.usernamePanel()?.classList.add("hidden");
  clearMessages();
}

function showUsernameSetup() {
  els.emailForm()?.classList.add("hidden");
  els.forgotForm()?.classList.add("hidden");
  els.usernamePanel()?.classList.remove("hidden");
  clearMessages();
}

// ========== Helpers ==========
function showLoading(show) {
  els.loading()?.classList.toggle("hidden", !show);
  document
    .querySelectorAll(".login-container .btn")
    .forEach((btn) => (btn.disabled = show));
}

function showError(msg) {
  const el = els.authError();
  if (el) {
    el.textContent = msg;
    el.classList.remove("hidden");
  }
}

function showSuccess(msg) {
  const el = els.authSuccess();
  if (el) {
    el.textContent = msg;
    el.classList.remove("hidden");
  }
}

function clearMessages() {
  els.authError()?.classList.add("hidden");
  els.authSuccess()?.classList.add("hidden");
  const hint = els.usernameHint();
  if (hint) {
    hint.textContent = "";
    hint.className = "input-hint";
  }
}

function createParticles() {
  const container = els.particles();
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = `${Math.random() * 100}%`;
    p.style.animationDuration = `${3 + Math.random() * 7}s`;
    p.style.animationDelay = `${Math.random() * 5}s`;
    p.style.width = `${2 + Math.random() * 4}px`;
    p.style.height = p.style.width;
    container.appendChild(p);
  }
}
