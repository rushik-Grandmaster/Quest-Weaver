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

// === RELATIONS ===
export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
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

// === ZOD SCHEMAS ===
export const insertUserStatsSchema = createInsertSchema(userStats);
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, userId: true });
export const insertShopItemSchema = createInsertSchema(shopItems).omit({ id: true, userId: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, acquiredAt: true, userId: true });
export const insertScheduleItemSchema = createInsertSchema(scheduleItems).omit({ id: true, userId: true });

// === TYPES ===
export type UserStats = typeof userStats.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ShopItem = typeof shopItems.$inferSelect;
export type InventoryItem = typeof inventory.$inferSelect;
export type ScheduleItem = typeof scheduleItems.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
export type InsertScheduleItem = z.infer<typeof insertScheduleItemSchema>;
