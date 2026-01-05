export * from "./models/auth";
import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const userStats = pgTable("user_stats", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  level: integer("level").default(1).notNull(),
  xp: integer("xp").default(0).notNull(),
  points: integer("points").default(0).notNull(),
  streak: integer("streak").default(0).notNull(),
  lastLoginDate: timestamp("last_login_date"),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'daily', 'one_time', 'habit'
  difficulty: text("difficulty").default("easy").notNull(), // 'easy', 'medium', 'hard'
  isCompleted: boolean("is_completed").default(false).notNull(),
  rewardXp: integer("reward_xp").default(10).notNull(),
  rewardPoints: integer("reward_points").default(5).notNull(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shopItems = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id), // Null for system items
  name: text("name").notNull(),
  description: text("description").notNull(),
  cost: integer("cost").notNull(),
  category: text("category").default("general").notNull(), // 'custom', 'system'
  icon: text("icon").default("gift"),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  itemId: integer("item_id").notNull().references(() => shopItems.id),
  acquiredAt: timestamp("acquired_at").defaultNow().notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  usedAt: timestamp("used_at"),
});

export const scheduleItems = pgTable("schedule_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
});

export const diaryEntries = pgTable("diary_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  mood: text("mood").default("neutral"), // 'happy', 'sad', 'angry', 'neutral', 'excited'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bodyFatScans = pgTable("body_fat_scans", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(),
  height: integer("height").notNull(), // in cm
  weight: integer("weight").notNull(), // in kg
  estimatedBodyFat: integer("estimated_body_fat").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === RELATIONS ===
export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}));

export const bodyFatScansRelations = relations(bodyFatScans, ({ one }) => ({
  user: one(users, {
    fields: [bodyFatScans.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

export const shopItemsRelations = relations(shopItems, ({ one }) => ({
  user: one(users, {
    fields: [shopItems.userId],
    references: [users.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  user: one(users, {
    fields: [inventory.userId],
    references: [users.id],
  }),
  item: one(shopItems, {
    fields: [inventory.itemId],
    references: [shopItems.id],
  }),
}));

export const scheduleItemsRelations = relations(scheduleItems, ({ one }) => ({
  user: one(users, {
    fields: [scheduleItems.userId],
    references: [users.id],
  }),
}));

export const diaryEntriesRelations = relations(diaryEntries, ({ one }) => ({
  user: one(users, {
    fields: [diaryEntries.userId],
    references: [users.id],
  }),
}));

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull(), // 'user', 'assistant'
  content: text("content").notNull(),
  type: text("type").default("text"), // 'text', 'image_url'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiChatMessagesRelations = relations(aiChatMessages, ({ one }) => ({
  user: one(users, {
    fields: [aiChatMessages.userId],
    references: [users.id],
  }),
}));

// === ZOD SCHEMAS ===
export const insertUserStatsSchema = createInsertSchema(userStats);
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true }).extend({
  userId: z.string().optional() // Made optional since server will provide it
});
export const insertShopItemSchema = createInsertSchema(shopItems).omit({ id: true }).extend({
  userId: z.string().optional() // Made optional since server will provide it
});
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, acquiredAt: true }).extend({
  userId: z.string().optional()
});
export const insertScheduleItemSchema = createInsertSchema(scheduleItems).omit({ id: true }).extend({
  userId: z.string().optional(), // Made optional since server will provide it
  startTime: z.coerce.date(), // Coerce string from datetime-local to Date
  endTime: z.coerce.date() // Coerce string from datetime-local to Date
});

export const insertDiaryEntrySchema = createInsertSchema(diaryEntries).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  userId: z.string().optional(), // Made optional since server will provide it
  mood: z.enum(['happy', 'sad', 'angry', 'neutral', 'excited']).default('neutral'),
});

export const insertBodyFatScanSchema = createInsertSchema(bodyFatScans).omit({ id: true, createdAt: true }).extend({
  userId: z.string().optional(),
});

// === TYPES ===
export type UserStats = typeof userStats.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ShopItem = typeof shopItems.$inferSelect;
export type InventoryItem = typeof inventory.$inferSelect;
export type ScheduleItem = typeof scheduleItems.$inferSelect;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type BodyFatScan = typeof bodyFatScans.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
export type InsertScheduleItem = z.infer<typeof insertScheduleItemSchema>;
export type InsertDiaryEntry = z.infer<typeof insertDiaryEntrySchema>;
export type InsertBodyFatScan = z.infer<typeof insertBodyFatScanSchema>;
