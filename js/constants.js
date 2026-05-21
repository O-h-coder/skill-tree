// File constants.js
/**
 * constants.js — الثوابت والإعدادات العامة
 */

export const SUPABASE_URL = "https://mvvvhrxvsatzqqfxmgpb.supabase.co";
export const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12dnZocnh2c2F0enFxZnhtZ3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODQ5MzMsImV4cCI6MjA5NDk2MDkzM30.Pg21CayHy-ebtAnD2rs5tGAAx2ImNyH5F_Y7VhL1-us";
export const APP_CONSTANTS = {
  TITLES: {
    1: { ar: "صيّاد E-Rank", en: "E-Rank Hunter" },
    10: { ar: "صيّاد D-Rank", en: "D-Rank Hunter" },
    25: { ar: "صيّاد C-Rank", en: "C-Rank Hunter" },
    50: { ar: "صيّاد B-Rank", en: "B-Rank Hunter" },
    75: { ar: "صيّاد A-Rank", en: "A-Rank Hunter" },
    100: { ar: "صيّاد S-Rank", en: "S-Rank Hunter" },
  },
  XP_MULTIPLIER: 1.5,
  DEFAULT_LANG: "ar",
  DEFAULT_THEME: "dark",
};

export const THEMES = {
  neonBlue: {
    name: "نيون أزرق / Neon Blue",
    primary: "#00d4ff",
    secondary: "#7000ff",
  },
  neonRed: {
    name: "نيون أحمر / Neon Red",
    primary: "#ff2a6d",
    secondary: "#d300c5",
  },
  neonGreen: {
    name: "نيون أخضر / Neon Green",
    primary: "#39ff14",
    secondary: "#008f11",
  },
  neonGold: {
    name: "نيون ذهبي / Neon Gold",
    primary: "#ffd700",
    secondary: "#ff8c00",
  },
};
