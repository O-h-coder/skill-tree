// ===== User Module =====
import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { t } from "./i18n.js";
import { notify } from "./utils.js";

let currentProfile = null;
let currentSkills = [];
let currentQuests = [];
let editingSkillId = null;
let editingQuestId = null;

// ===== Profile Loading =====
export async function loadUserProfile() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Load profile error:", error);
    return null;
  }
  currentProfile = data;
  return data;
}

export async function loadUserStats() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return null;

  const { data, error } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Load stats error:", error);
    return null;
  }
  return data;
}

export async function updateStats(updates) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const { data, error } = await supabase
    .from("user_stats")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select()
    .single();

  return { data, error };
}

export async function uploadAvatar(file) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  if (!file || file.size === 0) return { error: new Error("No file selected") };
  if (!file.type.startsWith("image/"))
    return { error: new Error("Please select an image file") };
  if (file.size > 2 * 1024 * 1024)
    return { error: new Error("Image size must be less than 2MB") };

  const fileExt = file.name.split(".").pop().toLowerCase();
  const allowedExts = ["jpg", "jpeg", "png", "gif", "webp"];
  if (!allowedExts.includes(fileExt))
    return { error: new Error("Invalid image format") };

  const fileName = `${user.id}_${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("profiles")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) return { error: uploadError };

  const {
    data: { publicUrl },
  } = supabase.storage.from("profiles").getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) return { error: updateError };
  return { data: { url: publicUrl }, error: null };
}

// ===== Activity Log =====
export async function logActivity(
  actionType,
  itemType,
  itemId,
  title,
  description,
) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return;

  await supabase.from("activity_history").insert([
    {
      user_id: user.id,
      action_type: actionType,
      item_type: itemType,
      item_id: itemId,
      title: title,
      description: description,
      created_at: new Date().toISOString(),
    },
  ]);
}

export async function loadActivityHistory() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  const { data, error } = await supabase
    .from("activity_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Load activity error:", error);
    return [];
  }
  return data || [];
}

// ===== Skills CRUD (Profile Page) =====
export async function loadProfileSkills() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  const { data, error } = await supabase
    .from("skills")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load profile skills error:", error);
    return [];
  }
  currentSkills = data || [];
  return currentSkills;
}

export async function addSkill(name, description, icon, color) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  if (!name?.trim()) return { error: new Error("Skill name is required") };

  const { data, error } = await supabase
    .from("skills")
    .insert([
      {
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || "",
        icon: icon || "fa-star",
        color: color || "#6366f1",
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Add skill error:", error);
    return { error };
  }

  await logActivity("add", "skill", data.id, name, `Added skill: ${name}`);
  notify(t("profile.skillAdded"), "success");
  await loadProfileSkills();
  renderProfileSkills();
  return { data, error: null };
}

export async function editSkill(skillId, updates) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const { data, error } = await supabase
    .from("skills")
    .update({
      name: updates.name?.trim(),
      description: updates.description?.trim(),
      icon: updates.icon,
      color: updates.color,
      updated_at: new Date().toISOString(),
    })
    .eq("id", skillId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Edit skill error:", error);
    return { error };
  }

  await logActivity(
    "edit",
    "skill",
    skillId,
    updates.name,
    `Edited skill: ${updates.name}`,
  );
  notify(t("profile.skillEdited"), "success");
  await loadProfileSkills();
  renderProfileSkills();
  return { data, error: null };
}

export async function deleteSkill(skillId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const skill = currentSkills.find((s) => s.id === skillId);

  const { error } = await supabase
    .from("skills")
    .delete()
    .eq("id", skillId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Delete skill error:", error);
    return { error };
  }

  await logActivity(
    "delete",
    "skill",
    skillId,
    skill?.name || "",
    `Deleted skill: ${skill?.name || ""}`,
  );
  notify(t("profile.skillDeleted"), "success");
  await loadProfileSkills();
  renderProfileSkills();
  return { error: null };
}

// ===== Quests CRUD (Profile Page) =====
export async function loadProfileQuests() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  const { data, error } = await supabase
    .from("quests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load profile quests error:", error);
    return [];
  }
  currentQuests = data || [];
  return currentQuests;
}

export async function addQuest(title, description, xpReward) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  if (!title?.trim()) return { error: new Error("Quest title is required") };

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

  await logActivity("add", "quest", data.id, title, `Added quest: ${title}`);
  notify(t("profile.questAdded"), "success");
  await loadProfileQuests();
  renderProfileQuests();
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

  await logActivity(
    "edit",
    "quest",
    questId,
    updates.title,
    `Edited quest: ${updates.title}`,
  );
  notify(t("profile.questEdited"), "success");
  await loadProfileQuests();
  renderProfileQuests();
  return { data, error: null };
}

export async function deleteQuest(questId) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const quest = currentQuests.find((q) => q.id === questId);

  const { error } = await supabase
    .from("quests")
    .delete()
    .eq("id", questId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Delete quest error:", error);
    return { error };
  }

  await logActivity(
    "delete",
    "quest",
    questId,
    quest?.title || "",
    `Deleted quest: ${quest?.title || ""}`,
  );
  notify(t("profile.questDeleted"), "success");
  await loadProfileQuests();
  renderProfileQuests();
  return { error: null };
}

// ===== Render Profile Page =====
export async function renderProfilePage() {
  const profile = await loadUserProfile();
  const stats = await loadUserStats();

  if (!profile) return;

  const avatarImg = document.getElementById("profile-avatar");
  const headerAvatar = document.getElementById("header-avatar");
  const avatarUrl =
    profile.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || "User")}&background=6366f1&color=fff`;

  if (avatarImg) avatarImg.src = avatarUrl;
  if (headerAvatar) headerAvatar.src = avatarUrl;

  const usernameEl = document.getElementById("profile-username");
  const headerUsername = document.getElementById("header-username");
  const emailEl = document.getElementById("profile-email");

  if (usernameEl) usernameEl.textContent = profile.username || "User";
  if (headerUsername) headerUsername.textContent = profile.username || "User";
  if (emailEl) emailEl.textContent = profile.email || "";

  const levelEl = document.getElementById("profile-level");
  const xpEl = document.getElementById("profile-xp");
  const goldEl = document.getElementById("profile-gold");
  const friendsEl = document.getElementById("profile-friends");

  if (levelEl) levelEl.textContent = stats?.level || 1;
  if (xpEl) xpEl.textContent = stats?.xp || 0;
  if (goldEl) goldEl.textContent = stats?.gold || 0;

  const friendCount = await getFriendCount();
  if (friendsEl) friendsEl.textContent = friendCount;

  const headerLevel = document.getElementById("user-level");
  const headerXp = document.getElementById("user-xp");
  const headerGold = document.getElementById("user-gold");

  if (headerLevel) headerLevel.textContent = `Level ${stats?.level || 1}`;
  if (headerXp) headerXp.textContent = `${stats?.xp || 0} XP`;
  if (headerGold) headerGold.textContent = `${stats?.gold || 0} Gold`;

  // Update XP display via engine if available
  if (typeof updateXpDisplay === "function" && stats?.xp !== undefined) {
    try {
      const { calculateLevel } = await import("./app.js");
      updateXpDisplay(calculateLevel(stats.xp));
    } catch (e) {
      // app.js not loaded yet or circular import, ignore
    }
  }
}

async function getFriendCount() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return 0;

  const { count, error } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  if (error) return 0;
  return count || 0;
}

// ===== Render Profile Items =====
export async function renderProfileItems() {
  await renderProfileSkills();
  await renderProfileQuests();
  await renderActivityLog();
}

export function renderProfileSkills() {
  const list = document.getElementById("profile-skills-list");
  if (!list) return;

  if (currentSkills.length === 0) {
    list.innerHTML = `<div class="empty-state">${t("profile.noSkills")}</div>`;
    return;
  }

  list.innerHTML = currentSkills
    .map(
      (s) => `
    <div class="profile-item" data-skill-id="${s.id}">
      <div class="profile-item-icon skill" style="background: ${s.color}20; color: ${s.color}">
        <i class="fas ${s.icon}"></i>
      </div>
      <div class="profile-item-content">
        <h4>${s.name}</h4>
        <p>${s.description || ""}</p>
      </div>
      <div class="profile-item-actions">
        <button class="btn-edit" data-action="editProfileSkill" data-id="${s.id}" title="${t("common.edit")}">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn-delete" data-action="deleteProfileSkill" data-id="${s.id}" title="${t("common.delete")}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `,
    )
    .join("");
}

export function renderProfileQuests() {
  const list = document.getElementById("profile-quests-list");
  if (!list) return;

  if (currentQuests.length === 0) {
    list.innerHTML = `<div class="empty-state">${t("profile.noQuests")}</div>`;
    return;
  }

  list.innerHTML = currentQuests
    .map(
      (q) => `
    <div class="profile-item" data-quest-id="${q.id}">
      <div class="profile-item-icon quest"><i class="fas fa-scroll"></i></div>
      <div class="profile-item-content">
        <h4>${q.title}</h4>
        <p>${q.description || ""} — <span style="color: var(--warning)">${q.xp_reward} XP</span></p>
      </div>
      <div class="profile-item-actions">
        <button class="btn-edit" data-action="editProfileQuest" data-id="${q.id}" title="${t("common.edit")}">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn-delete" data-action="deleteProfileQuest" data-id="${q.id}" title="${t("common.delete")}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `,
    )
    .join("");
}

export async function renderActivityLog() {
  const list = document.getElementById("activity-log-list");
  if (!list) return;

  const activities = await loadActivityHistory();

  if (activities.length === 0) {
    list.innerHTML = `<div class="empty-state">${t("profile.noActivity")}</div>`;
    return;
  }

  const actionLabels = {
    add: t("activity.added"),
    edit: t("activity.edited"),
    delete: t("activity.deleted"),
    complete: t("activity.completed"),
    unlock: t("activity.unlocked"),
    view: t("activity.viewed"),
  };

  const itemLabels = {
    skill: t("activity.skill"),
    quest: t("activity.quest"),
  };

  list.innerHTML = activities
    .map((a) => {
      const date = new Date(a.created_at);
      const timeStr = date.toLocaleDateString(
        currentLang === "ar" ? "ar-SA" : "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      );

      const iconClass = a.item_type === "skill" ? "fa-star" : "fa-scroll";
      const actionLabel = actionLabels[a.action_type] || a.action_type;
      const itemLabel = itemLabels[a.item_type] || a.item_type;

      return `
      <div class="activity-item" data-activity-id="${a.id}">
        <div class="activity-icon ${a.item_type}">
          <i class="fas ${iconClass}"></i>
        </div>
        <div class="activity-content">
          <p class="activity-title">${actionLabel} ${itemLabel}: <strong>${a.title}</strong></p>
          <p class="activity-desc">${a.description || ""}</p>
          <span class="activity-time">${timeStr}</span>
        </div>
      </div>
    `;
    })
    .join("");
}

// ===== Modals =====
export function openAddSkillModal() {
  const modal = document.getElementById("add-skill-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.getElementById("new-skill-name").value = "";
    document.getElementById("new-skill-description").value = "";
    document.getElementById("new-skill-icon").value = "fa-star";
    document.getElementById("new-skill-color").value = "#6366f1";
  }
}

export function openEditSkillModal(skillId) {
  const skill = currentSkills.find((s) => s.id === skillId);
  if (!skill) return;

  editingSkillId = skillId;
  const modal = document.getElementById("edit-skill-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.getElementById("edit-skill-id").value = skillId;
    document.getElementById("edit-skill-name").value = skill.name;
    document.getElementById("edit-skill-description").value =
      skill.description || "";
    document.getElementById("edit-skill-icon").value = skill.icon || "fa-star";
    document.getElementById("edit-skill-color").value =
      skill.color || "#6366f1";
  }
}

export async function saveSkillEdit() {
  if (!editingSkillId) return;
  const name = document.getElementById("edit-skill-name")?.value;
  const desc = document.getElementById("edit-skill-description")?.value;
  const icon = document.getElementById("edit-skill-icon")?.value;
  const color = document.getElementById("edit-skill-color")?.value;

  if (!name?.trim()) {
    notify(t("profile.nameRequired"), "error");
    return;
  }

  await editSkill(editingSkillId, { name, description: desc, icon, color });
  closeModal("edit-skill-modal");
  editingSkillId = null;
}

export async function saveNewSkill() {
  const name = document.getElementById("new-skill-name")?.value;
  const desc = document.getElementById("new-skill-description")?.value;
  const icon = document.getElementById("new-skill-icon")?.value || "fa-star";
  const color = document.getElementById("new-skill-color")?.value || "#6366f1";

  if (!name?.trim()) {
    notify(t("profile.nameRequired"), "error");
    return;
  }

  await addSkill(name, desc, icon, color);
  closeModal("add-skill-modal");
}

export function openAddQuestModal() {
  const modal = document.getElementById("add-quest-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.getElementById("new-quest-title").value = "";
    document.getElementById("new-quest-description").value = "";
    document.getElementById("new-quest-xp").value = "10";
  }
}

export function openEditQuestModal(questId) {
  const quest = currentQuests.find((q) => q.id === questId);
  if (!quest) return;

  editingQuestId = questId;
  const modal = document.getElementById("edit-quest-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.getElementById("edit-quest-id").value = questId;
    document.getElementById("edit-quest-title").value = quest.title;
    document.getElementById("edit-quest-description").value =
      quest.description || "";
    document.getElementById("edit-quest-xp").value = quest.xp_reward;
  }
}

export async function saveQuestEdit() {
  if (!editingQuestId) return;
  const title = document.getElementById("edit-quest-title")?.value;
  const desc = document.getElementById("edit-quest-description")?.value;
  const xp = document.getElementById("edit-quest-xp")?.value;

  if (!title?.trim()) {
    notify(t("profile.titleRequired"), "error");
    return;
  }

  await editQuest(editingQuestId, { title, description: desc, xp_reward: xp });
  closeModal("edit-quest-modal");
  editingQuestId = null;
}

export async function saveNewQuest() {
  const title = document.getElementById("new-quest-title")?.value;
  const desc = document.getElementById("new-quest-description")?.value;
  const xp = document.getElementById("new-quest-xp")?.value || "10";

  if (!title?.trim()) {
    notify(t("profile.titleRequired"), "error");
    return;
  }

  await addQuest(title, desc, xp);
  closeModal("add-quest-modal");
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("hidden");
}

export async function handleAvatarChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const { data, error } = await uploadAvatar(file);
  if (error) {
    notify(error.message, "error");
    return;
  }

  if (data?.url) {
    const avatarImg = document.getElementById("profile-avatar");
    const headerAvatar = document.getElementById("header-avatar");
    if (avatarImg) avatarImg.src = data.url;
    if (headerAvatar) headerAvatar.src = data.url;
    notify(t("profile.avatarUpdated"), "success");
  }
}
