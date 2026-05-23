// ===== Skills Module (Lock → Complete → XP) =====
import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { t } from "./i18n.js";
import { logActivity } from "./user.js";
import { notify } from "./utils.js";
import { addXp } from "./app.js";

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

  await logActivity(
    "view",
    "skill",
    skillId,
    skill.name,
    `Viewed skill: ${skill.name}`,
  );

  const modal = document.getElementById("skill-detail-modal");
  const nameEl = document.getElementById("detail-skill-name");
  const descEl = document.getElementById("detail-skill-description");
  const iconEl = document.getElementById("detail-skill-icon");
  const actionsEl = document.getElementById("detail-skill-actions");

  if (modal) modal.classList.remove("hidden");
  if (nameEl) nameEl.textContent = skill.name;
  if (descEl)
    descEl.textContent = skill.description || t("skills.noDescription");
  if (iconEl) {
    iconEl.innerHTML = `<i class="fas ${skill.icon || "fa-star"}"></i>`;
    iconEl.style.background = `${skill.color || "#6366f1"}20`;
    iconEl.style.color = skill.color || "#6366f1";
  }

  // Show complete button only if not completed
  if (actionsEl) {
    if (skill.completed) {
      actionsEl.innerHTML = `
        <span class="badge-completed"><i class="fas fa-check-circle"></i> ${t("skills.completed")}</span>
      `;
    } else {
      actionsEl.innerHTML = `
        <button class="btn btn-primary" data-action="completeSkill" data-id="${skill.id}">
          <i class="fas fa-check"></i> ${t("skills.complete")}
        </button>
      `;
    }
  }
}

export async function completeSkill(skillId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const skill = currentSkills.find((s) => s.id === skillId);
  if (!skill) return { error: new Error("Skill not found") };
  if (skill.completed) return { error: new Error("Already completed") };

  const xpReward = parseInt(skill.xp_reward) || 25;

  const { error } = await supabase
    .from("skills")
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", skillId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Complete skill error:", error);
    notify(error.message, "error");
    return { error };
  }

  // Award XP
  await addXp(xpReward);

  // Log activity
  await logActivity(
    "complete",
    "skill",
    skillId,
    skill.name,
    `Completed skill: ${skill.name} (+${xpReward} XP)`,
  );

  notify(
    `+${xpReward} XP — ${t("skills.completed")}: ${skill.name}`,
    "success",
  );

  // Refresh
  await loadSkills();
  renderSkills();

  // Close modal if open
  const modal = document.getElementById("skill-detail-modal");
  if (modal) modal.classList.add("hidden");

  return { success: true };
}

export function renderSkills() {
  const grid = document.getElementById("skills-grid");
  if (!grid) return;

  if (currentSkills.length === 0) {
    grid.innerHTML = `<div class="empty-state" data-i18n="skills.noSkills">${t("skills.noSkills")}</div>`;
    return;
  }

  grid.innerHTML = currentSkills
    .map((skill) => {
      const isCompleted = skill.completed === true;
      const statusClass = isCompleted ? "completed" : "locked";
      const statusText = isCompleted
        ? t("skills.completed")
        : t("skills.locked");
      const cardClass = isCompleted ? "completed" : "locked";
      const xpText = `${skill.xp_reward || 25} XP`;

      return `
    <div class="skill-card ${cardClass}" data-skill-id="${skill.id}" data-action="viewSkill" data-id="${skill.id}">
      <div class="skill-icon" style="background: ${skill.color || "#6366f1"}20; color: ${skill.color || "#6366f1"}">
        <i class="fas ${skill.icon || "fa-star"}"></i>
      </div>
      <h3 class="skill-name">${skill.name}</h3>
      <p class="skill-description">${skill.description || ""}</p>
      <div class="skill-meta">
        <span class="skill-xp"><i class="fas fa-bolt"></i> ${xpText}</span>
        <span class="skill-status ${statusClass}" data-i18n="skills.${isCompleted ? "completed" : "locked"}">${statusText}</span>
      </div>
      ${isCompleted ? '<div class="skill-completed-overlay"><i class="fas fa-check"></i></div>' : ""}
    </div>
  `;
    })
    .join("");
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("hidden");
}
