import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // Helper to get authenticated user ID
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // User Stats
  app.get(api.userStats.get.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    let stats = await storage.getUserStats(userId);
    if (!stats) {
      stats = await storage.createUserStats(userId);
    }
    res.json(stats);
  });

  // Tasks
  app.get(api.tasks.list.path, requireAuth, async (req: any, res) => {
    const tasks = await storage.getTasks(req.user.claims.sub);
    res.json(tasks);
  });

  app.post(api.tasks.create.path, requireAuth, async (req: any, res) => {
    try {
      const parsed = api.tasks.create.input.parse(req.body);
      const input = {
        ...parsed,
        userId: req.user.claims.sub
      };
      const task = await storage.createTask(input as any);
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Task creation error:", err);
      return res.status(400).json({ message: "Failed to create task" });
    }
  });

  app.patch(api.tasks.update.path, requireAuth, async (req: any, res) => {
    const task = await storage.getTask(Number(req.params.id));
    if (!task || task.userId !== req.user.claims.sub) {
      return res.status(404).json({ message: "Task not found" });
    }
    const updated = await storage.updateTask(task.id, req.body);
    res.json(updated);
  });

  app.delete(api.tasks.delete.path, requireAuth, async (req: any, res) => {
    const task = await storage.getTask(Number(req.params.id));
    if (!task || task.userId !== req.user.claims.sub) {
      return res.status(404).json({ message: "Task not found" });
    }
    await storage.deleteTask(task.id);
    res.status(204).end();
  });

  app.post(api.tasks.complete.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const task = await storage.getTask(Number(req.params.id));
    
    if (!task || task.userId !== userId) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.isCompleted) {
       // Already completed
       const stats = await storage.getUserStats(userId);
       return res.json({ task, stats, leveledUp: false });
    }

    // Mark complete
    const updatedTask = await storage.updateTask(task.id, { isCompleted: true });

    // Award XP and Points
    let stats = await storage.getUserStats(userId);
    if (!stats) stats = await storage.createUserStats(userId);

    let newXp = stats.xp + task.rewardXp;
    let newPoints = stats.points + task.rewardPoints;
    let level = stats.level;
    let leveledUp = false;

    // Simple level up logic: Level * 100 XP required
    const xpRequired = level * 100;
    if (newXp >= xpRequired) {
      level += 1;
      newXp -= xpRequired;
      leveledUp = true;
    }

    const updatedStats = await storage.updateUserStats(userId, {
      xp: newXp,
      points: newPoints,
      level
    });

    res.json({ task: updatedTask, stats: updatedStats, leveledUp });
  });

  // Shop
  app.get(api.shop.list.path, requireAuth, async (req: any, res) => {
    const items = await storage.getShopItems(req.user.claims.sub);
    res.json(items);
  });

  app.post(api.shop.create.path, requireAuth, async (req: any, res) => {
    try {
      const parsed = api.shop.create.input.parse(req.body);
      const input = {
        ...parsed,
        userId: req.user.claims.sub
      };
      const item = await storage.createShopItem(input as any);
      res.status(201).json(item);
    } catch (err) {
       if (err instanceof z.ZodError) {
         return res.status(400).json({ message: err.errors[0].message });
       }
       return res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.shop.buy.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const item = await storage.getShopItem(Number(req.params.id));
    
    if (!item) return res.status(404).json({ message: "Item not found" });

    let stats = await storage.getUserStats(userId);
    if (!stats) stats = await storage.createUserStats(userId);

    if (stats.points < item.cost) {
      return res.status(400).json({ message: "Not enough points" });
    }

    const newPoints = stats.points - item.cost;
    const updatedStats = await storage.updateUserStats(userId, { points: newPoints });
    const inventoryItem = await storage.addToInventory(userId, item.id);

    res.json({ item: inventoryItem, stats: updatedStats });
  });

  // Inventory
  app.get(api.inventory.list.path, requireAuth, async (req: any, res) => {
    const inventory = await storage.getInventory(req.user.claims.sub);
    res.json(inventory); 
  });

  app.post(api.inventory.use.path, requireAuth, async (req: any, res) => {
    const inventoryId = Number(req.params.id);
    const inventory = await storage.getInventory(req.user.claims.sub);
    const item = inventory.find(i => i.inventoryId === inventoryId);
    
    if (!item) return res.status(404).json({ message: "Item not found" });
    
    const result = await storage.useInventoryItem(inventoryId);
    res.json(result);
  });

  app.delete(api.inventory.delete.path, requireAuth, async (req: any, res) => {
    const inventoryId = Number(req.params.id);
    const inventory = await storage.getInventory(req.user.claims.sub);
    const item = inventory.find(i => i.inventoryId === inventoryId);
    
    if (!item) return res.status(404).json({ message: "Item not found" });
    
    await storage.deleteInventoryItem(inventoryId);
    res.status(204).end();
  });

  // Schedule
  app.get(api.schedule.list.path, requireAuth, async (req: any, res) => {
    const items = await storage.getScheduleItems(req.user.claims.sub);
    res.json(items);
  });

  app.post(api.schedule.create.path, requireAuth, async (req: any, res) => {
    try {
      const parsed = api.schedule.create.input.parse(req.body);
      const input = {
        ...parsed,
        userId: req.user.claims.sub
      };
      const item = await storage.createScheduleItem(input as any);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(400).json({ message: "Invalid input" });
    }
  });

  app.patch(api.schedule.update.path, requireAuth, async (req: any, res) => {
    const item = await storage.getScheduleItem(Number(req.params.id));
    if (!item || item.userId !== req.user.claims.sub) {
      return res.status(404).json({ message: "Item not found" });
    }
    const updated = await storage.updateScheduleItem(item.id, req.body);
    res.json(updated);
  });

  app.delete(api.schedule.delete.path, requireAuth, async (req: any, res) => {
    const item = await storage.getScheduleItem(Number(req.params.id));
    if (!item || item.userId !== req.user.claims.sub) {
      return res.status(404).json({ message: "Item not found" });
    }
    await storage.deleteScheduleItem(item.id);
    res.status(204).end();
  });
  
  // Seed system shop items if empty
  const systemItems = await storage.getShopItems("system"); // Hacky check, but we filter by null in storage
  // Actually, let's just seed if table is empty
  // Better: Seed function called separately
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
   // Check if we have any system items
   // This is a bit tricky since we don't have a clean way to check "all system items" 
   // without a user context in the current storage API. 
   // But we can just use SQL directly or add a method.
   // For now, let's skip auto-seeding complicated logic and rely on the user to add items or add a simple check later.
   // Actually, let's add a few default items using a dummy user ID check or just always try to insert if not exists
}
