import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth setup
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Register AI Integrations
  registerChatRoutes(app);
  registerImageRoutes(app);

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

  // Diary
  app.get(api.diary.list.path, requireAuth, async (req: any, res) => {
    const entries = await storage.getDiaryEntries(req.user.claims.sub);
    res.json(entries);
  });

  app.post(api.diary.create.path, requireAuth, async (req: any, res) => {
    try {
      const parsed = api.diary.create.input.parse(req.body);
      const input = {
        ...parsed,
        userId: req.user.claims.sub
      };
      const entry = await storage.createDiaryEntry(input as any);
      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(400).json({ message: "Failed to create entry" });
    }
  });

  app.patch(api.diary.update.path, requireAuth, async (req: any, res) => {
    const entry = await storage.getDiaryEntry(Number(req.params.id));
    if (!entry || entry.userId !== req.user.claims.sub) {
      return res.status(404).json({ message: "Entry not found" });
    }
    const updated = await storage.updateDiaryEntry(entry.id, req.body);
    res.json(updated);
  });

  app.delete(api.diary.delete.path, requireAuth, async (req: any, res) => {
    const entry = await storage.getDiaryEntry(Number(req.params.id));
    if (!entry || entry.userId !== req.user.claims.sub) {
      return res.status(404).json({ message: "Entry not found" });
    }
    await storage.deleteDiaryEntry(entry.id);
    res.status(204).end();
  });

  // Luminous AI
  app.get(api.ai.history.path, requireAuth, async (req: any, res) => {
    const history = await storage.getAiHistory(req.user.claims.sub);
    res.json(history);
  });

  app.post("/api/ai/tts", requireAuth, async (req: any, res) => {
    try {
      const { text } = req.body;
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.set("Content-Type", "audio/mpeg");
      res.send(buffer);
    } catch (err) {
      console.error("TTS error:", err);
      res.status(500).send("TTS failed");
    }
  });

  app.post(api.ai.chat.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { message, history = [] } = req.body;

    try {
      // Save user message
      await storage.saveAiMessage({
        userId,
        role: "user",
        content: message,
        type: "text"
      });

      // Simple keyword detection for image generation
      if (message.toLowerCase().includes("generate image") || message.toLowerCase().includes("draw")) {
        const response = await openai.images.generate({
          model: "gpt-image-1",
          prompt: message,
          size: "512x512",
        });

        const imageUrl = `data:image/png;base64,${response.data[0].b64_json}`;
        const aiMessage = {
          userId,
          role: "assistant",
          content: "I've generated this image for you.",
          type: "image",
        };
        
        await storage.saveAiMessage({ ...aiMessage, content: imageUrl, type: "image_url" });
        return res.json({ message: aiMessage.content, type: "image", data: imageUrl });
      }

      // Default Chat response
      const chatHistory = history.map((m: any) => ({
        role: m.role,
        content: m.content
      }));

      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: "You are Luminous, a helpful AI life coach and assistant for the LifeRPG app. You help users with productivity, calorie tracking, math, and personal growth. Be supportive and encouraging." },
          ...chatHistory,
          { role: "user", content: message }
        ],
        max_completion_tokens: 1024,
      });

      const aiContent = completion.choices[0].message.content || "I'm sorry, I couldn't process that.";
      
      // Save AI message
      await storage.saveAiMessage({
        userId,
        role: "assistant",
        content: aiContent,
        type: "text"
      });

      res.json({ message: aiContent, type: "text" });
    } catch (err) {
      console.error("AI Chat error:", err);
      res.status(500).json({ message: "Failed to get AI response" });
    }
  });

  return httpServer;
}

async function seedDatabase() {}
