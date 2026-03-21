export type AchievementCategory = "quests" | "levels" | "streaks" | "gold" | "shop" | "diary" | "health" | "special";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export const ACHIEVEMENTS: Achievement[] = [
  // === QUESTS ===
  { id: "quest_first",    title: "First Blood",      description: "Complete your very first quest.",                icon: "⚔️",  category: "quests",  rarity: "common" },
  { id: "quest_10",       title: "Warrior",           description: "Complete 10 quests.",                           icon: "🗡️",  category: "quests",  rarity: "common" },
  { id: "quest_25",       title: "Veteran",           description: "Complete 25 quests.",                           icon: "🏹",  category: "quests",  rarity: "rare" },
  { id: "quest_50",       title: "Champion",          description: "Complete 50 quests.",                           icon: "🛡️",  category: "quests",  rarity: "rare" },
  { id: "quest_100",      title: "Legend",            description: "Complete 100 quests.",                          icon: "👑",  category: "quests",  rarity: "epic" },
  { id: "quest_hard",     title: "Hard Mode",         description: "Complete a Hard difficulty quest.",             icon: "🔥",  category: "quests",  rarity: "rare" },

  // === LEVELS ===
  { id: "level_2",        title: "Rising Star",       description: "Reach Level 2.",                               icon: "⭐",  category: "levels",  rarity: "common" },
  { id: "level_5",        title: "Apprentice",        description: "Reach Level 5.",                               icon: "🌟",  category: "levels",  rarity: "common" },
  { id: "level_10",       title: "Adept",             description: "Reach Level 10.",                              icon: "💫",  category: "levels",  rarity: "rare" },
  { id: "level_25",       title: "Master",            description: "Reach Level 25.",                              icon: "🌠",  category: "levels",  rarity: "epic" },
  { id: "level_50",       title: "Grandmaster",       description: "Reach Level 50.",                              icon: "✨",  category: "levels",  rarity: "legendary" },

  // === STREAKS ===
  { id: "streak_3",       title: "On a Roll",         description: "Maintain a 3-day login streak.",               icon: "🔥",  category: "streaks", rarity: "common" },
  { id: "streak_7",       title: "Week Warrior",      description: "Maintain a 7-day login streak.",               icon: "📅",  category: "streaks", rarity: "rare" },
  { id: "streak_30",      title: "Iron Will",         description: "Maintain a 30-day login streak.",              icon: "🏆",  category: "streaks", rarity: "legendary" },

  // === GOLD ===
  { id: "gold_100",       title: "Coin Collector",    description: "Accumulate 100 gold.",                         icon: "🪙",  category: "gold",    rarity: "common" },
  { id: "gold_500",       title: "Treasurer",         description: "Accumulate 500 gold.",                         icon: "💰",  category: "gold",    rarity: "rare" },
  { id: "gold_1000",      title: "Mogul",             description: "Accumulate 1,000 gold.",                       icon: "💎",  category: "gold",    rarity: "epic" },

  // === SHOP ===
  { id: "shop_first",     title: "Shopkeeper's Pal",  description: "Purchase an item from the shop.",              icon: "🛒",  category: "shop",    rarity: "common" },
  { id: "shop_5",         title: "Big Spender",       description: "Purchase 5 items from the shop.",              icon: "🤑",  category: "shop",    rarity: "rare" },

  // === DIARY ===
  { id: "diary_first",    title: "Storyteller",       description: "Write your first diary entry.",                icon: "📖",  category: "diary",   rarity: "common" },
  { id: "diary_10",       title: "Chronicler",        description: "Write 10 diary entries.",                      icon: "📚",  category: "diary",   rarity: "rare" },

  // === HEALTH ===
  { id: "health_scan",    title: "Body Aware",        description: "Complete your first body fat analysis.",       icon: "💪",  category: "health",  rarity: "common" },

  // === SPECIAL ===
  { id: "special_timer",  title: "Under Pressure",    description: "Successfully level up with the Pressure Timer active.", icon: "⏱️", category: "special", rarity: "epic" },
];

export const RARITY_COLORS: Record<Achievement["rarity"], { bg: string; border: string; text: string; glow: string }> = {
  common:    { bg: "bg-slate-500/10",   border: "border-slate-500/30",   text: "text-slate-400",   glow: "" },
  rare:      { bg: "bg-blue-500/10",    border: "border-blue-500/30",    text: "text-blue-400",    glow: "shadow-blue-500/20" },
  epic:      { bg: "bg-purple-500/10",  border: "border-purple-500/30",  text: "text-purple-400",  glow: "shadow-purple-500/20" },
  legendary: { bg: "bg-yellow-500/10",  border: "border-yellow-500/30",  text: "text-yellow-400",  glow: "shadow-yellow-500/25" },
};
