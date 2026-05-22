// ===== User Module =====
import { getSupabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";
import { t } from "./i18n.js";
import { notify } from "./ui.js";

let currentProfile = null;

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

export async function updateProfile(updates) {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return { error: new Error("Not authenticated") };

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return { error };
  currentProfile = data;
  return { data, error: null };
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

  if (!file || file.size === 0) {
    return { error: new Error("No file selected") };
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return { error: new Error("Please select an image file") };
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return { error: new Error("Image size must be less than 2MB") };
  }

  const fileExt = file.name.split(".").pop().toLowerCase();
  const allowedExts = ["jpg", "jpeg", "png", "gif", "webp"];
  if (!allowedExts.includes(fileExt)) {
    return { error: new Error("Invalid image format") };
  }

  const fileName = `${user.id}_${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("profiles")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return { error: uploadError };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("profiles").getPublicUrl(filePath);

  // Update profile with new avatar URL
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    console.error("Update profile error:", updateError);
    return { error: updateError };
  }

  return { data: { url: publicUrl }, error: null };
}

export async function renderProfilePage() {
  const profile = await loadUserProfile();
  const stats = await loadUserStats();

  if (!profile) return;

  // Update profile card
  const avatarImg = document.getElementById("profile-avatar");
  const headerAvatar = document.getElementById("header-avatar");

  if (avatarImg) {
    avatarImg.src =
      profile.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || "User")}&background=6366f1&color=fff`;
  }
  if (headerAvatar) {
    headerAvatar.src =
      profile.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || "User")}&background=6366f1&color=fff`;
  }

  const usernameEl = document.getElementById("profile-username");
  const headerUsername = document.getElementById("header-username");
  const emailEl = document.getElementById("profile-email");

  if (usernameEl) usernameEl.textContent = profile.username || "User";
  if (headerUsername) headerUsername.textContent = profile.username || "User";
  if (emailEl) emailEl.textContent = profile.email || "";

  // Update stats
  const levelEl = document.getElementById("profile-level");
  const xpEl = document.getElementById("profile-xp");
  const goldEl = document.getElementById("profile-gold");
  const friendsEl = document.getElementById("profile-friends");

  if (levelEl) levelEl.textContent = stats?.level || 1;
  if (xpEl) xpEl.textContent = stats?.xp || 0;
  if (goldEl) goldEl.textContent = stats?.gold || 0;

  // Count friends
  const friendCount = await getFriendCount();
  if (friendsEl) friendsEl.textContent = friendCount;

  // Update header stats
  const headerLevel = document.getElementById("user-level");
  const headerXp = document.getElementById("user-xp");
  const headerGold = document.getElementById("user-gold");

  if (headerLevel) headerLevel.textContent = `Level ${stats?.level || 1}`;
  if (headerXp) headerXp.textContent = `${stats?.xp || 0} XP`;
  if (headerGold) headerGold.textContent = `${stats?.gold || 0} Gold`;
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

export async function loadProfileSkills() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  const { data, error } = await supabase
    .from("user_skills")
    .select("*, skills(*)")
    .eq("user_id", user.id)
    .eq("unlocked", true);

  if (error) {
    console.error("Load profile skills error:", error);
    return [];
  }

  return data || [];
}

export async function loadProfileQuests() {
  const supabase = getSupabase();
  const user = await getCurrentUser();
  if (!supabase || !user) return [];

  const { data, error } = await supabase
    .from("quests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Load profile quests error:", error);
    return [];
  }

  return data || [];
}

export async function renderProfileItems() {
  const skills = await loadProfileSkills();
  const quests = await loadProfileQuests();

  // Render skills
  const skillsList = document.getElementById("profile-skills-list");
  if (skillsList) {
    if (skills.length === 0) {
      skillsList.innerHTML = `<div class="empty-state">${t("friends.noFriends").replace("أصدقاء", "مهارات")}</div>`;
    } else {
      skillsList.innerHTML = skills
        .map(
          (s) => `
                <div class="profile-item" data-skill-id="${s.skill_id}">
                    <div class="profile-item-icon skill"><i class="fas ${s.skills?.icon || "fa-star"}"></i></div>
                    <div class="profile-item-content">
                        <h4>${s.skills?.name || "Skill"}</h4>
                        <p>${s.skills?.description || ""}</p>
                    </div>
                    <div class="profile-item-actions">
                        <button class="btn-edit" data-action="editSkill" data-id="${s.skill_id}" title="${t("common.edit")}"><i class="fas fa-pen"></i></button>
                        <button class="btn-delete" data-action="deleteSkill" data-id="${s.skill_id}" title="${t("common.delete")}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `,
        )
        .join("");
    }
  }

  // Render quests
  const questsList = document.getElementById("profile-quests-list");
  if (questsList) {
    if (quests.length === 0) {
      questsList.innerHTML = `<div class="empty-state">${t("friends.noFriends").replace("أصدقاء", "مهام")}</div>`;
    } else {
      questsList.innerHTML = quests
        .map(
          (q) => `
                <div class="profile-item" data-quest-id="${q.id}">
                    <div class="profile-item-icon quest"><i class="fas fa-scroll"></i></div>
                    <div class="profile-item-content">
                        <h4>${q.title}</h4>
                        <p>${q.description || ""} - <span style="color: var(--warning)">${q.xp_reward} XP</span></p>
                    </div>
                    <div class="profile-item-actions">
                        <button class="btn-edit" data-action="editQuest" data-id="${q.id}" title="${t("common.edit")}"><i class="fas fa-pen"></i></button>
                        <button class="btn-delete" data-action="deleteQuest" data-id="${q.id}" title="${t("common.delete")}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `,
        )
        .join("");
    }
  }
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
