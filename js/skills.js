// File js/skills.js
/**
 * skills.js — إدارة المهارات + UI شجرة المهارات
 */

import { getSupabase } from "./supabase.js";
import { getCurrentUserId } from "./auth.js";
import {
  addXP,
  getCachedUserData,
  fetchUserData,
  getUserLevel,
  getUserTitle,
} from "./user.js";
import { showToast, showModal } from "./ui.js";
import { t } from "./i18n.js";

// ===== DATA =====

export async function fetchUserSkills() {
  const userId = getCurrentUserId();
  if (!userId) return { skills: [], error: "Not authenticated" };
  const sb = await getSupabase();
  try {
    const { data, error } = await sb
      .from("skills")
      .select("*")
      .eq("user_id", userId)
      .order("xp_required", { ascending: true });
    if (error) throw error;
    return { skills: data || [], error: null };
  } catch (error) {
    return { skills: [], error: error.message };
  }
}

export async function addSkill({ name, description, icon, xp_required }) {
  const userId = getCurrentUserId();
  if (!userId) return { skill: null, error: "Not authenticated" };
  if (!name || name.trim().length < 2)
    return { skill: null, error: t("skillNameRequired") };

  const sb = await getSupabase();
  try {
    const { data, error } = await sb
      .from("skills")
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || "",
        icon: icon || "fa-star",
        xp_required: xp_required || 100,
        unlocked: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    await updateSkillsCount();
    return { skill: data, error: null };
  } catch (error) {
    return { skill: null, error: error.message };
  }
}

export async function unlockSkill(skillId) {
  const userId = getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };
  const sb = await getSupabase();

  try {
    const { data: skill, error: sErr } = await sb
      .from("skills")
      .select("*")
      .eq("id", skillId)
      .eq("user_id", userId)
      .single();
    if (sErr || !skill) return { error: t("failedLoadSkills") };
    if (skill.unlocked) return { error: t("skillUnlocked") };

    const userData = getCachedUserData() || (await fetchUserData()).data;
    if (!userData) return { error: t("failedLoad") };
    if (userData.exp < skill.xp_required)
      return { error: t("needXP", { xp: skill.xp_required }) };

    const { error: xpErr } = await addXP(
      -skill.xp_required,
      `Unlock: ${skill.name}`,
    );
    if (xpErr) return { error: xpErr };

    const { data, error } = await sb
      .from("skills")
      .update({ unlocked: true, unlocked_at: new Date().toISOString() })
      .eq("id", skillId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;

    await updateSkillsCount();
    return { skill: data, error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function deleteSkill(skillId) {
  const userId = getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };
  const sb = await getSupabase();
  try {
    const { error } = await sb
      .from("skills")
      .delete()
      .eq("id", skillId)
      .eq("user_id", userId);
    if (error) throw error;
    await updateSkillsCount();
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

async function updateSkillsCount() {
  const userId = getCurrentUserId();
  if (!userId) return;
  const sb = await getSupabase();
  const { data: all } = await sb
    .from("skills")
    .select("unlocked")
    .eq("user_id", userId);
  const unlocked = all?.filter((s) => s.unlocked).length || 0;
  const total = all?.length || 0;
  await sb
    .from("user_stats")
    .update({
      skills_unlocked: unlocked,
      total_skills: total,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

// ===== UI: Skill Tree Page =====

export async function renderSkillTreePage() {
  const container = document.getElementById("skillTreeContainer");
  const progressText = document.getElementById("treeProgressText");
  const progressBar = document.getElementById("treeProgressBar");
  const rankBadge = document.getElementById("currentRankBadge");

  if (!container) return;

  const { skills, error } = await fetchUserSkills();
  if (error) {
    showToast(error, "error");
    return;
  }

  const userLevel = getUserLevel();
  const unlockedCount = skills.filter((s) => s.unlocked).length;
  const totalCount = skills.length;
  const progressPercent =
    totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (progressText)
    progressText.textContent = `${unlockedCount} / ${totalCount} ${t("skillsUnlocked")}`;
  if (progressBar) progressBar.style.width = `${progressPercent}%`;
  if (rankBadge) rankBadge.textContent = getUserTitle();

  if (!skills.length) {
    container.innerHTML = `
      <div class="skill-tree-empty">
        <i class="fas fa-seedling"></i>
        <h3>${t("skillsEmptyTitle")}</h3>
        <p>${t("skillsEmptyDesc")}</p>
      </div>
    `;
    return;
  }

  const unlocked = skills.filter((s) => s.unlocked);
  const available = skills.filter(
    (s) =>
      !s.unlocked && userLevel >= Math.max(1, Math.floor(s.xp_required / 50)),
  );
  const locked = skills.filter(
    (s) =>
      !s.unlocked && userLevel < Math.max(1, Math.floor(s.xp_required / 50)),
  );

  let html = '<div class="skill-nodes-grid">';

  unlocked.forEach((skill) => {
    html += renderSkillNode(skill, "unlocked");
  });

  available.forEach((skill) => {
    html += renderSkillNode(skill, "available");
  });

  locked.forEach((skill) => {
    html += renderSkillNode(skill, "locked");
  });

  html += "</div>";
  container.innerHTML = html;

  container.querySelectorAll(".skill-node.available").forEach((node) => {
    node.addEventListener("click", async () => {
      const skillId = node.dataset.skillId;
      const { error: unlockError, skill } = await unlockSkill(skillId);
      if (unlockError) {
        showToast(unlockError, "error");
      } else {
        showToast(`${t("skillUnlocked")} ${skill.name}`, "success");
        showModal(
          t("skillUnlocked"),
          `${t("newSkillUnlocked")}: ${skill.name}`,
          "fa-unlock",
        );
        await renderSkillTreePage();
        window.dispatchEvent(
          new CustomEvent("skillunlocked", { detail: { skill } }),
        );
      }
    });
  });
}

function renderSkillNode(skill, status) {
  const icon = skill.icon || "fa-star";
  const statusText =
    status === "unlocked"
      ? t("unlocked")
      : status === "available"
        ? t("available")
        : t("locked");
  const statusIcon =
    status === "unlocked"
      ? "fa-check-circle"
      : status === "available"
        ? "fa-lock-open"
        : "fa-lock";

  return `
    <div class="skill-node ${status}" data-skill-id="${skill.id}">
      <div class="node-glow"></div>
      <div class="skill-node-inner">
        <div class="node-icon"><i class="fas ${icon}"></i></div>
        <div class="node-info">
          <h4>${escapeHtml(skill.name)}</h4>
          <p>${escapeHtml(skill.description || "")}</p>
        </div>
        <div class="node-meta">
          <span class="node-status ${status}"><i class="fas ${statusIcon}"></i> ${statusText}</span>
          <span class="node-xp"><i class="fas fa-bolt"></i> ${skill.xp_required} XP</span>
        </div>
      </div>
    </div>
  `;
}

// ===== UI: Skills List (for Profile) =====

export function renderSkillsList(containerId, skills) {
  const list = document.getElementById(containerId);
  if (!list) return;

  if (!skills || !skills.length) {
    list.innerHTML = `<div class="skill-list-empty">${t("noSkills")}</div>`;
    return;
  }

  list.innerHTML = skills
    .map(
      (skill) => `
    <div class="skill-list-item ${skill.unlocked ? "unlocked" : ""}">
      <span class="skill-icon-sm"><i class="fas ${skill.icon || "fa-star"}"></i></span>
      <div class="skill-info"><strong>${escapeHtml(skill.name)}</strong><small>${escapeHtml(skill.description || "")}</small></div>
      <span class="skill-xp">${skill.xp_required} XP</span>
    </div>
  `,
    )
    .join("");
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
