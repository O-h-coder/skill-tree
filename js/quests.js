// ===== Quests Module =====
import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { t } from "./i18n.js";
import { notify } from "./utils.js";
import { updateStats, loadUserStats } from "./user.js";

let currentQuests = [];
let editingQuestId = null;

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

export async function addQuest(title, description, xpReward) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const { data, error } = await supabase
    .from("quests")
    .insert([
      {
        user_id: user.id,
        title: title.trim(),
        description: description?.trim() || "",
        xp_reward: parseInt(xpReward) || 10,
        completed: false,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Add quest error:", error);
    return { error };
  }

  notify(t("quests.addSuccess"), "success");
  await loadQuests();
  renderQuests();

  return { data, error: null };
}

export async function editQuest(questId, updates) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const { data, error } = await supabase
    .from("quests")
    .update({
      title: updates.title?.trim(),
      description: updates.description?.trim(),
      xp_reward: parseInt(updates.xp_reward) || 10,
      updated_at: new Date().toISOString(),
    })
    .eq("id", questId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Edit quest error:", error);
    return { error };
  }

  notify(t("quests.editSuccess"), "success");
  await loadQuests();
  renderQuests();

  return { data, error: null };
}

export async function deleteQuest(questId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const { error } = await supabase
    .from("quests")
    .delete()
    .eq("id", questId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Delete quest error:", error);
    return { error };
  }

  notify(t("quests.deleteSuccess"), "success");
  await loadQuests();
  renderQuests();

  return { error: null };
}

export async function completeQuest(questId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const quest = currentQuests.find((q) => q.id === questId);
  if (!quest) return { error: new Error("Quest not found") };

  if (quest.completed) {
    return { error: new Error("Quest already completed") };
  }

  // Mark quest as completed
  const { error: updateError } = await supabase
    .from("quests")
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", questId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Complete quest error:", updateError);
    return { error: updateError };
  }

  // Add XP to user stats
  const stats = await loadUserStats();
  const newXp = (stats?.xp || 0) + (quest.xp_reward || 10);
  const newLevel = Math.floor(newXp / 100) + 1;

  await updateStats({
    xp: newXp,
    level: newLevel,
  });

  // Add activity history
  await supabase.from("activity_history").insert([
    {
      user_id: user.id,
      type: "quest_complete",
      title: quest.title,
      description: `Completed quest: ${quest.title} (+${quest.xp_reward} XP)`,
      created_at: new Date().toISOString(),
    },
  ]);

  notify(t("notifications.questComplete", { title: quest.title }), "success");

  await loadQuests();
  renderQuests();

  // Refresh user stats display
  const headerXp = document.getElementById("user-xp");
  const headerLevel = document.getElementById("user-level");
  if (headerXp) headerXp.textContent = `${newXp} XP`;
  if (headerLevel) headerLevel.textContent = `Level ${newLevel}`;

  return { error: null };
}

export function renderQuests() {
  const list = document.getElementById("quests-list");
  const completedSection = document.getElementById("completed-quests");
  const completedList = document.getElementById("completed-list");

  if (!list) return;

  const activeQuests = currentQuests.filter((q) => !q.completed);
  const completedQuests = currentQuests.filter((q) => q.completed);

  // Render active quests
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
                <span class="quest-reward"><i class="fas fa-bolt"></i> ${quest.xp_reward} XP</span>
                <div class="quest-actions">
                    <button class="btn-edit-quest" data-action="editQuest" data-id="${quest.id}">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-delete-quest" data-action="deleteQuest" data-id="${quest.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  }

  // Render completed quests
  if (completedList) {
    if (completedQuests.length === 0) {
      if (completedSection) completedSection.classList.add("hidden");
    } else {
      if (completedSection) completedSection.classList.remove("hidden");
      completedList.innerHTML = completedQuests
        .map(
          (quest) => `
                <div class="quest-card" data-quest-id="${quest.id}">
                    <div class="quest-checkbox completed">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="quest-content">
                        <h4 class="quest-title completed">${quest.title}</h4>
                        <p class="quest-description">${quest.description || ""}</p>
                    </div>
                    <span class="quest-reward"><i class="fas fa-bolt"></i> ${quest.xp_reward} XP</span>
                    <div class="quest-actions">
                        <button class="btn-delete-quest" data-action="deleteQuest" data-id="${quest.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `,
        )
        .join("");
    }
  }
}

export function openEditQuestModal(questId) {
  const quest = currentQuests.find((q) => q.id === questId);
  if (!quest) return;

  editingQuestId = questId;

  const modal = document.getElementById("edit-quest-modal");
  const titleInput = document.getElementById("edit-quest-title");
  const descInput = document.getElementById("edit-quest-description");
  const xpInput = document.getElementById("edit-quest-xp");

  if (modal) modal.classList.remove("hidden");
  if (titleInput) titleInput.value = quest.title;
  if (descInput) descInput.value = quest.description || "";
  if (xpInput) xpInput.value = quest.xp_reward;
}

export function openAddQuestModal() {
  const modal = document.getElementById("add-quest-modal");
  if (modal) modal.classList.remove("hidden");

  // Clear inputs
  const titleInput = document.getElementById("new-quest-title");
  const descInput = document.getElementById("new-quest-description");
  const xpInput = document.getElementById("new-quest-xp");

  if (titleInput) titleInput.value = "";
  if (descInput) descInput.value = "";
  if (xpInput) xpInput.value = "10";
}

export async function saveQuestEdit() {
  if (!editingQuestId) return;

  const titleInput = document.getElementById("edit-quest-title");
  const descInput = document.getElementById("edit-quest-description");
  const xpInput = document.getElementById("edit-quest-xp");

  if (!titleInput?.value.trim()) {
    notify(t("quests.titleRequired"), "error");
    return;
  }

  await editQuest(editingQuestId, {
    title: titleInput.value,
    description: descInput.value,
    xp_reward: xpInput.value,
  });

  closeModal("edit-quest-modal");
  editingQuestId = null;
}

export async function saveNewQuest() {
  const titleInput = document.getElementById("new-quest-title");
  const descInput = document.getElementById("new-quest-description");
  const xpInput = document.getElementById("new-quest-xp");

  if (!titleInput?.value.trim()) {
    notify(t("quests.titleRequired"), "error");
    return;
  }

  await addQuest(titleInput.value, descInput.value, xpInput.value || 10);

  closeModal("add-quest-modal");
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("hidden");
}
