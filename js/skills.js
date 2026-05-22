// ===== Skills Module (View Only) =====
import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { t } from "./i18n.js";
import { logActivity } from "./user.js";

let currentSkills = [];

export async function loadSkills() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load skills error:", error);
    return [];
  }

  currentSkills = data || [];
  return currentSkills;
}

export async function viewSkill(skillId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return;

  const skill = currentSkills.find((s) => s.id === skillId);
  if (!skill) return;

  // Log view activity
  await logActivity(
    "view",
    "skill",
    skillId,
    skill.name,
    `Viewed skill: ${skill.name}`,
  );

  // Show detail modal
  const modal = document.getElementById("skill-detail-modal");
  const nameEl = document.getElementById("detail-skill-name");
  const descEl = document.getElementById("detail-skill-description");
  const iconEl = document.getElementById("detail-skill-icon");

  if (modal) modal.classList.remove("hidden");
  if (nameEl) nameEl.textContent = skill.name;
  if (descEl)
    descEl.textContent = skill.description || t("skills.noDescription");
  if (iconEl) {
    iconEl.innerHTML = `<i class="fas ${skill.icon || "fa-star"}"></i>`;
    iconEl.style.background = `${skill.color || "#6366f1"}20`;
    iconEl.style.color = skill.color || "#6366f1";
  }
}

export function renderSkills() {
  const grid = document.getElementById("skills-grid");
  if (!grid) return;

  if (currentSkills.length === 0) {
    grid.innerHTML = `<div class="empty-state">${t("skills.noSkills")}</div>`;
    return;
  }

  grid.innerHTML = currentSkills
    .map(
      (skill) => `
    <div class="skill-card" data-skill-id="${skill.id}" data-action="viewSkill" data-id="${skill.id}">
      <div class="skill-icon" style="background: ${skill.color || "#6366f1"}20; color: ${skill.color || "#6366f1"}">
        <i class="fas ${skill.icon || "fa-star"}"></i>
      </div>
      <h3 class="skill-name">${skill.name}</h3>
      <p class="skill-description">${skill.description || ""}</p>
      <div class="skill-meta">
        <span class="skill-status unlocked" data-i18n="skills.unlocked">${t("skills.unlocked")}</span>
      </div>
    </div>
  `,
    )
    .join("");
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("hidden");
}
