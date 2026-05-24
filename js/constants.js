// ===== Constants =====
export const SUPABASE_URL = "https://mvvvhrxvsatzqqfxmgpb.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dnZocnh2c2F0enFxZnhtZ3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODQ5MzMsImV4cCI6MjA5NDk2MDkzM30.Pg21CayHy-ebtAnD2rs5tGAAx2ImNyH5F_Y7VhL1-us";

export const DEFAULT_SKILLS = [
  {
    id: "strength",
    name: "القوة",
    description: "تطوير القوة البدنية واللياقة",
    icon: "fa-dumbbell",
    xp_reward: 25,
    color: "#ef4444",
  },
  {
    id: "intelligence",
    name: "الذكاء",
    description: "تطوير العقل والمعرفة",
    icon: "fa-brain",
    xp_reward: 25,
    color: "#6366f1",
  },
  {
    id: "agility",
    name: "الرشاقة",
    description: "السرعة والمرونة",
    icon: "fa-running",
    xp_reward: 30,
    color: "#10b981",
  },
  {
    id: "perception",
    name: "الإدراك",
    description: "حواسك ووعيك",
    icon: "fa-eye",
    xp_reward: 30,
    color: "#f59e0b",
  },
  {
    id: "magic",
    name: "السحر",
    description: "قوى خارقة",
    icon: "fa-hat-wizard",
    xp_reward: 50,
    color: "#8b5cf6",
  },
  {
    id: "crafting",
    name: "الصناعة",
    description: "صناعة الأدوات والأسلحة",
    icon: "fa-hammer",
    xp_reward: 40,
    color: "#d97706",
  },
  {
    id: "stealth",
    name: "التخفي",
    description: "الاختفاء والتسلل",
    icon: "fa-ghost",
    xp_reward: 35,
    color: "#64748b",
  },
  {
    id: "leadership",
    name: "القيادة",
    description: "قيادة الفرق والجيوش",
    icon: "fa-crown",
    xp_reward: 45,
    color: "#fbbf24",
  },
];

export const XP_PER_LEVEL = 100;
export const INITIAL_XP = 0;
export const INITIAL_LEVEL = 1;
