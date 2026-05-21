// File: js/quests.js
/**
 * quests.js — إدارة المهام اليومية + UI
 */

import { getSupabase } from "./supabase.js";
import { getCurrentUserId } from "./auth.js";
import { addXP, updateStreak } from "./user.js";
import { showToast } from "./ui.js";
import { t } from "./i18n.js";

// ===== DATA =====

export async function fetchDailyQuests() {
  const userId = getCurrentUserId();
  if (!userId) return { quests: [], error: "Not authenticated" };
  const sb = await getSupabase();
  try {
    await checkDailyReset();
    const { data, error } = await sb
      .from("quests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { quests: data || [], error: null };
  } catch (error) {
    return { quests: [], error: error.message };
  }
}

export async function addQuest({
  name,
  description,
  xp_reward,
  is_daily = true,
}) {
  const userId = getCurrentUserId();
  if (!userId) return { quest: null, error: "Not authenticated" };
  if (!name || name.trim().length < 2)
    return { quest: null, error: t("questNameRequired") };

  const sb = await getSupabase();
  try {
    const { data, error } = await sb
      .from("quests")
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || "",
        xp_reward: xp_reward || 50,
        completed: false,
        is_daily,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    await updateQuestsCount();
    return { quest: data, error: null };
  } catch (error) {
    return { quest: null, error: error.message };
  }
}

export async function completeQuest(questId) {
  const userId = getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };
  const sb = await getSupabase();

  try {
    const { data: quest, error: qErr } = await sb
      .from("quests")
      .select("*")
      .eq("id", questId)
      .eq("user_id", userId)
      .single();
    if (qErr || !quest) return { error: t("failedLoadQuests") };
    if (quest.completed) return { error: t("questCompleted") };

    await sb
      .from("quests")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", questId)
      .eq("user_id", userId);
    await addXP(quest.xp_reward, `Quest: ${quest.name}`);
    await updateStreak();
    await updateQuestsCount();
    return { error: null, xp: quest.xp_reward };
  } catch (error) {
    return { error: error.message };
  }
}

export async function deleteQuest(questId) {
  const userId = getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };
  const sb = await getSupabase();
  try {
    const { error } = await sb
      .from("quests")
      .delete()
      .eq("id", questId)
      .eq("user_id", userId);
    if (error) throw error;
    await updateQuestsCount();
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

export async function resetDailyQuests() {
  const userId = getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };
  const sb = await getSupabase();
  try {
    await sb
      .from("quests")
      .update({ completed: false, completed_at: null })
      .eq("user_id", userId)
      .eq("is_daily", true);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

async function checkDailyReset() {
  const userId = getCurrentUserId();
  if (!userId) return;
  const sb = await getSupabase();
  const { data: stats } = await sb
    .from("user_stats")
    .select("last_active")
    .eq("user_id", userId)
    .single();
  const today = new Date().toISOString().split("T")[0];
  const lastActive = stats?.last_active
    ? stats.last_active.split("T")[0]
    : null;
  if (lastActive !== today) await resetDailyQuests();
}

async function updateQuestsCount() {
  const userId = getCurrentUserId();
  if (!userId) return;
  const sb = await getSupabase();
  const { data: all } = await sb
    .from("quests")
    .select("completed")
    .eq("user_id", userId);
  const done = all?.filter((q) => q.completed).length || 0;
  const total = all?.length || 0;
  await sb
    .from("user_stats")
    .update({
      quests_done: done,
      total_quests: total,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

// ===== UI: Daily Quests Page =====

export async function renderDailyQuestsPage() {
  const container = document.getElementById("dailyQuestsContainer");
  const progressText = document.getElementById("questsProgressText");
  const progressBar = document.getElementById("questsProgressBar");
  const streakDisplay = document.getElementById("questsStreakDisplay");

  if (!container) return;

  const { quests, error } = await fetchDailyQuests();
  if (error) {
    showToast(error, "error");
    return;
  }

  const completedCount = quests.filter((q) => q.completed).length;
  const totalCount = quests.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (progressText)
    progressText.textContent = `${completedCount} / ${totalCount} ${t("questsCompleted")}`;
  if (progressBar) progressBar.style.width = `${progressPercent}%`;
  if (streakDisplay) {
    const { updateStreak } = await import("./user.js");
    const { streak } = await updateStreak();
    streakDisplay.innerHTML = `<i class="fas fa-fire"></i> ${streak} ${t("streakDays")}`;
  }

  if (!quests.length) {
    container.innerHTML = `
      <div class="quests-empty">
        <i class="fas fa-clipboard-list"></i>
        <h3>${t("questsEmptyTitle")}</h3>
        <p>${t("questsEmptyDesc")}</p>
      </div>
    `;
    return;
  }

  let html = '<div class="quests-grid">';
  quests.forEach((quest) => {
    html += renderQuestCard(quest);
  });
  html += "</div>";
  container.innerHTML = html;

  container.querySelectorAll(".quest-card:not(.completed)").forEach((card) => {
    card.addEventListener("click", async () => {
      const questId = card.dataset.questId;
      const { error: completeError, xp } = await completeQuest(questId);
      if (completeError) {
        showToast(completeError, "error");
      } else {
        showToast(t("questCompleted", { xp: xp || 0 }), "success");
        await renderDailyQuestsPage();
        window.dispatchEvent(
          new CustomEvent("questcompleted", { detail: { questId, xp } }),
        );
      }
    });
  });
}

function renderQuestCard(quest) {
  const statusClass = quest.completed ? "completed" : "pending";
  const statusText = quest.completed ? t("completed") : t("pending");
  const statusIcon = quest.completed ? "fa-check-circle" : "fa-hourglass-half";

  return `
    <div class="quest-card ${statusClass}" data-quest-id="${quest.id}">
      <div class="quest-glow"></div>
      <div class="quest-card-inner">
        <div class="quest-check-ring">
          <div class="quest-check-fill ${quest.completed ? "filled" : ""}">
            <i class="fas ${quest.completed ? "fa-check" : ""}"></i>
          </div>
        </div>
        <div class="quest-card-info">
          <h4>${escapeHtml(quest.name)}</h4>
          <p>${escapeHtml(quest.description || "")}</p>
        </div>
        <div class="quest-card-meta">
          <span class="quest-status ${statusClass}"><i class="fas ${statusIcon}"></i> ${statusText}</span>
          <span class="quest-xp-reward"><i class="fas fa-bolt"></i> +${quest.xp_reward} XP</span>
        </div>
      </div>
    </div>
  `;
}

// ===== UI: Quests List (for Profile) =====

export function renderQuestsList(containerId, quests) {
  const list = document.getElementById(containerId);
  if (!list) return;

  if (!quests || !quests.length) {
    list.innerHTML = `<div class="quest-list-empty">${t("noQuests")}</div>`;
    return;
  }

  list.innerHTML = quests
    .map(
      (quest) => `
    <div class="quest-list-item ${quest.completed ? "completed" : ""}" data-quest-id="${quest.id}">
      <span class="quest-check-sm ${quest.completed ? "checked" : ""}"><i class="fas ${quest.completed ? "fa-check" : "fa-circle"}"></i></span>
      <div class="quest-info"><strong>${escapeHtml(quest.name)}</strong><small>${escapeHtml(quest.description || "")}</small></div>
      <div class="item-actions">
        <button class="btn btn-sm btn-danger btn-delete-quest" data-quest-id="${quest.id}" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `,
    )
    .join("");

  // Bind delete events
  list.querySelectorAll(".btn-delete-quest").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(t("deleteConfirm") || "Delete this quest?")) return;
      const { error } = await deleteQuest(btn.dataset.questId);
      if (error) {
        showToast(error, "error");
      } else {
        showToast(t("questDeleted") || "Quest deleted", "success");
        // Refresh lists
        const { quests: freshQuests } = await fetchDailyQuests();
        renderQuestsList(containerId, freshQuests);
        await renderDailyQuestsPage();
      }
    });
  });
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
