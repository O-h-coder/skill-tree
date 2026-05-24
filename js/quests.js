// ===== Quests Module (View + Complete Only, Daily Reset) =====
import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { t } from "./i18n.js";
import { notify } from "./utils.js";
import { logActivity } from "./user.js";
import { addXp } from "./app.js";

let currentQuests = [];

export async function loadQuests() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  // Check for daily reset - reset completed quests at midnight
  await checkDailyReset(supabase, user.id);

  const { data, error } = await supabase
    .from("quests")
    .select("*")
    .eq("user_id", user.id)
    .eq("completed", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load quests error:", error);
    return [];
  }

  currentQuests = data || [];
  return currentQuests;
}

async function checkDailyReset(supabase, userId) {
  // Get last reset time from user_stats
  const { data: stats } = await supabase
    .from("user_stats")
    .select("last_quest_reset")
    .eq("user_id", userId)
    .single();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let lastReset = stats?.last_quest_reset
    ? new Date(stats.last_quest_reset)
    : null;

  if (!lastReset || lastReset < today) {
    // Reset all completed quests
    await supabase
      .from("quests")
      .update({
        completed: false,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("completed", true);

    // Update last reset time
    await supabase
      .from("user_stats")
      .update({
        last_quest_reset: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);
  }
}

export async function completeQuest(questId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const quest = currentQuests.find((q) => q.id === questId);
  if (!quest) return { error: new Error("Quest not found") };
  if (quest.completed) return { error: new Error("Quest already completed") };

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

  const xpGain = quest.xp_reward || 10;

  // Award XP
  await addXp(xpGain);

  // Log activity
  await logActivity(
    "complete",
    "quest",
    questId,
    quest.title,
    `Completed quest: ${quest.title} (+${xpGain} XP)`,
  );

  notify(t("notifications.questComplete", { title: quest.title }), "success");

  await loadQuests();
  renderQuests();

  return { data: updatedQuest, error: null };
}

export function renderQuests() {
  const list = document.getElementById("quests-list");
  if (!list) return;

  if (currentQuests.length === 0) {
    list.innerHTML = `<div class="empty-state">${t("quests.noQuests")}</div>`;
    return;
  }

  list.innerHTML = currentQuests
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
