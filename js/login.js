// ===== Login Page =====
import { initSupabase, getSupabase } from "./supabase.js";
import { signUp, signIn } from "./auth.js";
import { t, setLanguage } from "./i18n.js";

let isLoginMode = true;

function notify(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showLoading(show) {
  const loading = document.getElementById("loading");
  if (loading) loading.classList.toggle("hidden", !show);
}

function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const switchText = document.getElementById("switch-text");
  const switchBtn = document.getElementById("switch-btn");

  if (loginForm) loginForm.classList.toggle("hidden", !isLoginMode);
  if (registerForm) registerForm.classList.toggle("hidden", isLoginMode);

  if (switchText && switchBtn) {
    if (isLoginMode) {
      switchText.innerHTML = `<span>${t("login.noAccount")}</span> <button id="switch-btn" class="text-btn" data-action="switchAuth">${t("login.registerLink")}</button>`;
    } else {
      switchText.innerHTML = `<span>${t("login.haveAccount")}</span> <button id="switch-btn" class="text-btn" data-action="switchAuth">${t("login.loginLink")}</button>`;
    }
    document
      .getElementById("switch-btn")
      .addEventListener("click", toggleAuthMode);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    notify(t("login.fillAllFields"), "error");
    return;
  }

  showLoading(true);
  const { data, error } = await signIn(email, password);
  showLoading(false);

  if (error) {
    notify(error.message, "error");
    return;
  }

  if (data?.session) {
    notify(t("login.success"), "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  if (!username || !email || !password) {
    notify(t("login.fillAllFields"), "error");
    return;
  }

  if (password.length < 6) {
    notify(t("login.passwordTooShort"), "error");
    return;
  }

  showLoading(true);
  const { data, error } = await signUp(email, password, username);
  showLoading(false);

  if (error) {
    notify(error.message, "error");
    return;
  }

  notify(t("login.registerSuccess"), "success");
  setTimeout(() => {
    toggleAuthMode();
  }, 1500);
}

function togglePasswordVisibility(e) {
  const btn = e.currentTarget;
  const input =
    btn.previousElementSibling || btn.parentElement.querySelector("input");
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    input.type = "password";
    btn.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

async function init() {
  // Load Supabase library
  if (!window.supabase) {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    script.onload = () => {
      initSupabase();
      checkSession();
    };
    document.head.appendChild(script);
  } else {
    initSupabase();
    checkSession();
  }
}

async function checkSession() {
  const supabase = getSupabase();
  if (!supabase) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    window.location.href = "index.html";
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  init();

  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (registerForm) registerForm.addEventListener("submit", handleRegister);

  document.querySelectorAll('[data-action="togglePassword"]').forEach((btn) => {
    btn.addEventListener("click", togglePasswordVisibility);
  });

  const switchBtn = document.getElementById("switch-btn");
  if (switchBtn) switchBtn.addEventListener("click", toggleAuthMode);
});
