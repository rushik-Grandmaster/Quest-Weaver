import { db } from "./db";
import {
  users, userStats, tasks, shopItems, inventory, scheduleItems, diaryEntries,
  aiChatMessages, conversations, messages, bodyFatScans, progressTimers, userAchievements,
  chatSessions, wishlistItems,
  type UserStats, type Task, type ShopItem, type InventoryItem, type ScheduleItem, type DiaryEntry, type BodyFatScan, type ProgressTimer, type UserAchievement, type ChatSession, type AiChatMessage, type WishlistItem,
  type InsertTask, type InsertShopItem, type InsertScheduleItem, type InsertDiaryEntry, type InsertBodyFatScan, type InsertWishlistItem
} from "@shared/schema";
import { eq, and, desc, sql, asc } from "drizzle-orm";

export interface IStorage {
  // User Stats
  getUserStats(userId: string): Promise<UserStats | undefined>;
  createUserStats(userId: string): Promise<UserStats>;
  updateUserStats(userId: string, updates: Partial<UserStats>): Promise<UserStats>;
  
  // Tasks
  getTasks(userId: string): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  
  // Shop
  getShopItems(userId: string): Promise<ShopItem[]>;
  getShopItem(id: number): Promise<ShopItem | undefined>;
  createShopItem(item: InsertShopItem): Promise<ShopItem>;
  deleteShopItem(id: number): Promise<void>;
  
  // Inventory
  getInventory(userId: string): Promise<{inventoryId: number, item: ShopItem, acquiredAt: Date, isUsed: boolean, usedAt: Date | null}[]>;
  addToInventory(userId: string, itemId: number): Promise<InventoryItem>;
  useInventoryItem(id: number): Promise<InventoryItem>;
  deleteInventoryItem(id: number): Promise<void>;
  
  // Schedule
  getScheduleItems(userId: string): Promise<ScheduleItem[]>;
  getScheduleItem(id: number): Promise<ScheduleItem | undefined>;
  createScheduleItem(item: InsertScheduleItem): Promise<ScheduleItem>;
  updateScheduleItem(id: number, updates: Partial<ScheduleItem>): Promise<ScheduleItem>;
  deleteScheduleItem(id: number): Promise<void>;

  // Diary
  getDiaryEntries(userId: string): Promise<DiaryEntry[]>;
  getDiaryEntry(id: number): Promise<DiaryEntry | undefined>;
  createDiaryEntry(entry: InsertDiaryEntry): Promise<DiaryEntry>;
  updateDiaryEntry(id: number, updates: Partial<DiaryEntry>): Promise<DiaryEntry>;
  deleteDiaryEntry(id: number): Promise<void>;
  
  // AI Chat Sessions
  createChatSession(userId: string, title: string): Promise<ChatSession>;
  getChatSessions(userId: string): Promise<ChatSession[]>;
  getSessionMessages(sessionId: number): Promise<AiChatMessage[]>;
  updateSessionTitle(sessionId: number, title: string): Promise<void>;
  deleteSession(sessionId: number): Promise<void>;
  getAiHistory(userId: string): Promise<any[]>;
  saveAiMessage(message: any): Promise<any>;
  
  // Body Fat
  saveBodyFatScan(scan: InsertBodyFatScan): Promise<BodyFatScan>;
  getBodyFatScans(userId: string): Promise<BodyFatScan[]>;

  // Progress Timer
  getActiveTimer(userId: string): Promise<ProgressTimer | undefined>;
  createTimer(userId: string, endTime: Date, startLevel: number): Promise<ProgressTimer>;
  cancelTimer(userId: string): Promise<void>;
  triggerTimer(userId: string): Promise<void>;

  // Achievements
  getUnlockedAchievements(userId: string): Promise<UserAchievement[]>;
  unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement>;

  // Wishlist
  getWishlistItems(userId: string): Promise<WishlistItem[]>;
  createWishlistItem(item: InsertWishlistItem): Promise<WishlistItem>;
  deleteWishlistItem(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserStats(userId: string): Promise<UserStats | undefined> {
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    return stats;
  }

  async createUserStats(userId: string): Promise<UserStats> {
    const [stats] = await db.insert(userStats).values({ userId }).returning();
    return stats;
  }

  async updateUserStats(userId: string, updates: Partial<UserStats>): Promise<UserStats> {
    const [stats] = await db.update(userStats)
      .set(updates)
      .where(eq(userStats.userId, userId))
      .returning();
    return stats;
  }

  async getTasks(userId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values([task as any]).returning();
    return newTask;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const [updated] = await db.update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getShopItems(userId: string): Promise<ShopItem[]> {
    return await db.select().from(shopItems)
      .where(
        sql`(${shopItems.userId} IS NULL OR ${shopItems.userId} = ${userId})`
      );
  }

  async getShopItem(id: number): Promise<ShopItem | undefined> {
    const [item] = await db.select().from(shopItems).where(eq(shopItems.id, id));
    return item;
  }

  async createShopItem(item: InsertShopItem): Promise<ShopItem> {
    const [newItem] = await db.insert(shopItems).values([item]).returning();
    return newItem;
  }

  async deleteShopItem(id: number): Promise<void> {
    await db.delete(shopItems).where(eq(shopItems.id, id));
  }

  async getInventory(userId: string): Promise<{inventoryId: number, item: ShopItem, acquiredAt: Date, isUsed: boolean, usedAt: Date | null}[]> {
    const result = await db.select({
      inventoryId: inventory.id,
      item: shopItems,
      acquiredAt: inventory.acquiredAt,
      isUsed: inventory.isUsed,
      usedAt: inventory.usedAt,
    })
    .from(inventory)
    .innerJoin(shopItems, eq(inventory.itemId, shopItems.id))
    .where(eq(inventory.userId, userId));
    
    return result;
  }

  async addToInventory(userId: string, itemId: number): Promise<InventoryItem> {
    const [item] = await db.insert(inventory).values([{ userId, itemId }]).returning();
    return item;
  }

  async useInventoryItem(id: number): Promise<InventoryItem> {
    const [item] = await db.update(inventory)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(inventory.id, id))
      .returning();
    return item;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
  }

  async getScheduleItems(userId: string): Promise<ScheduleItem[]> {
    return await db.select().from(scheduleItems)
      .where(eq(scheduleItems.userId, userId))
      .orderBy(scheduleItems.startTime);
  }

  async getScheduleItem(id: number): Promise<ScheduleItem | undefined> {
    const [item] = await db.select().from(scheduleItems).where(eq(scheduleItems.id, id));
    return item;
  }

  async createScheduleItem(item: InsertScheduleItem): Promise<ScheduleItem> {
    const [newItem] = await db.insert(scheduleItems).values([item as any]).returning();
    return newItem;
  }

  async updateScheduleItem(id: number, updates: Partial<ScheduleItem>): Promise<ScheduleItem> {
    const [updated] = await db.update(scheduleItems)
      .set(updates)
      .where(eq(scheduleItems.id, id))
      .returning();
    return updated;
  }

  async deleteScheduleItem(id: number): Promise<void> {
    await db.delete(scheduleItems).where(eq(scheduleItems.id, id));
  }

  async getDiaryEntries(userId: string): Promise<DiaryEntry[]> {
    return await db.select().from(diaryEntries)
      .where(eq(diaryEntries.userId, userId))
      .orderBy(desc(diaryEntries.createdAt));
  }

  async getDiaryEntry(id: number): Promise<DiaryEntry | undefined> {
    const [entry] = await db.select().from(diaryEntries).where(eq(diaryEntries.id, id));
    return entry;
  }

  async createDiaryEntry(entry: InsertDiaryEntry): Promise<DiaryEntry> {
    const [newEntry] = await db.insert(diaryEntries).values([entry as any]).returning();
    return newEntry;
  }

  async updateDiaryEntry(id: number, updates: Partial<DiaryEntry>): Promise<DiaryEntry> {
    const [updated] = await db.update(diaryEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(diaryEntries.id, id))
      .returning();
    return updated;
  }

  async deleteDiaryEntry(id: number): Promise<void> {
    await db.delete(diaryEntries).where(eq(diaryEntries.id, id));
  }

  async createChatSession(userId: string, title: string): Promise<ChatSession> {
    const [session] = await db.insert(chatSessions).values({ userId, title }).returning();
    return session;
  }

  async getChatSessions(userId: string): Promise<ChatSession[]> {
    return await db.select().from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt));
  }

  async getSessionMessages(sessionId: number): Promise<AiChatMessage[]> {
    return await db.select().from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(asc(aiChatMessages.createdAt));
  }

  async updateSessionTitle(sessionId: number, title: string): Promise<void> {
    await db.update(chatSessions)
      .set({ title, updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));
  }

  async deleteSession(sessionId: number): Promise<void> {
    await db.delete(chatSessions).where(eq(chatSessions.id, sessionId));
  }

  async getAiHistory(userId: string): Promise<any[]> {
    return await db.select().from(aiChatMessages)
      .where(eq(aiChatMessages.userId, userId))
      .orderBy(desc(aiChatMessages.createdAt));
  }

  async saveAiMessage(message: any): Promise<any> {
    const [saved] = await db.insert(aiChatMessages).values(message).returning();
    // Bump session updatedAt
    if (message.sessionId) {
      await db.update(chatSessions)
        .set({ updatedAt: new Date() })
        .where(eq(chatSessions.id, message.sessionId));
    }
    return saved;
  }

  async saveBodyFatScan(scan: InsertBodyFatScan): Promise<BodyFatScan> {
    const [saved] = await db.insert(bodyFatScans).values(scan as any).returning();
    return saved;
  }

  async getBodyFatScans(userId: string): Promise<BodyFatScan[]> {
    return await db.select().from(bodyFatScans)
      .where(eq(bodyFatScans.userId, userId))
      .orderBy(desc(bodyFatScans.createdAt));
  }

  async getActiveTimer(userId: string): Promise<ProgressTimer | undefined> {
    const [timer] = await db.select().from(progressTimers)
      .where(and(eq(progressTimers.userId, userId), eq(progressTimers.isActive, true)))
      .orderBy(desc(progressTimers.createdAt))
      .limit(1);
    return timer;
  }

  async createTimer(userId: string, endTime: Date, startLevel: number): Promise<ProgressTimer> {
    // Cancel any existing active timer first
    await db.update(progressTimers)
      .set({ isActive: false })
      .where(and(eq(progressTimers.userId, userId), eq(progressTimers.isActive, true)));

    const [timer] = await db.insert(progressTimers).values({
      userId,
      startTime: new Date(),
      endTime,
      startLevel,
      isActive: true,
      wasTriggered: false,
    }).returning();
    return timer;
  }

  async cancelTimer(userId: string): Promise<void> {
    await db.update(progressTimers)
      .set({ isActive: false })
      .where(and(eq(progressTimers.userId, userId), eq(progressTimers.isActive, true)));
  }

  async triggerTimer(userId: string): Promise<void> {
    // Mark triggered, deactivate
    await db.update(progressTimers)
      .set({ isActive: false, wasTriggered: true })
      .where(and(eq(progressTimers.userId, userId), eq(progressTimers.isActive, true)));

    // Reset ALL user progress
    await db.update(userStats)
      .set({ level: 1, xp: 0, points: 0, streak: 0 })
      .where(eq(userStats.userId, userId));
  }

  async getUnlockedAchievements(userId: string): Promise<UserAchievement[]> {
    return await db.select().from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement> {
    const [record] = await db.insert(userAchievements)
      .values({ userId, achievementId })
      .returning();
    return record;
  }

  async getWishlistItems(userId: string): Promise<WishlistItem[]> {
    return await db.select().from(wishlistItems)
      .where(eq(wishlistItems.userId, userId))
      .orderBy(desc(wishlistItems.addedAt));
  }

  async createWishlistItem(item: InsertWishlistItem): Promise<WishlistItem> {
    const [record] = await db.insert(wishlistItems)
      .values(item as any)
      .returning();
    return record;
  }

  async deleteWishlistItem(id: number): Promise<void> {
    await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
  }
}

export const storage = new DatabaseStorage();
