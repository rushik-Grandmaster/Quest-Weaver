export * from "./models/auth";
import { pgTable, text, serial, integer, boolean, timestamp, varchar, real } from "drizzle-orm/pg-core";
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
  trustScore: integer("trust_score").default(100).notNull(), // Hidden anti-cheat metric (0-100)
});

// Silent audit log for task completions (anti-cheat behavioral tracking)
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  taskId: integer("task_id").notNull(),
  taskCreatedAt: timestamp("task_created_at").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  timeDeltaMs: integer("time_delta_ms").notNull(), // ms between create and complete
  rewardXp: integer("reward_xp").notNull(),
  rewardPoints: integer("reward_points").notNull(),
  appliedXp: integer("applied_xp").notNull(),    // actual XP after trust multiplier
  appliedPoints: integer("applied_points").notNull(),
  trustScoreAtCompletion: integer("trust_score_at_completion").notNull(),
  flagged: boolean("flagged").default(false).notNull(),
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
  lastCompletedAt: timestamp("last_completed_at"),
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
  url: text("url"),                         // launch URL for screen-time rewards
  durationMinutes: integer("duration_minutes"), // session timer (null = no timer)
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

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: text("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
});

export const progressTimers = pgTable("progress_timers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  startLevel: integer("start_level").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  wasTriggered: boolean("was_triggered").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull().default("New Conversation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionId: integer("session_id").references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user', 'assistant'
  content: text("content").notNull(),
  type: text("type").default("text"), // 'text', 'image_url'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, { fields: [chatSessions.userId], references: [users.id] }),
  messages: many(aiChatMessages),
}));

export const aiChatMessagesRelations = relations(aiChatMessages, ({ one }) => ({
  user: one(users, {
    fields: [aiChatMessages.userId],
    references: [users.id],
  }),
  session: one(chatSessions, {
    fields: [aiChatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, { fields: [userAchievements.userId], references: [users.id] }),
}));

export const progressTimersRelations = relations(progressTimers, ({ one }) => ({
  user: one(users, { fields: [progressTimers.userId], references: [users.id] }),
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

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  price: text("price"),
  imageUrl: text("image_url"),
  productUrl: text("product_url").notNull(),
  asin: text("asin"),
  category: text("category").default("other").notNull(),
  notes: text("notes"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({ id: true, addedAt: true }).extend({
  userId: z.string().optional(),
  category: z.enum(["electronics","clothing","books","fitness","gaming","home","food","beauty","other"]).default("other"),
});

// Reward sessions — active screen-time countdown timers created on shop purchase
export const rewardSessions = pgTable("reward_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  shopItemId: integer("shop_item_id").references(() => shopItems.id, { onDelete: "set null" }),
  itemName: text("item_name").notNull(),
  itemUrl: text("item_url"),
  minutesTotal: integer("minutes_total").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rewardSessionsRelations = relations(rewardSessions, ({ one }) => ({
  user: one(users, { fields: [rewardSessions.userId], references: [users.id] }),
  shopItem: one(shopItems, { fields: [rewardSessions.shopItemId], references: [shopItems.id] }),
}));

// Vault password — gates access to private sections (diary + physique) per-user
export const vaultLocks = pgTable("vault_locks", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  passwordHash: text("password_hash").notNull(), // "salt:hash" (scrypt)
  hint: text("hint"),                            // optional, max 80 chars
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Private physique tracking (owner-only)
export const physiqueEntries = pgTable("physique_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  photoUrl: text("photo_url").notNull(),       // base64 data URL
  weight: real("weight"),                       // kg
  bodyFat: real("body_fat"),                    // percent
  pose: text("pose").default("front").notNull(),// 'front' | 'side' | 'back' | 'flex' | 'other'
  notes: text("notes"),
  photoDate: timestamp("photo_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPhysiqueEntrySchema = createInsertSchema(physiqueEntries).omit({
  id: true, userId: true, createdAt: true,
}).extend({
  photoDate: z.coerce.date().optional(),
  pose: z.enum(["front","side","back","flex","other"]).default("front"),
  weight: z.number().positive().max(500).optional().nullable(),
  bodyFat: z.number().min(0).max(80).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// Meal entries — calorie and macro tracker
export const mealEntries = pgTable("meal_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  mealType: text("meal_type").notNull().default("snack"), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: integer("calories").notNull(),
  protein: real("protein"),   // grams
  carbs: real("carbs"),       // grams
  fat: real("fat"),           // grams
  fiber: real("fiber"),       // grams
  notes: text("notes"),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mealEntriesRelations = relations(mealEntries, ({ one }) => ({
  user: one(users, { fields: [mealEntries.userId], references: [users.id] }),
}));

export const insertMealEntrySchema = createInsertSchema(mealEntries).omit({ id: true, createdAt: true }).extend({
  userId: z.string().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).default("snack"),
  calories: z.number().int().min(0).max(99999),
  protein: z.number().min(0).max(9999).optional().nullable(),
  carbs: z.number().min(0).max(9999).optional().nullable(),
  fat: z.number().min(0).max(9999).optional().nullable(),
  fiber: z.number().min(0).max(9999).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  loggedAt: z.coerce.date().optional(),
});

// === RELATIONS ===
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

// === TYPES ===
export type UserStats = typeof userStats.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ShopItem = typeof shopItems.$inferSelect;
export type InventoryItem = typeof inventory.$inferSelect;
export type ScheduleItem = typeof scheduleItems.$inferSelect;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type BodyFatScan = typeof bodyFatScans.$inferSelect;
export type ProgressTimer = typeof progressTimers.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type PhysiqueEntry = typeof physiqueEntries.$inferSelect;
export type VaultLock = typeof vaultLocks.$inferSelect;
export type RewardSession = typeof rewardSessions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

export const insertRewardSessionSchema = createInsertSchema(rewardSessions).omit({ id: true, createdAt: true });
export type InsertRewardSession = z.infer<typeof insertRewardSessionSchema>;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
export type InsertScheduleItem = z.infer<typeof insertScheduleItemSchema>;
export type InsertDiaryEntry = z.infer<typeof insertDiaryEntrySchema>;
export type InsertBodyFatScan = z.infer<typeof insertBodyFatScanSchema>;
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type InsertPhysiqueEntry = z.infer<typeof insertPhysiqueEntrySchema>;
export type MealEntry = typeof mealEntries.$inferSelect;
export type InsertMealEntry = z.infer<typeof insertMealEntrySchema>;
