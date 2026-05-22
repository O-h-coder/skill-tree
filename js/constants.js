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
    xpCost: 0,
    color: "#ef4444",
  },
  {
    id: "intelligence",
    name: "الذكاء",
    description: "تطوير العقل والمعرفة",
    icon: "fa-brain",
    xpCost: 0,
    color: "#6366f1",
  },
  {
    id: "agility",
    name: "الرشاقة",
    description: "السرعة والمرونة",
    icon: "fa-running",
    xpCost: 50,
    color: "#10b981",
  },
  {
    id: "perception",
    name: "الإدراك",
    description: "حواسك ووعيك",
    icon: "fa-eye",
    xpCost: 50,
    color: "#f59e0b",
  },
  {
    id: "magic",
    name: "السحر",
    description: "قوى خارقة",
    icon: "fa-hat-wizard",
    xpCost: 100,
    color: "#8b5cf6",
  },
  {
    id: "crafting",
    name: "الصناعة",
    description: "صناعة الأدوات والأسلحة",
    icon: "fa-hammer",
    xpCost: 100,
    color: "#d97706",
  },
  {
    id: "stealth",
    name: "التخفي",
    description: "الاختفاء والتسلل",
    icon: "fa-ghost",
    xpCost: 150,
    color: "#64748b",
  },
  {
    id: "leadership",
    name: "القيادة",
    description: "قيادة الفرق والجيوش",
    icon: "fa-crown",
    xpCost: 200,
    color: "#fbbf24",
  },
];

export const XP_PER_LEVEL = 100;
export const INITIAL_GOLD = 0;
export const INITIAL_XP = 0;
export const INITIAL_LEVEL = 1;
