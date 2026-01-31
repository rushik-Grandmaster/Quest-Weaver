import { db } from "./db";
import {
  users, userStats, tasks, shopItems, inventory, scheduleItems, diaryEntries,
  aiChatMessages, conversations, messages,
  type UserStats, type Task, type ShopItem, type InventoryItem, type ScheduleItem, type DiaryEntry,
  type InsertTask, type InsertShopItem, type InsertScheduleItem, type InsertDiaryEntry, type InsertUserStats
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";

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
  
  // Shop deletion
  deleteShopItem(id: number): Promise<void>;

  // AI Chat
  getAiHistory(userId: string): Promise<any[]>;
  saveAiMessage(message: any): Promise<any>;
  saveBodyFatScan(scan: any): Promise<any>;
  getBodyFatScans(userId: string): Promise<BodyFatScan[]>;
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
    const [newTask] = await db.insert(tasks).values([task]).returning();
    return newTask;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const [updated] = await db.update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return updated;
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
    const [newItem] = await db.insert(scheduleItems).values([item]).returning();
    return newItem;
  }

  async updateScheduleItem(id: number, updates: Partial<ScheduleItem>): Promise<ScheduleItem> {
    const [updated] = await db.update(scheduleItems)
      .set(updates)
      .where(eq(scheduleItems.id, id))
      .returning();
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getShopItems(userId: string): Promise<ShopItem[]> {
    // Get system items (userId is null) AND user custom items
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

  // Luminous AI
  async getAiHistory(userId: string): Promise<any[]> {
    return await db.select().from(aiChatMessages)
      .where(eq(aiChatMessages.userId, userId))
      .orderBy(desc(aiChatMessages.createdAt));
  }

  async saveAiMessage(message: any): Promise<any> {
    const [saved] = await db.insert(aiChatMessages).values(message).returning();
    return saved;
  }

  async saveBodyFatScan(scan: any): Promise<any> {
    const [saved] = await db.insert(bodyFatScans).values(scan).returning();
    return saved;
  }

  async getBodyFatScans(userId: string): Promise<BodyFatScan[]> {
    return await db.select().from(bodyFatScans)
      .where(eq(bodyFatScans.userId, userId))
      .orderBy(desc(bodyFatScans.createdAt));
  }
}

export const storage = new DatabaseStorage();
