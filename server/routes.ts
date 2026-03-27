import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { checkAndAwardAchievements } from "./checkAchievements";
import { ACHIEVEMENTS } from "@shared/achievements";
import { applyXp, getRank, xpForLevel } from "@shared/levels";
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

  // Tasks — daily/habit tasks auto-reset each day
  app.get(api.tasks.list.path, requireAuth, async (req: any, res) => {
    const tasks = await storage.getTasks(req.user.claims.sub);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const result = tasks.map(t => {
      if (t.category === "one_time") return t;
      // For daily/habit tasks: treat as incomplete if not completed today
      const completedToday = t.lastCompletedAt && new Date(t.lastCompletedAt) >= todayStart;
      return { ...t, isCompleted: !!completedToday };
    });
    res.json(result);
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

    // Check if already completed today (for daily/habit) or permanently (for one_time)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const alreadyDoneToday = task.lastCompletedAt && new Date(task.lastCompletedAt) >= todayStart;
    if (task.category === "one_time" ? task.isCompleted : alreadyDoneToday) {
      const stats = await storage.getUserStats(userId);
      return res.json({ task, stats, leveledUp: false });
    }

    // Mark complete — daily/habit tasks only update lastCompletedAt (not isCompleted)
    const taskUpdates: Record<string, any> = { lastCompletedAt: new Date() };
    if (task.category === "one_time") taskUpdates.isCompleted = true;
    const updatedTask = await storage.updateTask(task.id, taskUpdates);

    // Award XP and Points using shared applyXp (handles multi-level-up)
    let stats = await storage.getUserStats(userId);
    if (!stats) stats = await storage.createUserStats(userId);

    const { level, xp, leveledUp } = applyXp(stats.level, stats.xp, task.rewardXp);
    const newPoints = stats.points + task.rewardPoints;

    const updatedStats = await storage.updateUserStats(userId, { xp, points: newPoints, level });

    // Check achievements
    const newAchievements = await checkAndAwardAchievements(userId, {
      type: leveledUp ? "level_up" : "task_complete",
      newLevel: level,
      taskDifficulty: task.difficulty,
    });

    res.json({ task: updatedTask, stats: updatedStats, leveledUp, newAchievements });
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

    // Check shop achievements
    const newAchievements = await checkAndAwardAchievements(userId, { type: "shop_purchase" });

    res.json({ item: inventoryItem, stats: updatedStats, newAchievements });
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
      // Check diary achievements
      const newAchievements = await checkAndAwardAchievements(req.user.claims.sub, { type: "diary_entry" });
      res.status(201).json({ ...entry, newAchievements });
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

  // ── Chat Session Routes ──
  app.post("/api/ai/sessions", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { title = "New Conversation" } = req.body;
    try {
      const session = await storage.createChatSession(userId, title);
      res.json(session);
    } catch (err) {
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.get("/api/ai/sessions", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    try {
      const sessions = await storage.getChatSessions(userId);
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.get("/api/ai/sessions/:id/messages", requireAuth, async (req: any, res) => {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) return res.status(400).json({ message: "Invalid session id" });
    try {
      const msgs = await storage.getSessionMessages(sessionId);
      res.json(msgs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.delete("/api/ai/sessions/:id", requireAuth, async (req: any, res) => {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) return res.status(400).json({ message: "Invalid session id" });
    try {
      await storage.deleteSession(sessionId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  app.post(api.ai.chat.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { message, history = [], sessionId } = req.body;

    try {
      // Save user message
      await storage.saveAiMessage({
        userId,
        role: "user",
        content: message,
        type: "text",
        sessionId: sessionId ?? null,
      });

      // Auto-title session from first message
      if (sessionId && message.length > 0) {
        const existingMsgs = await storage.getSessionMessages(sessionId);
        if (existingMsgs.length === 1) {
          const shortTitle = message.slice(0, 60) + (message.length > 60 ? "…" : "");
          await storage.updateSessionTitle(sessionId, shortTitle);
        }
      }

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

      // Default Chat response — load persistent memory from DB when session exists
      let chatHistory: { role: string; content: string }[];
      if (sessionId) {
        const dbMessages = await storage.getSessionMessages(sessionId);
        // Use last 30 messages (excluding the one we just saved) as full history
        chatHistory = dbMessages.slice(-31, -1).map(m => ({ role: m.role, content: m.content }));
      } else {
        chatHistory = history.map((m: any) => ({ role: m.role, content: m.content }));
      }

      // ── Fetch all player data for Luminous context ──
      const [playerStats, allTasks, inventoryItems, unlockedAchievements, diaryEntries, scheduleItems, bodyFatScans] = await Promise.all([
        storage.getUserStats(userId),
        storage.getTasks(userId),
        storage.getInventory(userId),
        storage.getUnlockedAchievements(userId),
        storage.getDiaryEntries(userId),
        storage.getScheduleItems(userId),
        storage.getBodyFatScans(userId),
      ]);

      const completedTasks = allTasks.filter(t => t.isCompleted);
      const pendingTasks   = allTasks.filter(t => !t.isCompleted);
      const usedItems      = inventoryItems.filter(i => i.isUsed);
      const ownedItems     = inventoryItems.filter(i => !i.isUsed);

      const currentLevel = playerStats?.level ?? 1;
      const currentRank = getRank(currentLevel);
      const xpForNext = xpForLevel(currentLevel);

      const playerContext = `
═══════════════════════════════════════
RUSHIK SAMA'S PLAYER DATA (Live)
═══════════════════════════════════════

STATS:
- Rank: ${currentRank} | Level: ${currentLevel}
- XP: ${playerStats?.xp ?? 0} / ${xpForNext} (next level)
- Gold: ${playerStats?.points ?? 0}
- Login Streak: ${playerStats?.streak ?? 0} days

QUESTS:
- Total quests: ${allTasks.length}
- Completed: ${completedTasks.length} (${completedTasks.map(t => `"${t.title}" [${t.category}, ${t.difficulty}]`).join(", ") || "none"})
- Pending: ${pendingTasks.length} (${pendingTasks.map(t => `"${t.title}" [${t.category}, ${t.difficulty}]`).join(", ") || "none"})

INVENTORY:
- Items owned (unused): ${ownedItems.length > 0 ? ownedItems.map(i => `"${i.item.name}"`).join(", ") : "none"}
- Items used: ${usedItems.length > 0 ? usedItems.map(i => `"${i.item.name}" (used ${i.usedAt ? new Date(i.usedAt).toLocaleDateString() : "recently"})`).join(", ") : "none"}

ACHIEVEMENTS UNLOCKED (${unlockedAchievements.length}):
${unlockedAchievements.length > 0 ? unlockedAchievements.map(a => `- ${a.achievementId}`).join("\n") : "- None yet"}

RECENT DIARY ENTRIES (last 3):
${diaryEntries.slice(0, 3).map(e => `- ${new Date(e.createdAt).toLocaleDateString()}: "${e.title}" (mood: ${e.mood ?? "not set"})`).join("\n") || "- No diary entries yet"}

UPCOMING SCHEDULE (next 5):
${scheduleItems.slice(0, 5).map(s => `- ${new Date(s.startTime).toLocaleDateString()} ${new Date(s.startTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}: "${s.title}"`).join("\n") || "- No scheduled events"}

BODY SCANS (last 3):
${bodyFatScans.slice(0, 3).map(s => `- ${new Date(s.createdAt).toLocaleDateString()}: ${s.estimatedBodyFat}% body fat (${s.height}cm, ${s.weight}kg)`).join("\n") || "- No scans yet"}

═══════════════════════════════════════
Use this data to give highly personalized advice, celebrate progress, and help Rushik Sama level up in real life.
═══════════════════════════════════════`;

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
          { role: "system", content: `You are Luminous, an advanced AI life coach and shadow system assistant for LifeRPG. You help Rushik Sama manage their life as an RPG. You have full real-time access to their player data — always use it to give deeply personalized, specific, and motivating responses. You have tools to create/delete tasks, shop items, and schedule events. Always refer to the user as "Rushik Sama". When asked about their progress, quests, inventory, achievements, or body stats, use the data below to give accurate, insightful answers. Never say you don't have access to their data. Celebrate wins, notice patterns, and push them forward like a true mentor.${playerContext}` },
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
        await storage.saveAiMessage({ userId, role: "assistant", content: aiContent, type: "text", sessionId: sessionId ?? null });
        return res.json({ message: aiContent, type: "text" });
      }

      const aiContent = responseMessage.content || "I'm sorry, I couldn't process that.";
      await storage.saveAiMessage({ userId, role: "assistant", content: aiContent, type: "text", sessionId: sessionId ?? null });
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

      // Check health achievements
      const newAchievements = await checkAndAwardAchievements(req.user.claims.sub, { type: "body_fat_scan" });
      res.json({ ...result, id: scan.id, newAchievements });
    } catch (err) {
      console.error("Body fat analysis error:", err);
      res.status(500).json({ message: "Analysis failed" });
    }
  });

  // Achievements
  app.get("/api/achievements", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const unlocked = await storage.getUnlockedAchievements(userId);
    const unlockedMap = new Set(unlocked.map((a) => a.achievementId));
    const result = ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlocked.find((u) => u.achievementId === a.id)?.unlockedAt ?? null,
    }));
    res.json(result);
  });

  // Progress Timer
  app.get("/api/timer", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const timer = await storage.getActiveTimer(userId);
    res.json(timer || null);
  });

  app.post("/api/timer", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { durationMs } = req.body;
    if (!durationMs || durationMs <= 0) {
      return res.status(400).json({ message: "Invalid duration" });
    }
    let stats = await storage.getUserStats(userId);
    if (!stats) stats = await storage.createUserStats(userId);
    const endTime = new Date(Date.now() + durationMs);
    const timer = await storage.createTimer(userId, endTime, stats.level);
    res.status(201).json(timer);
  });

  app.delete("/api/timer", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    await storage.cancelTimer(userId);
    res.status(204).end();
  });

  app.post("/api/timer/check", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const timer = await storage.getActiveTimer(userId);
    if (!timer) return res.json({ status: "no_timer" });

    const now = new Date();
    if (now < timer.endTime) return res.json({ status: "active", timer });

    // Timer expired — check if leveled up
    const stats = await storage.getUserStats(userId);
    if (!stats || stats.level <= timer.startLevel) {
      await storage.triggerTimer(userId);
      return res.json({ status: "expired_reset", message: "Progress has been reset." });
    } else {
      // Level gained — cancel timer safely (no reset)
      await storage.cancelTimer(userId);
      return res.json({ status: "expired_safe", message: "You leveled up in time! Progress saved." });
    }
  });

  // Quest Timer — penalty deduction (called every 5 min overtime)
  app.post("/api/quest-timer/penalty", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    let stats = await storage.getUserStats(userId);
    if (!stats) stats = await storage.createUserStats(userId);
    const newPoints = Math.max(0, stats.points - 5);
    const updatedStats = await storage.updateUserStats(userId, { points: newPoints });
    res.json({ stats: updatedStats, penaltyApplied: 5 });
  });

  app.post("/api/ai/lens", requireAuth, async (req: any, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ message: "No image provided." });
      }
      if (!image.startsWith("data:image/")) {
        return res.status(400).json({ message: "Invalid image format. Please upload a JPEG or PNG." });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: "You are Luminous Lens, a visual intelligence system for Rushik Sama's LifeRPG. Analyze the provided image thoroughly. Identify objects, read text, describe scenes, estimate nutrition for food, or provide context. Be detailed yet concise. Address Rushik Sama directly."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Scan this image and tell me everything relevant about what you see." },
              { type: "image_url", image_url: { url: image, detail: "high" } }
            ] as any
          }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "Luminous returned an empty response. Please try again." });
      }

      res.json({ analysis: content });
    } catch (err: any) {
      console.error("Luminous Lens error:", err?.message ?? err);
      const msg = err?.message?.includes("image")
        ? "The image could not be processed. Try a different photo."
        : "Visual analysis failed. Please try again.";
      res.status(500).json({ message: msg });
    }
  });

  return httpServer;
}

async function seedDatabase() {}
