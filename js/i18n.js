/**
 * i18n.js — محرك الترجمة الكامل
 */

const dictionary = {
  ar: {
    // ===== APP =====
    appTitle: "Skill Tree - نظام تطوير المهارات",
    appSubtitle: "نظام تطوير المهارات | Solo Leveling Style",
    loading: "جاري التحميل...",
    loadingData: "جاري تحميل البيانات...",
    loadingSkills: "جاري تحميل المهارات...",
    loadingQuests: "جاري تحميل المهام...",
    loadingVerify: "جاري التحقق...",

    // ===== NAVIGATION =====
    skillTree: "شجرة المهارات",
    dailyQuests: "المهام اليومية",
    friends: "الأصدقاء",
    profile: "الملف الشخصي",
    settings: "الإعدادات",
    logout: "خروج",

    // ===== LOGIN =====
    loginTitle: "تسجيل الدخول",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    forgotPassword: "نسيت كلمة المرور؟",
    haveAccount: "لديك حساب؟ تسجيل الدخول",
    noAccount: "ليس لديك حساب؟ إنشاء حساب جديد",
    enterEmailPassword: "أدخل البريد وكلمة المرور",
    enterEmail: "أدخل بريدك الإلكتروني",
    passwordShort: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    invalidCredentials: "بيانات الدخول غير صحيحة",
    registerSuccess: "تم إنشاء الحساب! تحقق من بريدك الإلكتروني.",
    loginSuccess: "تم تسجيل الدخول!",
    logoutSuccess: "تم تسجيل الخروج",

    // ===== USERNAME =====
    chooseUsername: "اختر اسم المستخدم",
    username: "اسم المستخدم",
    usernameDesc: "هذا الاسم سيظهر للآخرين وفي الترتيب",
    usernameShort: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل",
    usernameTaken: "اسم المستخدم مستخدم مسبقاً",
    usernameRequired: "اسم المستخدم مطلوب",
    saveContinue: "حفظ والاستمرار",
    continue: "متابعة",

    // ===== RECOVERY =====
    recoveryTitle: "استعادة الحساب",
    recoveryDesc: "أدخل بريدك الإلكتروني وسيتم إرسال رابط استعادة.",
    sendRecovery: "إرسال رابط الاستعادة",
    recoverSent: "تم إرسال رابط الاستعادة",
    backToLogin: "العودة لتسجيل الدخول",

    // ===== SKILL TREE =====
    skillsEmptyTitle: "شجرتك فارغة",
    skillsEmptyDesc: "ابدأ بإضافة مهارات جديدة من صفحة البروفايل",
    skillsUnlocked: "المهارات المفتوحة",
    skillAdded: "تم إضافة المهارة!",
    skillUnlocked: "تم الفتح!",
    newSkillUnlocked: "لقد فتحت مهارة جديدة",
    unlocked: "مفتوحة",
    available: "متاحة",
    locked: "مقفولة",
    unlock: "فتح",
    needXP: "تحتاج {{xp}} XP",
    skillNameRequired: "اسم المهارة مطلوب",

    // ===== QUESTS =====
    questsEmptyTitle: "لا توجد مهام",
    questsEmptyDesc: "أضف مهام يومية من صفحة البروفايل",
    questsCompleted: "مهام مكتملة",
    questAdded: "تم إضافة المهمة!",
    questCompleted: "تم إنجاز المهمة! +{{xp}} XP",
    completed: "مكتملة",
    pending: "قيد الانتظار",
    noQuests: "لا توجد مهام",
    noSkills: "لا توجد مهارات",
    questNameRequired: "اسم المهمة مطلوب",

    // ===== FRIENDS =====
    friendsDesc: "قائمة أصدقائك، الترتيب، وإدارة طلبات الصداقة.",
    searchFriend: "ابحث عن صديق",
    searchUser: "اكتب اسم المستخدم بالظبط",
    addFriend: "إضافة صديق",
    add: "إضافة",
    leaderboard: "الترتيب",
    receivedRequests: "واردة",
    sentRequests: "مرسلة",
    noFriends: "لا يوجد أصدقاء بعد. ابحث عن صديق وأضفه!",
    noReceived: "لا توجد طلبات واردة",
    noSent: "لا توجد طلبات مرسلة",
    accept: "قبول",
    reject: "رفض",
    remove: "إزالة",
    confirmRemoveFriend: "هل أنت متأكد من إزالة هذا الصديق؟",
    friendRequestSent: "تم إرسال طلب الصداقة!",
    friendRequestAccepted: "تم قبول طلب الصداقة!",
    friendRequestRejected: "تم رفض طلب الصداقة",
    friendRemoved: "تم إزالة الصديق",
    alreadyFriends: "أنتما أصدقاء بالفعل",
    requestAlreadySent: "تم إرسال الطلب مسبقاً",
    cannotAddSelf: "لا يمكن إضافة نفسك",
    userNotFound: "المستخدم غير موجود",
    enterUsernameFirst: "اكتب اسم المستخدم أولاً",

    // ===== PROFILE =====
    stats: "الإحصائيات",
    personalSkills: "المهارات الشخصية",
    dailyTasks: "المهام اليومية",
    activityHistory: "سجل النشاطات",
    noActivity: "سجل النشاطات سيظهر هنا",
    addSkill: "إضافة مهارة جديدة",
    addQuest: "أضف مهمة مخصصة",
    skillName: "اسم المهارة",
    skillXP: "XP",
    skillDesc: "وصف مختصر",
    questName: "اسم المهمة",
    questXP: "XP",
    questDesc: "وصف المهمة",
    create: "إنشاء",
    avatarUpdated: "تم تحديث الصورة",
    failedLoadProfile: "فشل تحميل البروفايل",

    // ===== SETTINGS =====
    settingsDesc: "تخصيص تجربتك في Skill Tree.",
    theme: "المظهر",
    darkMode: "الوضع الداكن",
    lightMode: "الوضع الفاتح",
    themeDesc: "التبديل بين الوضع الداكن والفاتح",
    language: "اللغة",
    languageDesc: "اختر لغة واجهة المستخدم",
    colors: "ألوان المظهر",
    colorsDesc: "اختر نظام الألوان المفضل",
    dangerZone: "منطقة الخطر",
    resetSkills: "إعادة تعيين المهارات والمستوى",
    resetSettings: "إعادة تعيين الإعدادات والبيانات",
    deleteAccount: "مسح الحساب نهائياً",
    resetConfirm: "هل أنت متأكد؟ سيتم إعادة تعيين كل شيء!",
    resetDone: "تم إعادة التعيين",
    settingsReset: "تم إعادة الإعدادات",
    comingSoon: "قريباً",
    contactSupport: "يرجى التواصل مع الدعم",
    themeSaved: "تم تطبيق المظهر: {{theme}}",

    // ===== XP / LEVEL =====
    rank: "الرتبة",
    level: "المستوى",
    xp: "XP",
    streakDays: "أيام متتالية",
    days: "أيام",
    day: "يوم",
    excellent: "ممتاز!",
    close: "إغلاق",
    save: "حفظ",
    saved: "تم الحفظ",

    // ===== ERRORS =====
    error: "خطأ",
    success: "نجاح",
    info: "معلومة",
    warning: "تحذير",
    errorAuth: "يجب تسجيل الدخول أولاً",
    failedLoad: "فشل التحميل",
    failedLoadFriends: "فشل تحميل قائمة الأصدقاء",
    failedLoadSkills: "فشل تحميل شجرة المهارات",
    failedLoadQuests: "فشل تحميل المهام",
    failedAddSkill: "فشل إضافة المهارة",
    failedAddQuest: "فشل إضافة المهمة",
    failedUploadAvatar: "فشل رفع الصورة",
    failedReset: "فشل إعادة التعيين",
    failedSearch: "فشل البحث",
    failedSendRequest: "فشل إرسال الطلب",
    failedAcceptRequest: "فشل قبول الطلب",
    failedRejectRequest: "فشل رفض الطلب",
    failedRemoveFriend: "فشل إزالة الصديق",
    failedSaveUsername: "فشل حفظ الاسم",
    failedLoadHistory: "تعذر تحميل السجل",

    // ===== THEMES =====
    neonBlue: "نيون أزرق",
    neonPurple: "نيون بنفسجي",
    neonGreen: "نيون أخضر",
    neonRed: "نيون أحمر",
    neonGold: "نيون ذهبي",
    cyberPink: "سايبر وردي",
  },
  en: {
    // ===== APP =====
    appTitle: "Skill Tree - Skill Development System",
    appSubtitle: "Skill Development System | Solo Leveling Style",
    loading: "Loading...",
    loadingData: "Loading data...",
    loadingSkills: "Loading skills...",
    loadingQuests: "Loading quests...",
    loadingVerify: "Verifying...",

    // ===== NAVIGATION =====
    skillTree: "Skill Tree",
    dailyQuests: "Daily Quests",
    friends: "Friends",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",

    // ===== LOGIN =====
    loginTitle: "Login",
    login: "Login",
    register: "Register",
    email: "Email",
    password: "Password",
    forgotPassword: "Forgot password?",
    haveAccount: "Have an account? Login",
    noAccount: "No account? Register",
    enterEmailPassword: "Enter email and password",
    enterEmail: "Enter your email",
    passwordShort: "Password must be at least 6 characters",
    invalidCredentials: "Invalid credentials",
    registerSuccess: "Account created! Please check your email.",
    loginSuccess: "Login successful!",
    logoutSuccess: "Logged out successfully",

    // ===== USERNAME =====
    chooseUsername: "Choose Username",
    username: "Username",
    usernameDesc: "This name will be visible to others and on the leaderboard",
    usernameShort: "Username must be at least 3 characters",
    usernameTaken: "Username already taken",
    usernameRequired: "Username is required",
    saveContinue: "Save & Continue",
    continue: "Continue",

    // ===== RECOVERY =====
    recoveryTitle: "Account Recovery",
    recoveryDesc: "Enter your email and a recovery link will be sent.",
    sendRecovery: "Send Recovery Link",
    recoverSent: "Recovery link sent",
    backToLogin: "Back to Login",

    // ===== SKILL TREE =====
    skillsEmptyTitle: "Your tree is empty",
    skillsEmptyDesc: "Start by adding new skills from the Profile page",
    skillsUnlocked: "Skills Unlocked",
    skillAdded: "Skill added!",
    skillUnlocked: "Unlocked!",
    newSkillUnlocked: "You unlocked a new skill",
    unlocked: "Unlocked",
    available: "Available",
    locked: "Locked",
    unlock: "Unlock",
    needXP: "Need {{xp}} XP",
    skillNameRequired: "Skill name is required",

    // ===== QUESTS =====
    questsEmptyTitle: "No quests yet",
    questsEmptyDesc: "Add daily quests from the Profile page",
    questsCompleted: "Quests Completed",
    questAdded: "Quest added!",
    questCompleted: "Quest completed! +{{xp}} XP",
    completed: "Completed",
    pending: "Pending",
    noQuests: "No quests",
    noSkills: "No skills",
    questNameRequired: "Quest name is required",

    // ===== FRIENDS =====
    friendsDesc:
      "Your friends list, leaderboard, and friend request management.",
    searchFriend: "Search for a friend",
    searchUser: "Enter the exact username",
    addFriend: "Add Friend",
    add: "Add",
    leaderboard: "Leaderboard",
    receivedRequests: "Received",
    sentRequests: "Sent",
    noFriends: "No friends yet. Search and add one!",
    noReceived: "No received requests",
    noSent: "No sent requests",
    accept: "Accept",
    reject: "Reject",
    remove: "Remove",
    confirmRemoveFriend: "Are you sure you want to remove this friend?",
    friendRequestSent: "Friend request sent!",
    friendRequestAccepted: "Friend request accepted!",
    friendRequestRejected: "Friend request rejected",
    friendRemoved: "Friend removed",
    alreadyFriends: "Already friends",
    requestAlreadySent: "Request already sent",
    cannotAddSelf: "Cannot add yourself",
    userNotFound: "User not found",
    enterUsernameFirst: "Enter username first",

    // ===== PROFILE =====
    stats: "Statistics",
    personalSkills: "Personal Skills",
    dailyTasks: "Daily Tasks",
    activityHistory: "Activity History",
    noActivity: "Activity history will appear here",
    addSkill: "Add New Skill",
    addQuest: "Add Custom Quest",
    skillName: "Skill Name",
    skillXP: "XP",
    skillDesc: "Short Description",
    questName: "Quest Name",
    questXP: "XP",
    questDesc: "Quest Description",
    create: "Create",
    avatarUpdated: "Avatar updated",
    failedLoadProfile: "Failed to load profile",

    // ===== SETTINGS =====
    settingsDesc: "Customize your Skill Tree experience.",
    theme: "Theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    themeDesc: "Toggle between dark and light mode",
    language: "Language",
    languageDesc: "Choose your interface language",
    colors: "Theme Colors",
    colorsDesc: "Choose your preferred color scheme",
    dangerZone: "Danger Zone",
    resetSkills: "Reset Skills & Level",
    resetSettings: "Reset Settings & Data",
    deleteAccount: "Delete Account Permanently",
    resetConfirm: "Are you sure? Everything will be reset!",
    resetDone: "Reset completed",
    settingsReset: "Settings reset",
    comingSoon: "Coming soon",
    contactSupport: "Please contact support",
    themeSaved: "Theme applied: {{theme}}",

    // ===== XP / LEVEL =====
    rank: "Rank",
    level: "Level",
    xp: "XP",
    streakDays: "Streak Days",
    days: "days",
    day: "day",
    excellent: "Excellent!",
    close: "Close",
    save: "Save",
    saved: "Saved",

    // ===== ERRORS =====
    error: "Error",
    success: "Success",
    info: "Info",
    warning: "Warning",
    errorAuth: "You must login first",
    failedLoad: "Failed to load",
    failedLoadFriends: "Failed to load friends list",
    failedLoadSkills: "Failed to load skill tree",
    failedLoadQuests: "Failed to load quests",
    failedAddSkill: "Failed to add skill",
    failedAddQuest: "Failed to add quest",
    failedUploadAvatar: "Failed to upload avatar",
    failedReset: "Failed to reset",
    failedSearch: "Failed to search",
    failedSendRequest: "Failed to send request",
    failedAcceptRequest: "Failed to accept request",
    failedRejectRequest: "Failed to reject request",
    failedRemoveFriend: "Failed to remove friend",
    failedSaveUsername: "Failed to save username",
    failedLoadHistory: "Failed to load history",

    // ===== THEMES =====
    neonBlue: "Neon Blue",
    neonPurple: "Neon Purple",
    neonGreen: "Neon Green",
    neonRed: "Neon Red",
    neonGold: "Neon Gold",
    cyberPink: "Cyber Pink",
  },
};

let currentLang = "ar";

export function t(key, replacements = {}) {
  let text = dictionary[currentLang]?.[key] || dictionary["en"]?.[key] || key;
  Object.entries(replacements).forEach(([k, v]) => {
    text = text.replace(new RegExp(`{{${k}}}`, "g"), v);
  });
  return text;
}

export function setLanguage(lang) {
  if (!dictionary[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  renderTranslations();
  window.dispatchEvent(new CustomEvent("languagechange", { detail: { lang } }));
}

export function getCurrentLanguage() {
  return currentLang;
}

export function renderTranslations() {
  // Update page title
  document.title = t("appTitle");

  // Update all elements with data-i18n
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });

  // Update all placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.placeholder = t(key);
  });

  // Update all elements with data-i18n-html (for innerHTML)
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key) el.innerHTML = t(key);
  });
}

// Auto-render on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderTranslations);
} else {
  renderTranslations();
}
