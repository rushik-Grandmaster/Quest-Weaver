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
import { insertPhysiqueEntrySchema } from "@shared/schema";
import Groq from "groq-sdk";
import crypto from "crypto";

// === OWNER-ONLY (private features) ===
// Only Rushik (rushi30283@gmail.com / id 26147528) may access flagged routes.
const OWNER_USER_ID = "26147528";

// === VAULT password helpers (scrypt) ===
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  try {
    const candidate = crypto.scryptSync(password, salt, 64);
    const known = Buffer.from(hash, "hex");
    return known.length === candidate.length &&
      crypto.timingSafeEqual(known, candidate);
  } catch { return false; }
}

// Lazy-init Groq client — server won't crash on startup if GROQ_API_KEY is missing.
let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "missing" });
  }
  return _groq;
}

const TEXT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

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

  // Strict owner-only gate (private routes — anyone else gets 403)
  const requireOwner = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user?.claims?.sub !== OWNER_USER_ID) {
      return res.status(403).json({ message: "Forbidden — private resource" });
    }
    next();
  };

  // Vault gate — requires session.vaultUnlocked === userId IF the user has set a vault password.
  const requireVaultUnlocked = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const userId = req.user.claims.sub;
    try {
      const lock = await storage.getVaultLock(userId);
      if (!lock) return next();
      if (req.session?.vaultUnlocked === userId) return next();
      return res.status(423).json({ message: "Vault locked", code: "VAULT_LOCKED" });
    } catch (err) {
      console.error("Vault gate error:", err);
      return res.status(500).json({ message: "Vault check failed" });
    }
  };

  // === VAULT routes ===
  app.get("/api/vault/status", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const lock = await storage.getVaultLock(userId);
    res.json({
      isSet: !!lock,
      isUnlocked: req.session?.vaultUnlocked === userId,
      hint: lock?.hint ?? null,
    });
  });

  app.post("/api/vault/set", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { newPassword, currentPassword, hint } = req.body ?? {};
      if (typeof newPassword !== "string" || newPassword.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters." });
      }
      if (newPassword.length > 128) {
        return res.status(400).json({ message: "Password too long." });
      }
      const existing = await storage.getVaultLock(userId);
      if (existing) {
        if (typeof currentPassword !== "string" || !verifyPassword(currentPassword, existing.passwordHash)) {
          return res.status(403).json({ message: "Current password is incorrect." });
        }
      }
      const hash = hashPassword(newPassword);
      const cleanHint = typeof hint === "string" ? hint.slice(0, 80).trim() || null : null;
      await storage.upsertVaultLock(userId, hash, cleanHint);
      (req.session as any).vaultUnlocked = userId;
      req.session.save?.(() => res.json({ ok: true, isSet: true, isUnlocked: true }));
    } catch (err: any) {
      console.error("Vault set error:", err?.message ?? err);
      res.status(500).json({ message: "Failed to set vault password." });
    }
  });

  app.post("/api/vault/unlock", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { password } = req.body ?? {};
      if (typeof password !== "string" || !password) {
        return res.status(400).json({ message: "Password required." });
      }
      const lock = await storage.getVaultLock(userId);
      if (!lock) return res.status(400).json({ message: "No vault is set." });
      if (!verifyPassword(password, lock.passwordHash)) {
        await new Promise((r) => setTimeout(r, 350));
        return res.status(401).json({ message: "Wrong cipher key." });
      }
      (req.session as any).vaultUnlocked = userId;
      req.session.save?.(() => res.json({ ok: true, isUnlocked: true }));
    } catch (err: any) {
      console.error("Vault unlock error:", err?.message ?? err);
      res.status(500).json({ message: "Unlock failed." });
    }
  });

  app.post("/api/vault/lock", requireAuth, (req: any, res) => {
    if (req.session) (req.session as any).vaultUnlocked = null;
    req.session?.save?.(() => res.json({ ok: true, isUnlocked: false }));
  });

  // === PHYSIQUE (private — owner only) ===
  app.get("/api/physique", requireOwner, requireVaultUnlocked, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const entries = await storage.getPhysiqueEntries(userId);
    res.json(entries);
  });

  app.post("/api/physique", requireOwner, requireVaultUnlocked, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertPhysiqueEntrySchema.parse(req.body);
      if (!parsed.photoUrl?.startsWith("data:image/")) {
        return res.status(400).json({ message: "photoUrl must be a base64 image data URL" });
      }
      if (parsed.photoUrl.length > 5_500_000) {
        return res.status(413).json({ message: "Photo too large — please use a smaller image." });
      }
      const created = await storage.createPhysiqueEntry({ ...parsed, userId });
      res.status(201).json(created);
    } catch (err: any) {
      console.error("Physique create error:", err?.message ?? err);
      res.status(400).json({ message: err?.message ?? "Invalid physique entry" });
    }
  });

  app.patch("/api/physique/:id", requireOwner, requireVaultUnlocked, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getPhysiqueEntry(id);
      if (!existing || existing.userId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Not found" });
      }
      const updates: any = {};
      if (req.body.weight !== undefined)   updates.weight   = req.body.weight === null ? null : Number(req.body.weight);
      if (req.body.bodyFat !== undefined)  updates.bodyFat  = req.body.bodyFat === null ? null : Number(req.body.bodyFat);
      if (req.body.notes !== undefined)    updates.notes    = req.body.notes;
      if (req.body.pose !== undefined)     updates.pose     = req.body.pose;
      if (req.body.photoDate !== undefined) updates.photoDate = new Date(req.body.photoDate);
      const updated = await storage.updatePhysiqueEntry(id, updates);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err?.message ?? "Update failed" });
    }
  });

  app.delete("/api/physique/:id", requireOwner, requireVaultUnlocked, async (req: any, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getPhysiqueEntry(id);
    if (!existing || existing.userId !== req.user.claims.sub) {
      return res.status(404).json({ message: "Not found" });
    }
    await storage.deletePhysiqueEntry(id);
    res.status(204).end();
  });

  app.get("/api/physique/_owner-check", requireAuth, async (req: any, res) => {
    res.json({ isOwner: req.user?.claims?.sub === OWNER_USER_ID });
  });

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
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const result = tasks.map(t => {
      if (t.category === "one_time") return t;
      const completedToday = t.lastCompletedAt && new Date(t.lastCompletedAt) >= todayStart;
      return { ...t, isCompleted: !!completedToday };
    });
    res.json(result);
  });

  // Silent reward caps per difficulty (anti-cheat - no visible enforcement)
  const REWARD_CAPS: Record<string, { maxXp: number; maxPoints: number }> = {
    easy:   { maxXp: 25,  maxPoints: 25  },
    medium: { maxXp: 50,  maxPoints: 50  },
    hard:   { maxXp: 100, maxPoints: 100 },
  };

  // Trust score decay and thresholds (hidden from user)
  const TRUST_PENALTY_FAST_COMPLETE = 5;     // penalty for completing < 60s
  const TRUST_PENALTY_SUSPICIOUS = 10;       // penalty for suspicious patterns
  const TRUST_RECOVERY_PER_HOUR = 2;         // slow recovery
  const TRUST_MIN_REDUCTION_MULTIPLIER = 50; // below this = half rewards

  app.post(api.tasks.create.path, requireAuth, async (req: any, res) => {
    try {
      const parsed = api.tasks.create.input.parse(req.body);
      const caps = REWARD_CAPS[parsed.difficulty ?? "easy"] ?? REWARD_CAPS.easy;
      const safeParsed = {
        ...parsed,
        rewardXp:     Math.min(parsed.rewardXp ?? 10, caps.maxXp),
        rewardPoints: Math.min(parsed.rewardPoints ?? 5, caps.maxPoints),
        userId: req.user.claims.sub,
      };
      const task = await storage.createTask(safeParsed as any);
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

  // Minimum time (ms) a task must exist before completion (stealth enforcement)
  const COMPLETION_COOLDOWN_MS = 30_000; // 30 seconds

  app.post(api.tasks.complete.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const task = await storage.getTask(Number(req.params.id));

    if (!task || task.userId !== userId) {
      return res.status(404).json({ message: "Task not found" });
    }

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const alreadyDoneToday = task.lastCompletedAt && new Date(task.lastCompletedAt) >= todayStart;
    if (task.category === "one_time" ? task.isCompleted : alreadyDoneToday) {
      const stats = await storage.getUserStats(userId);
      return res.json({ task, stats, leveledUp: false });
    }

    // Stealth cooldown - return generic "processing" error instead of revealing anti-cheat
    const ageMs = Date.now() - new Date(task.createdAt).getTime();
    if (ageMs < COMPLETION_COOLDOWN_MS) {
      return res.status(409).json({
        code: "PROCESSING",
        message: "Quest is still being validated. Please try again shortly.",
      });
    }

    const taskUpdates: Record<string, any> = { lastCompletedAt: new Date() };
    if (task.category === "one_time") taskUpdates.isCompleted = true;
    const updatedTask = await storage.updateTask(task.id, taskUpdates);

    let stats = await storage.getUserStats(userId);
    if (!stats) stats = await storage.createUserStats(userId);

    // Silent reward capping
    const caps = REWARD_CAPS[task.difficulty ?? "easy"] ?? REWARD_CAPS.easy;
    const cappedXp = Math.min(task.rewardXp, caps.maxXp);
    const cappedPoints = Math.min(task.rewardPoints, caps.maxPoints);

    // Stealth trust score calculation
    let trustScore = stats.trustScore ?? 100;
    const completedAt = new Date();
    const taskCreatedAt = new Date(task.createdAt);
    const timeDeltaMs = completedAt.getTime() - taskCreatedAt.getTime();

    // Behavioral pattern detection
    let flagged = false;
    const recentCompletions = await storage.getRecentCompletions(userId, 60_000); // last minute
    const fastCompletions = recentCompletions.filter(l => l.timeDeltaMs < 60_000).length;

    // Apply hidden trust penalties
    if (timeDeltaMs < 60_000) {
      trustScore = Math.max(0, trustScore - TRUST_PENALTY_FAST_COMPLETE);
      flagged = true;
    }
    if (fastCompletions >= 3) {
      trustScore = Math.max(0, trustScore - TRUST_PENALTY_SUSPICIOUS);
      flagged = true;
    }

    // Hidden trust multiplier (user never sees this)
    const trustMultiplier = trustScore >= TRUST_MIN_REDUCTION_MULTIPLIER ? 1 : 0.5;
    const appliedXp = Math.floor(cappedXp * trustMultiplier);
    const appliedPoints = Math.floor(cappedPoints * trustMultiplier);

    // Update stats with trust score (not returned to frontend)
    const { level, xp, leveledUp } = applyXp(stats.level, stats.xp, appliedXp);
    const newPoints = stats.points + appliedPoints;
    const updatedStats = await storage.updateUserStats(userId, { xp, points: newPoints, level, trustScore });

    // Silent audit logging
    await storage.createAuditLog({
      userId,
      taskId: task.id,
      taskCreatedAt,
      completedAt,
      timeDeltaMs,
      rewardXp: cappedXp,
      rewardPoints: cappedPoints,
      appliedXp,
      appliedPoints,
      trustScoreAtCompletion: trustScore,
      flagged,
    });

    const newAchievements = await checkAndAwardAchievements(userId, {
      type: leveledUp ? "level_up" : "task_complete",
      newLevel: level,
      taskDifficulty: task.difficulty,
    });

    // Return clean response (no anti-cheat info)
    res.json({ task: updatedTask, stats: { ...updatedStats, trustScore: undefined }, leveledUp, newAchievements });
  });

  // Shop
  app.get(api.shop.list.path, requireAuth, async (req: any, res) => {
    const items = await storage.getShopItems(req.user.claims.sub);
    res.json(items);
  });

  app.post(api.shop.create.path, requireAuth, async (req: any, res) => {
    try {
      const parsed = api.shop.create.input.parse(req.body);
      const input = { ...parsed, userId: req.user.claims.sub };
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

    let rewardSession = null;
    if (item.durationMinutes && item.durationMinutes > 0) {
      const expiresAt = new Date(Date.now() + item.durationMinutes * 60 * 1000);
      rewardSession = await storage.createRewardSession({
        userId,
        shopItemId: item.id,
        itemName: item.name,
        itemUrl: item.url ?? null,
        minutesTotal: item.durationMinutes,
        expiresAt,
      });
    }

    const newAchievements = await checkAndAwardAchievements(userId, { type: "shop_purchase" });
    res.json({ item: inventoryItem, stats: updatedStats, newAchievements, rewardSession });
  });

  // Reward Sessions
  app.get("/api/reward-sessions", requireAuth, async (req: any, res) => {
    const sessions = await storage.getRewardSessions(req.user.claims.sub);
    res.json(sessions);
  });

  app.delete("/api/reward-sessions/:id", requireAuth, async (req: any, res) => {
    const id = Number(req.params.id);
    await storage.deleteRewardSession(id);
    res.status(204).end();
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
      const input = { ...parsed, userId: req.user.claims.sub };
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
  app.get(api.diary.list.path, requireAuth, requireVaultUnlocked, async (req: any, res) => {
    const entries = await storage.getDiaryEntries(req.user.claims.sub);
    res.json(entries);
  });

  app.post(api.diary.create.path, requireAuth, requireVaultUnlocked, async (req: any, res) => {
    try {
      const parsed = api.diary.create.input.parse(req.body);
      const input = { ...parsed, userId: req.user.claims.sub };
      const entry = await storage.createDiaryEntry(input as any);
      const newAchievements = await checkAndAwardAchievements(req.user.claims.sub, { type: "diary_entry" });
      res.status(201).json({ ...entry, newAchievements });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(400).json({ message: "Failed to create entry" });
    }
  });

  app.patch(api.diary.update.path, requireAuth, requireVaultUnlocked, async (req: any, res) => {
    const entry = await storage.getDiaryEntry(Number(req.params.id));
    if (!entry || entry.userId !== req.user.claims.sub) {
      return res.status(404).json({ message: "Entry not found" });
    }
    const updated = await storage.updateDiaryEntry(entry.id, req.body);
    res.json(updated);
  });

  app.delete(api.diary.delete.path, requireAuth, requireVaultUnlocked, async (req: any, res) => {
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

  // TTS — browser handles this
  app.post("/api/ai/tts", requireAuth, (_req, res) => {
    res.status(501).json({
      message: "Server TTS unavailable on this deployment. Browser speech-synthesis is used instead.",
    });
  });

  // Chat Session Routes
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
    const rawFirst = (req.user.claims.first_name || "").trim();
    const rawLast = (req.user.claims.last_name || "").trim();
    const displayName = rawFirst
      ? (rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1)) + (rawLast ? " " + (rawLast.charAt(0).toUpperCase() + rawLast.slice(1)) : "")
      : "Operator";
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

      // Build chat history
      let chatHistory: { role: string; content: string }[];
      if (sessionId) {
        const dbMessages = await storage.getSessionMessages(sessionId);
        chatHistory = dbMessages.slice(-31, -1).map(m => ({ role: m.role, content: m.content }));
      } else {
        chatHistory = history.map((m: any) => ({ role: m.role, content: m.content }));
      }

      // Fetch all player data for Luminous context
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
Use this data to give highly personalized advice, celebrate progress, and help ${displayName} level up in real life.
═══════════════════════════════════════`;

      const tools: any[] = [
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

      const completion = await getGroq().chat.completions.create({
        model: TEXT_MODEL,
        messages: [
          {
            role: "system",
            content: `You are Luminous, an advanced AI life coach and shadow system assistant for LifeRPG. You help ${displayName} manage their life as an RPG. You have full real-time access to their player data — always use it to give deeply personalized, specific, and motivating responses. You have tools to create/delete tasks, shop items, and schedule events. Always refer to the user as "${displayName}". When asked about their progress, quests, inventory, achievements, or body stats, use the data below to give accurate, insightful answers. Never say you don't have access to their data. Celebrate wins, notice patterns, and push them forward like a true mentor.\n${playerContext}`
          },
          ...chatHistory as any,
          { role: "user", content: message }
        ],
        tools: tools,
        tool_choice: "auto",
        max_tokens: 2048,
      });

      const responseMessage = completion.choices[0].message;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
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
            content: result
          });
        }

        const finalCompletion = await getGroq().chat.completions.create({
          model: TEXT_MODEL,
          messages: [
            {
              role: "system",
              content: "The tools have been executed. Confirm to the user that their request has been completed or explain any errors."
            },
            ...chatHistory as any,
            { role: "user", content: message },
            responseMessage as any,
            ...toolResults as any
          ],
          max_tokens: 1024,
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

  // ── US Army body fat circumference method ─────────────────────────────────────
  // Formulas from Army Regulation 600-9 / DoDI 1308.3
  // All measurements in cm. Returns null if insufficient data.
  function armyBodyFat(opts: {
    gender: "male" | "female";
    heightCm: number;
    waistCm?: number;
    neckCm?: number;
    hipCm?: number;
  }): number | null {
    const { gender, heightCm, waistCm, neckCm, hipCm } = opts;
    if (!waistCm || !neckCm || !heightCm) return null;
    if (gender === "female" && !hipCm) return null;

    if (gender === "male") {
      const diff = waistCm - neckCm;
      if (diff <= 0) return null;
      // Metric Siri-style regression from AR 600-9
      const bd = 1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm);
      if (bd <= 0) return null;
      return Math.round((495 / bd - 450) * 10) / 10;
    } else {
      const sum = waistCm + (hipCm ?? 0) - neckCm;
      if (sum <= 0) return null;
      const bd = 1.29579 - 0.35004 * Math.log10(sum) + 0.22100 * Math.log10(heightCm);
      if (bd <= 0) return null;
      return Math.round((495 / bd - 450) * 10) / 10;
    }
  }

  app.post("/api/ai/body-fat", requireAuth, async (req: any, res) => {
    try {
      const {
        image,
        height,
        weight,
        gender,
        waistCm,
        neckCm,
        hipCm,
      } = req.body;

      if (!image || !height || !weight) {
        return res.status(400).json({ message: "Image, height, and weight are required" });
      }

      // ── Army circumference method (if measurements provided) ──
      let armyResult: number | null = null;
      if (gender && waistCm && neckCm) {
        armyResult = armyBodyFat({
          gender,
          heightCm: parseFloat(height),
          waistCm: parseFloat(waistCm),
          neckCm: parseFloat(neckCm),
          hipCm: hipCm ? parseFloat(hipCm) : undefined,
        });
      }

      // ── Vision analysis via GPT-4o ──
      // Extract base64 from data URL or use raw base64
      let dataUrl = image;
      if (!image.startsWith("data:image/")) {
        dataUrl = `data:image/jpeg;base64,${image}`;
      }

      const visionPrompt = `You are an expert fitness-assessment assistant estimating body fat percentage from a photo.

STEP 1 — IMAGE CHECK:
Look at the image carefully. Determine if it actually shows a HUMAN BODY (a person, standing or posing, with their torso/body visible).
- If the image does NOT contain a human body, you MUST still describe what you see. Return:
  {"validImage": false, "detectedObject": "<what the image actually shows, e.g. 'a garbage bin', 'a landscape', 'a dog', 'a plate of food'>", "rejectionReason": "<one sentence telling the user why this can't be analyzed>"}
- If it DOES show a human body, proceed to step 2.

STEP 2 — BODY FAT ESTIMATION:
Use these VISUAL REFERENCE STANDARDS to estimate body fat:

MEN:
- 5%:  every muscle striated, paper-thin skin, extreme vascularity, gaunt face
- 10%: six-pack visible at rest, vascularity in arms/shoulders, sharp jawline
- 15%: abs visible when flexed, soft outline relaxed, V-taper torso ("beach lean")
- 20%: no visible abs, slight soft layer over torso, face beginning to round
- 25%: visible belly, love handles, waistline larger than chest
- 30%: protruding abdomen, fat on chest/back/sides, rounder face
- 35%+: obese distribution, fat across neck/back/limbs

WOMEN:
- 10%: shredded, full abdominal separation, striations, prominent vascularity
- 15%: flat stomach, faint abdominal definition, lean limbs
- 20%: slim/toned, soft curves, abdominal outline when flexed
- 25%: average, soft midsection, fuller hips/thighs
- 30%: fuller figure, fat on abdomen/hips/thighs/arms, rounder face
- 35%+: substantial fat accumulation, round face

INSTRUCTIONS:
1. Determine the subject's apparent sex from the photo.
2. Compare visible features (abdominal definition, vascularity, face fullness, limb leanness, torso shape) against the reference bands.
3. Return a single integer estimate AND a range (e.g. 12, range 10-14).
4. List 2-3 visual cues that drove your estimate.
5. State confidence: low, medium, or high. Note photo-quality caveats.
6. Include a 1-2 sentence analysis/insight.

Return ONLY a valid JSON object. No markdown, no code fences, no extra text. If the image is valid, use these fields:
{"validImage": true, "sexAssumption": "male" or "female", "bodyFat": <integer>, "bodyFatRangeLow": <integer>, "bodyFatRangeHigh": <integer>, "confidence": "low" or "medium" or "high", "cues": ["cue1", "cue2", "cue3"], "analysis": "<1-2 sentence insight>", "caveats": "<photo quality notes>"}

If the image is NOT a human body, use these fields:
{"validImage": false, "detectedObject": "<what you see>", "rejectionReason": "<why it can't be analyzed>"}`;

      const response = await getGroq().chat.completions.create({
        model: VISION_MODEL,
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
              { type: "text", text: visionPrompt },
            ],
          },
        ],
      });

      const rawContent = response.choices[0]?.message?.content || "{}";
      const cleaned = rawContent.replace(/```json|```/g, "").trim();
      const result = JSON.parse(cleaned);

      // Reject non-body images — tell the user WHAT they uploaded
      if (result.validImage === false) {
        const detected = result.detectedObject || "an unidentified object";
        const reason = result.rejectionReason || "This image does not show a human body.";
        return res.status(400).json({
          message: `This photo shows ${detected}, not a human body. ${reason} Please upload a clear full-body photo (front view, standing straight, minimal clothing) to get an accurate body fat scan.`,
          detectedObject: detected,
          rejectionReason: reason,
        });
      }

      // Sanitize
      const visionEstimate = typeof result.bodyFat === "number" ? Math.round(result.bodyFat) : null;
      const visionLow = typeof result.bodyFatRangeLow === "number" ? Math.round(result.bodyFatRangeLow) : null;
      const visionHigh = typeof result.bodyFatRangeHigh === "number" ? Math.round(result.bodyFatRangeHigh) : null;
      const confidence = ["low", "medium", "high"].includes(result.confidence) ? result.confidence : "medium";

      // Choose final estimate: prefer Army method if available (more objective), else vision
      const finalEstimate = armyResult ?? visionEstimate ?? 20;
      const method = armyResult != null ? "army" : "vision";

      // Build combined analysis text
      let analysisText = result.analysis || "";
      if (armyResult != null && visionEstimate != null) {
        const diff = Math.abs(armyResult - visionEstimate);
        analysisText += ` US Army circumference method estimates ${armyResult}%. `;
        if (diff <= 4) {
          analysisText += "Both methods closely agree, increasing confidence.";
        } else {
          analysisText += `The ${diff > 0 && armyResult > visionEstimate ? "Army" : "visual"} method suggests a higher estimate — measurements may differ from visual appearance due to lighting or muscle mass.`;
        }
      } else if (armyResult != null) {
        analysisText = `US Army circumference method (AR 600-9) estimates ${armyResult}% body fat based on your measurements. This is a circumference-based calculation, not a visual estimate.`;
      }

      const scan = await storage.saveBodyFatScan({
        userId: req.user.claims.sub,
        imageUrl: image,
        height: parseInt(height),
        weight: parseInt(weight),
        estimatedBodyFat: finalEstimate,
      });

      const newAchievements = await checkAndAwardAchievements(req.user.claims.sub, { type: "body_fat_scan" });

      res.json({
        bodyFat: finalEstimate,
        method,
        visionEstimate,
        visionRange: visionLow != null && visionHigh != null ? `${visionLow}-${visionHigh}%` : null,
        armyEstimate: armyResult,
        sexAssumption: result.sexAssumption || null,
        confidence,
        cues: Array.isArray(result.cues) ? result.cues.slice(0, 4) : [],
        analysis: analysisText,
        caveats: result.caveats || null,
        id: scan.id,
        newAchievements,
      });
    } catch (err: any) {
      console.error("Body fat analysis error:", err?.message ?? err);

      // Distinguish error types so the user gets a useful message
      const errMsg = err?.message || "";
      const status = err?.status || err?.statusCode;

      if (status === 429 || errMsg.includes("rate limit") || errMsg.includes("429")) {
        return res.status(429).json({
          message: "The AI scanner is busy right now. Please wait a few seconds and try again.",
          errorType: "rate_limit",
        });
      }
      if (errMsg.includes("model") || errMsg.includes("decommissioned") || errMsg.includes("not found")) {
        return res.status(503).json({
          message: "The AI vision model is temporarily unavailable. Please try again in a moment.",
          errorType: "model_unavailable",
        });
      }
      if (errMsg.includes("API key") || errMsg.includes("authentication") || errMsg.includes("401")) {
        return res.status(503).json({
          message: "The AI service is not configured. Please contact support.",
          errorType: "auth_error",
        });
      }
      // JSON parse or other unexpected error — show the real cause
      return res.status(500).json({
        message: `Scan failed: ${errMsg || "Unexpected error"}. This is usually a temporary issue — please try again. If it keeps happening, try a different photo (JPG or PNG, under 10MB).`,
        errorType: "unknown",
        detail: errMsg,
      });
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

    const stats = await storage.getUserStats(userId);
    if (!stats || stats.level <= timer.startLevel) {
      await storage.triggerTimer(userId);
      return res.json({ status: "expired_reset", message: "Progress has been reset." });
    } else {
      await storage.cancelTimer(userId);
      return res.json({ status: "expired_safe", message: "You leveled up in time! Progress saved." });
    }
  });

  // Amazon Wishlist
  app.get("/api/wishlist", requireAuth, async (req: any, res) => {
    const items = await storage.getWishlistItems(req.user.claims.sub);
    res.json(items);
  });

  app.post("/api/wishlist", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const item = await storage.createWishlistItem({ ...req.body, userId });
      res.status(201).json(item);
    } catch (err: any) {
      res.status(400).json({ message: err.message ?? "Failed to save item" });
    }
  });

  app.delete("/api/wishlist/:id", requireAuth, async (req, res) => {
    await storage.deleteWishlistItem(parseInt(req.params.id));
    res.status(204).end();
  });

  app.post("/api/wishlist/fetch-product", requireAuth, async (req, res) => {
    const { url } = req.body as { url?: string };
    if (!url) return res.status(400).json({ message: "URL required" });

    const asinMatch =
      url.match(/\/dp\/([A-Z0-9]{10})/i) ||
      url.match(/\/gp\/product\/([A-Z0-9]{10})/i) ||
      url.match(/\/gp\/aw\/d\/([A-Z0-9]{10})/i) ||
      url.match(/[?&]asin=([A-Z0-9]{10})/i);
    const asin = asinMatch?.[1]?.toUpperCase();

    const isAmazon = /amazon\.(in|com)/i.test(url);
    if (!isAmazon && !asin) {
      return res.status(400).json({ message: "Please provide a valid Amazon.in URL" });
    }

    const fetchUrl = asin ? `https://www.amazon.in/dp/${asin}` : url;

    try {
      const response = await fetch(fetchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-IN,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "Upgrade-Insecure-Requests": "1",
        },
        redirect: "follow",
      });

      const html = await response.text();

      const decode = (s: string) =>
        s
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, " ")
          .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
          .replace(/\s+/g, " ")
          .trim();

      let title = "";
      const titlePatterns = [
        /id="productTitle"[^>]*>([\s\S]*?)<\/span>/i,
        /id="title"[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/i,
        /<meta\s+name="title"\s+content="([^"]+)"/i,
        /<title>([^<]+)<\/title>/i,
      ];
      for (const p of titlePatterns) {
        const m = html.match(p);
        if (m) {
          const cleaned = decode(m[1]).replace(/\s*-\s*Amazon\.in.*$/i, "").trim();
          if (cleaned.length > 5) { title = cleaned.slice(0, 200); break; }
        }
      }

      let price = "";
      const pricePatterns = [
        /"priceAmount":\s*([\d.]+)/,
        /"displayPrice":\s*"₹\s*([\d,]+)/,
        /class="a-offscreen">\s*₹\s*([\d,]+\.?\d*)/i,
        /₹\s*([\d,]+\.?\d*)/,
      ];
      for (const p of pricePatterns) {
        const m = html.match(p);
        if (m) {
          const num = m[1].replace(/,/g, "");
          const n = parseFloat(num);
          if (!isNaN(n) && n > 0) {
            price = `₹${n.toLocaleString("en-IN")}`;
            break;
          }
        }
      }

      let imageUrl = "";
      const imgPatterns = [
        /"hiRes":\s*"(https:\/\/m\.media-amazon\.com[^"]+\.(?:jpg|jpeg|png))"/i,
        /"large":\s*"(https:\/\/m\.media-amazon\.com[^"]+\.(?:jpg|jpeg|png))"/i,
        /"mainUrl":\s*"(https:\/\/m\.media-amazon\.com[^"]+\.(?:jpg|jpeg|png))"/i,
        /data-old-hires="(https:\/\/[^"]+\.(?:jpg|jpeg|png))"/i,
        /id="landingImage"[^>]+src="(https:\/\/[^"]+\.(?:jpg|jpeg|png))"/i,
        /<meta\s+property="og:image"\s+content="([^"]+)"/i,
      ];
      for (const p of imgPatterns) {
        const m = html.match(p);
        if (m) { imageUrl = m[1].replace(/\\u002F/g, "/"); break; }
      }

      const success = !!(title || imageUrl || price);
      return res.json({
        title, price, imageUrl,
        asin: asin ?? "",
        productUrl: fetchUrl,
        success,
        message: success ? null : "Could not extract details — please fill them in manually.",
      });
    } catch (err: any) {
      console.error("Amazon fetch error:", err?.message);
      return res.json({
        title: "", price: "", imageUrl: "",
        asin: asin ?? "",
        productUrl: fetchUrl,
        success: false,
        message: "Amazon blocked the request. You can still save the URL and enter details manually.",
      });
    }
  });

  // Quest Timer penalty
  app.post("/api/quest-timer/penalty", requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    let stats = await storage.getUserStats(userId);
    if (!stats) stats = await storage.createUserStats(userId);
    const newPoints = Math.max(0, stats.points - 5);
    const updatedStats = await storage.updateUserStats(userId, { points: newPoints });
    res.json({ stats: updatedStats, penaltyApplied: 5 });
  });

  // Luminous Lens — text-based analysis (Groq doesn't support vision, so we describe what we can)
  app.post("/api/ai/lens", requireAuth, async (req: any, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ message: "No image provided." });
      }
      if (!image.startsWith("data:image/")) {
        return res.status(400).json({ message: "Invalid image format. Please upload a JPEG or PNG." });
      }

      const firstName = (req as any).user.claims.first_name;
      const name = firstName ? (firstName.charAt(0).toUpperCase() + firstName.slice(1)) : "the user";

      const response = await getGroq().chat.completions.create({
        model: TEXT_MODEL,
        messages: [
          {
            role: "system",
            content: `You are Luminous Lens, a visual intelligence system for ${name}'s LifeRPG. The user has submitted an image for analysis. Since direct image processing is not available in this mode, acknowledge the image submission and ask ${name} to describe what's in the image so you can provide detailed analysis, nutrition estimates, object identification, or any other insight they need.`
          },
          {
            role: "user",
            content: "I've submitted an image for analysis."
          }
        ],
        max_tokens: 512,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "Luminous returned an empty response. Please try again." });
      }

      res.json({ analysis: content });
    } catch (err: any) {
      console.error("Luminous Lens error:", err?.message ?? err);
      res.status(500).json({ message: "Visual analysis failed. Please try again." });
    }
  });

  // === MEAL ENTRIES ===
  app.get("/api/meals", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entries = await storage.getMealEntries(userId);
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });

  app.post("/api/meals", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entry = await storage.createMealEntry({ ...req.body, userId });
      res.status(201).json(entry);
    } catch (err: any) {
      res.status(400).json({ message: err.message ?? "Failed to create meal entry" });
    }
  });

  app.patch("/api/meals/:id", requireAuth, async (req: any, res) => {
    try {
      const entry = await storage.getMealEntry(parseInt(req.params.id));
      if (!entry) return res.status(404).json({ message: "Not found" });
      if (entry.userId !== req.user.claims.sub) return res.status(403).json({ message: "Forbidden" });
      const updated = await storage.updateMealEntry(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message ?? "Failed to update meal entry" });
    }
  });

  app.delete("/api/meals/:id", requireAuth, async (req: any, res) => {
    try {
      const entry = await storage.getMealEntry(parseInt(req.params.id));
      if (!entry) return res.status(404).json({ message: "Not found" });
      if (entry.userId !== req.user.claims.sub) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteMealEntry(parseInt(req.params.id));
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete meal entry" });
    }
  });

  // Luminous meal analysis with web search
  app.post("/api/ai/meals/analyze", requireAuth, async (req: any, res) => {
    try {
      const { mealName, notes } = req.body;
      if (!mealName) return res.status(400).json({ message: "Meal name required" });

      const firstName = req.user.claims.first_name;
      const name = firstName ? (firstName.charAt(0).toUpperCase() + firstName.slice(1)) : "the user";

      // Search for nutrition facts using Tavily (if API key available)
      let nutritionContext = "";
      const tavilyKey = process.env.TAVILY_API_KEY;

      if (tavilyKey && tavilyKey.length > 0) {
        try {
          const searchQuery = `${mealName} nutrition facts calories protein carbs fat per serving`;
          const searchResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${tavilyKey}`,
            },
            body: JSON.stringify({
              query: searchQuery,
              search_depth: "advanced",
              max_results: 5,
            }),
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.results && searchData.results.length > 0) {
              nutritionContext = searchData.results
                .slice(0, 3)
                .map((r: any) => r.content)
                .join("\n\n");
            }
          }
        } catch (searchErr) {
          console.error("Tavily search error:", searchErr);
          // Continue without search results
        }
      }

      const systemPrompt = nutritionContext
        ? `You are Luminous, an elite nutrition intelligence system for ${name}'s LifeRPG. You have REAL nutrition data from web search results below. Use this data to provide ACCURATE nutrition values — do not guess. Always return ONLY valid JSON — no markdown, no extra text.

WEB SEARCH RESULTS:
${nutritionContext}

Extract the most accurate nutrition values from the search results. If multiple values exist, use the most common/average for a standard restaurant serving.`
        : `You are Luminous, an elite nutrition intelligence system for ${name}'s LifeRPG. Estimate nutrition values for a standard serving. Consider typical ingredients and portions. Always return ONLY valid JSON — no markdown, no extra text.`;

      const response = await getGroq().chat.completions.create({
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze this meal: "${mealName}"${notes ? `. Additional context: ${notes}` : ""}.

Return a JSON object with these EXACT fields:
- calories (integer): total calories for ONE standard serving
- protein (number): grams of protein
- carbs (number): grams of carbohydrates
- fat (number): grams of fat
- fiber (number): grams of fiber
- analysis (string): 2-3 sentence nutritional insight
- healthScore (integer): 1-10 rating (10 = very healthy)

IMPORTANT: Return ONLY the JSON object, no other text.`,
          }
        ],
        max_tokens: 512,
        temperature: 0.1,
      });

      const rawContent = response.choices[0]?.message?.content || "{}";
      const cleaned = rawContent.replace(/```json|```/g, "").trim();
      const result = JSON.parse(cleaned);

      // Ensure all required fields exist with sensible defaults
      const safeResult = {
        calories: typeof result.calories === "number" ? Math.round(result.calories) : 300,
        protein: typeof result.protein === "number" ? Math.round(result.protein * 10) / 10 : 10,
        carbs: typeof result.carbs === "number" ? Math.round(result.carbs * 10) / 10 : 30,
        fat: typeof result.fat === "number" ? Math.round(result.fat * 10) / 10 : 10,
        fiber: typeof result.fiber === "number" ? Math.round(result.fiber * 10) / 10 : 3,
        analysis: result.analysis || `${mealName} - standard serving analyzed.`,
        healthScore: typeof result.healthScore === "number" ? Math.min(10, Math.max(1, result.healthScore)) : 5,
      };

      res.json(safeResult);
    } catch (err: any) {
      console.error("Meal analysis error:", err?.message ?? err);
      res.status(500).json({ message: "Analysis failed. Please try again." });
    }
  });

  // Food photo analysis via Groq Vision
  app.post("/api/ai/meals/analyze-photo", requireAuth, async (req: any, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg" } = req.body;
      if (!imageBase64) return res.status(400).json({ message: "imageBase64 required" });

      const dataUrl = `data:${mimeType};base64,${imageBase64}`;

      const response = await getGroq().chat.completions.create({
        model: VISION_MODEL,
        max_tokens: 600,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl, detail: "high" },
              },
              {
                type: "text",
                text: `You are an expert nutritionist analyzing a food photo. Identify all food items visible and estimate nutrition for the full serving shown.\n\nReturn ONLY a valid JSON object with these exact fields:\n- foodName (string): concise name of the dish/food\n- portionDescription (string): e.g. "1 medium plate" or "1 cup"\n- calories (integer): estimated kcal\n- protein (number): grams\n- carbs (number): grams\n- fat (number): grams\n- fiber (number): grams\n- confidence (string): "high", "medium", or "low"\n- analysis (string): 1-2 sentence nutritional insight\n\nReturn ONLY valid JSON, no markdown.`,
              },
            ],
          },
        ],
      });

      const raw = response.choices[0]?.message?.content || "{}";
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const result = JSON.parse(cleaned);

      res.json({
        foodName: result.foodName || "Unknown food",
        portionDescription: result.portionDescription || "1 serving",
        calories: typeof result.calories === "number" ? Math.round(result.calories) : 300,
        protein: typeof result.protein === "number" ? Math.round(result.protein * 10) / 10 : null,
        carbs: typeof result.carbs === "number" ? Math.round(result.carbs * 10) / 10 : null,
        fat: typeof result.fat === "number" ? Math.round(result.fat * 10) / 10 : null,
        fiber: typeof result.fiber === "number" ? Math.round(result.fiber * 10) / 10 : null,
        confidence: ["high", "medium", "low"].includes(result.confidence) ? result.confidence : "medium",
        analysis: result.analysis || "",
      });
    } catch (err: any) {
      console.error("Photo analysis error:", err?.message ?? err);
      res.status(500).json({ message: "Photo analysis failed. Please try again or enter manually." });
    }
  });

  // Global Leaderboard - public, no auth required
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || "50"));
      const leaderboard = await storage.getGlobalLeaderboard(limit);
      res.json(leaderboard);
    } catch (err: any) {
      console.error("Leaderboard error:", err?.message ?? err);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  return httpServer;
}

async function seedDatabase() {}
