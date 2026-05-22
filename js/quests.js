// ===== Quests Module (View + Complete Only) =====
import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { t } from "./i18n.js";
import { notify } from "./utils.js";
import { updateStats, loadUserStats, logActivity } from "./user.js";

let currentQuests = [];

export async function loadQuests() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  const { data, error } = await supabase
    .from("quests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load quests error:", error);
    return [];
  }

  currentQuests = data || [];
  return currentQuests;
}

export async function completeQuest(questId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const quest = currentQuests.find((q) => q.id === questId);
  if (!quest) return { error: new Error("Quest not found") };
  if (quest.completed) return { error: new Error("Quest already completed") };

  // Mark as completed
  const { data: updatedQuest, error: updateError } = await supabase
    .from("quests")
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", questId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) {
    console.error("Complete quest error:", updateError);
    return { error: updateError };
  }

  // Log activity (XP is handled by app.js addXp engine)
  await logActivity(
    "complete",
    "quest",
    questId,
    quest.title,
    `Completed quest: ${quest.title} (+${quest.xp_reward || 10} XP)`,
  );

  notify(t("notifications.questComplete", { title: quest.title }), "success");

  await loadQuests();
  renderQuests();

  return { data: updatedQuest, error: null };
}

export function renderQuests() {
  const list = document.getElementById("quests-list");
  const completedSection = document.getElementById("completed-quests");
  const completedList = document.getElementById("completed-list");

  if (!list) return;

  const activeQuests = currentQuests.filter((q) => !q.completed);
  const completedQuests = currentQuests.filter((q) => q.completed);

  // Active quests
  if (activeQuests.length === 0) {
    list.innerHTML = `<div class="empty-state">${t("quests.noQuests")}</div>`;
  } else {
    list.innerHTML = activeQuests
      .map(
        (quest) => `
      <div class="quest-card" data-quest-id="${quest.id}">
        <button class="quest-checkbox" data-action="completeQuest" data-id="${quest.id}">
          <i class="fas fa-check"></i>
        </button>
        <div class="quest-content">
          <h4 class="quest-title">${quest.title}</h4>
          <p class="quest-description">${quest.description || ""}</p>
        </div>
        <span class="quest-reward"><i class="fas fa-bolt"></i> ${quest.xp_reward} <span data-i18n="profile.xp">XP</span></span>
      </div>
    `,
      )
      .join("");
  }

  // Completed quests
  if (completedList) {
    if (completedQuests.length === 0) {
      if (completedSection) completedSection.classList.add("hidden");
    } else {
      if (completedSection) completedSection.classList.remove("hidden");
      completedList.innerHTML = completedQuests
        .map(
          (quest) => `
        <div class="quest-card completed" data-quest-id="${quest.id}">
          <div class="quest-checkbox completed">
            <i class="fas fa-check"></i>
          </div>
          <div class="quest-content">
            <h4 class="quest-title completed">${quest.title}</h4>
            <p class="quest-description">${quest.description || ""}</p>
          </div>
          <span class="quest-reward"><i class="fas fa-bolt"></i> ${quest.xp_reward} <span data-i18n="profile.xp">XP</span></span>
        </div>
      `,
        )
        .join("");
    }
  }
}
