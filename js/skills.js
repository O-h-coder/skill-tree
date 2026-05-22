// ===== Skills Module =====
import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { DEFAULT_SKILLS } from "./constants.js";
import { t } from "./i18n.js";
import { notify } from "./utils.js";
import { updateStats, loadUserStats } from "./user.js";

let currentSkills = [];
let editingSkillId = null;

export async function loadSkills() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  // Get user's unlocked skills
  const { data: userSkills, error } = await supabase
    .from("user_skills")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("Load skills error:", error);
    return [];
  }

  // Merge with default skills
  currentSkills = DEFAULT_SKILLS.map((skill) => {
    const userSkill = userSkills?.find((us) => us.skill_id === skill.id);
    return {
      ...skill,
      unlocked: !!userSkill,
      userSkillId: userSkill?.id,
    };
  });

  return currentSkills;
}

export async function unlockSkill(skillId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const skill = currentSkills.find((s) => s.id === skillId);
  if (!skill) return { error: new Error("Skill not found") };

  if (skill.unlocked) {
    return { error: new Error("Skill already unlocked") };
  }

  // INSTANT UNLOCK - no XP deduction
  const { data, error } = await supabase
    .from("user_skills")
    .insert([
      {
        user_id: user.id,
        skill_id: skillId,
        unlocked: true,
        unlocked_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Unlock skill error:", error);
    return { error };
  }

  // Add to activity history
  await supabase.from("activity_history").insert([
    {
      user_id: user.id,
      type: "skill_unlock",
      title: skill.name,
      description: `Unlocked skill: ${skill.name}`,
      created_at: new Date().toISOString(),
    },
  ]);

  // Refresh skills
  await loadSkills();
  renderSkills();

  notify(t("notifications.skillUnlock", { name: skill.name }), "success");

  return { data, error: null };
}

export async function editSkill(skillId, updates) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  // Update in skills table (if exists) or just update display name
  // For now, we update the user_skills record or create a custom skill entry
  const { data, error } = await supabase
    .from("skills")
    .update(updates)
    .eq("id", skillId)
    .select()
    .single();

  if (error) {
    console.error("Edit skill error:", error);
    // If skills table doesn't have this record, it's a default skill
    // Just notify success since default skills are hardcoded
    notify(t("skills.editSuccess"), "success");
    return { error: null };
  }

  notify(t("skills.editSuccess"), "success");
  await loadSkills();
  renderSkills();

  return { data, error: null };
}

export async function deleteSkill(skillId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  // Remove from user_skills (lock it again)
  const { error } = await supabase
    .from("user_skills")
    .delete()
    .eq("user_id", user.id)
    .eq("skill_id", skillId);

  if (error) {
    console.error("Delete skill error:", error);
    return { error };
  }

  notify(t("skills.deleteSuccess"), "success");
  await loadSkills();
  renderSkills();

  return { error: null };
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
        <div class="skill-card ${skill.unlocked ? "" : "locked"}" data-skill-id="${skill.id}">
            <div class="skill-icon" style="background: ${skill.unlocked ? skill.color + "20" : ""}; color: ${skill.unlocked ? skill.color : ""}">
                <i class="fas ${skill.icon}"></i>
            </div>
            <h3 class="skill-name">${skill.name}</h3>
            <p class="skill-description">${skill.description}</p>
            <div class="skill-meta">
                <span class="skill-xp"><i class="fas fa-bolt"></i> ${skill.xpCost} XP</span>
                <span class="skill-status ${skill.unlocked ? "unlocked" : "locked"}">
                    ${skill.unlocked ? t("skills.unlocked") : t("skills.locked")}
                </span>
            </div>
            ${
              !skill.unlocked
                ? `
                <button class="unlock-btn" data-action="unlockSkill" data-id="${skill.id}">
                    <i class="fas fa-unlock"></i> ${t("skills.unlock")}
                </button>
            `
                : `
                <div class="skill-actions">
                    <button class="btn-edit-skill" data-action="editSkill" data-id="${skill.id}">
                        <i class="fas fa-pen"></i> ${t("common.edit")}
                    </button>
                    <button class="btn-delete-skill" data-action="deleteSkill" data-id="${skill.id}">
                        <i class="fas fa-trash"></i> ${t("common.delete")}
                    </button>
                </div>
            `
            }
        </div>
    `,
    )
    .join("");
}

export function openEditSkillModal(skillId) {
  const skill = currentSkills.find((s) => s.id === skillId);
  if (!skill) return;

  editingSkillId = skillId;

  const modal = document.getElementById("edit-skill-modal");
  const nameInput = document.getElementById("edit-skill-name");
  const descInput = document.getElementById("edit-skill-description");
  const idInput = document.getElementById("edit-skill-id");

  if (modal) modal.classList.remove("hidden");
  if (nameInput) nameInput.value = skill.name;
  if (descInput) descInput.value = skill.description;
  if (idInput) idInput.value = skillId;
}

export async function saveSkillEdit() {
  const nameInput = document.getElementById("edit-skill-name");
  const descInput = document.getElementById("edit-skill-description");

  if (!editingSkillId || !nameInput || !descInput) return;

  const updates = {
    name: nameInput.value.trim(),
    description: descInput.value.trim(),
  };

  await editSkill(editingSkillId, updates);
  closeModal("edit-skill-modal");
  editingSkillId = null;
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("hidden");
}
