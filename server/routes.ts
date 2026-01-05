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

  app.delete("/api/tasks/:id", requireAuth, async (req: any, res) => {
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
      if (!text) return res.status(400).send("Text is required");
      
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: text,
      });
      
      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("Cache-Control", "no-cache");
      res.send(buffer);
    } catch (err) {
      console.error("TTS error:", err);
      res.status(500).send("TTS failed: " + (err instanceof Error ? err.message : String(err)));
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
          response_format: "b64_json"
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

      const tools = [
        {
          type: "function",
          function: {
            name: "create_task",
            description: "Create a new quest or task for the user",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "The title of the task" },
                category: { type: "string", enum: ["daily", "one_time", "habit"], description: "The type of task" },
                difficulty: { type: "string", enum: ["easy", "medium", "hard"], description: "How difficult the task is" },
                rewardXp: { type: "number", description: "XP reward (default 10)" },
                rewardPoints: { type: "number", description: "Point reward (default 5)" }
              },
              required: ["title", "category"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "delete_task",
            description: "Remove a task by its ID",
            parameters: {
              type: "object",
              properties: {
                taskId: { type: "number", description: "The ID of the task to delete" }
              },
              required: ["taskId"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "create_shop_item",
            description: "Create a new item in the user's custom shop",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Name of the item" },
                description: { type: "string", description: "What the item does" },
                cost: { type: "number", description: "How many points it costs" },
                icon: { type: "string", description: "Lucide icon name (e.g., 'gift', 'sword', 'shield')" }
              },
              required: ["name", "description", "cost"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "delete_shop_item",
            description: "Remove an item from the shop by its ID",
            parameters: {
              type: "object",
              properties: {
                itemId: { type: "number", description: "The ID of the item to delete" }
              },
              required: ["itemId"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "create_schedule_item",
            description: "Schedule a task or event in the user's planner",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "What the event is" },
                startTime: { type: "string", description: "ISO 8601 date string" },
                endTime: { type: "string", description: "ISO 8601 date string" },
                description: { type: "string", description: "Optional details" }
              },
              required: ["title", "startTime", "endTime"]
            }
          }
        }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are Luminous, an advanced AI life coach. You help users manage their life as an RPG. You have access to tools to manage their tasks (quests), shop, and schedule. Always refer to the user as Rushik Sama. When a user asks you to add or remove items, quests, or schedule events, use the appropriate tool. Always confirm the action in your response. For scheduling, ensure you use ISO 8601 date strings for startTime and endTime." },
          ...chatHistory,
          { role: "user", content: message }
        ],
        tools: tools as any,
        tool_choice: "auto",
        max_completion_tokens: 2048,
      });

      const responseMessage = completion.choices[0].message;

      if (responseMessage.tool_calls) {
        const toolResults = [];
        for (const toolCall of responseMessage.tool_calls) {
          const tc = toolCall as any;
          const args = JSON.parse(tc.function.arguments);
          let result = "Success";
          
          try {
            if (tc.function.name === "create_task") {
              await storage.createTask({ ...args, userId });
            } else if (tc.function.name === "delete_task") {
              await storage.deleteTask(args.taskId);
            } else if (tc.function.name === "create_shop_item") {
              await storage.createShopItem({ ...args, userId, category: "custom" });
            } else if (tc.function.name === "delete_shop_item") {
              await storage.deleteShopItem(args.itemId);
            } else if (tc.function.name === "create_schedule_item") {
              await storage.createScheduleItem({ ...args, userId, startTime: new Date(args.startTime), endTime: new Date(args.endTime) });
            }
          } catch (error) {
            console.error(`Tool execution error (${tc.function.name}):`, error);
            result = `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
          
          toolResults.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: result
          });
        }

        const finalCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "The tools have been executed. Confirm to the user that their request has been completed or explain any errors." },
            ...chatHistory,
            { role: "user", content: message },
            responseMessage as any,
            ...toolResults as any
          ]
        });

        const aiContent = finalCompletion.choices[0].message.content || "I've processed your request.";
        await storage.saveAiMessage({ userId, role: "assistant", content: aiContent, type: "text" });
        return res.json({ message: aiContent, type: "text" });
      }

      const aiContent = responseMessage.content || "I'm sorry, I couldn't process that.";
      await storage.saveAiMessage({ userId, role: "assistant", content: aiContent, type: "text" });
      res.json({ message: aiContent, type: "text" });
    } catch (err) {
      console.error("AI Chat error:", err);
      res.status(500).json({ message: "Failed to get AI response" });
    }
  });

  app.post("/api/ai/body-fat", requireAuth, async (req: any, res) => {
    try {
      const { image, height, weight } = req.body;
      if (!image || !height || !weight) {
        return res.status(400).json({ message: "Image, height, and weight are required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional fitness and body composition expert. Analyze the provided photo along with height and weight to estimate body fat percentage. Return ONLY a JSON object with 'bodyFat' (number) and 'analysis' (string)."
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Height: ${height}cm, Weight: ${weight}kg. Estimate body fat.` },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      const scan = await storage.saveBodyFatScan({
        userId: req.user.claims.sub,
        imageUrl: image,
        height: parseInt(height),
        weight: parseInt(weight),
        estimatedBodyFat: result.bodyFat
      });

      res.json({ ...result, id: scan.id });
    } catch (err) {
      console.error("Body fat analysis error:", err);
      res.status(500).json({ message: "Analysis failed" });
    }
  });

  return httpServer;
}

async function seedDatabase() {}
