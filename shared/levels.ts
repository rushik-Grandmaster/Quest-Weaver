export const RANK_THRESHOLDS = [
  { rank: "E",   minLevel: 1  },
  { rank: "D",   minLevel: 15 },
  { rank: "C",   minLevel: 30 },
  { rank: "B",   minLevel: 45 },
  { rank: "A",   minLevel: 60 },
  { rank: "S",   minLevel: 75 },
  { rank: "SS",  minLevel: 90 },
] as const;

export type Rank = typeof RANK_THRESHOLDS[number]["rank"];

/** XP needed to go from `level` → `level + 1` */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

/** Get rank string for a given level */
export function getRank(level: number): Rank {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (level >= RANK_THRESHOLDS[i].minLevel) return RANK_THRESHOLDS[i].rank;
  }
  return "E";
}

/** Get rank for the level before (used to detect rank-up) */
export function getPrevRank(level: number): Rank {
  return getRank(Math.max(1, level - 1));
}

/** Apply earned XP and return new level + remaining XP, handling multi-level-up */
export function applyXp(currentLevel: number, currentXp: number, earnedXp: number) {
  let level = currentLevel;
  let xp = currentXp + earnedXp;
  let leveledUp = false;

  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    leveledUp = true;
  }

  return { level, xp, leveledUp };
}
