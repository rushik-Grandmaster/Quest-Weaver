import { storage } from "./storage";
import { ACHIEVEMENTS } from "@shared/achievements";

export type AchievementTrigger =
  | { type: "task_complete"; taskDifficulty?: string }
  | { type: "level_up"; newLevel: number }
  | { type: "shop_purchase" }
  | { type: "diary_entry" }
  | { type: "body_fat_scan" }
  | { type: "timer_safe" }
  | { type: "login"; streak: number };

/**
 * Checks all unlockable achievements for a user and awards any newly earned ones.
 * Returns array of newly unlocked achievement IDs.
 */
export async function checkAndAwardAchievements(
  userId: string,
  trigger: AchievementTrigger
): Promise<string[]> {
  try {
    const [stats, tasks, inventory, diaryEntries, bodyScans, alreadyUnlocked] = await Promise.all([
      storage.getUserStats(userId),
      storage.getTasks(userId),
      storage.getInventory(userId),
      storage.getDiaryEntries(userId),
      storage.getBodyFatScans(userId),
      storage.getUnlockedAchievements(userId),
    ]);

    const unlockedIds = new Set(alreadyUnlocked.map((a) => a.achievementId));
    const completedTasks = tasks.filter((t) => t.isCompleted);
    const newlyUnlocked: string[] = [];

    const check = async (achievementId: string, condition: boolean) => {
      if (condition && !unlockedIds.has(achievementId)) {
        await storage.unlockAchievement(userId, achievementId);
        newlyUnlocked.push(achievementId);
      }
    };

    if (!stats) return [];

    // === QUESTS ===
    await check("quest_first", completedTasks.length >= 1);
    await check("quest_10", completedTasks.length >= 10);
    await check("quest_25", completedTasks.length >= 25);
    await check("quest_50", completedTasks.length >= 50);
    await check("quest_100", completedTasks.length >= 100);
    await check("quest_hard", completedTasks.some((t) => t.difficulty === "hard"));

    // === LEVELS ===
    await check("level_2", stats.level >= 2);
    await check("level_5", stats.level >= 5);
    await check("level_10", stats.level >= 10);
    await check("level_25", stats.level >= 25);
    await check("level_50", stats.level >= 50);

    // === STREAKS ===
    await check("streak_3", stats.streak >= 3);
    await check("streak_7", stats.streak >= 7);
    await check("streak_30", stats.streak >= 30);

    // === GOLD (points) ===
    await check("gold_100", stats.points >= 100);
    await check("gold_500", stats.points >= 500);
    await check("gold_1000", stats.points >= 1000);

    // === SHOP ===
    await check("shop_first", inventory.length >= 1);
    await check("shop_5", inventory.length >= 5);

    // === DIARY ===
    await check("diary_first", diaryEntries.length >= 1);
    await check("diary_10", diaryEntries.length >= 10);

    // === HEALTH ===
    await check("health_scan", bodyScans.length >= 1);

    // === SPECIAL ===
    if (trigger.type === "timer_safe") {
      await check("special_timer", true);
    }

    return newlyUnlocked;
  } catch (err) {
    console.error("Achievement check error:", err);
    return [];
  }
}
