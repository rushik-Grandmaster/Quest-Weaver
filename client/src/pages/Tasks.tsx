import { useState } from "react";
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask } from "@/hooks/use-tasks";
import { useUserStats } from "@/hooks/use-gamification";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, type InsertTask, type Task, type UserStats } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader as Loader2, Plus, Filter, Trash2, CircleCheck as CheckCircle2, Zap, Coins, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSound } from "@/hooks/use-sound";
import { staggerContainer, staggerChild } from "@/lib/animations";
import { xpForLevel, applyXp, getRank } from "@shared/levels";

// ── XP projection helper ─────────────────────────────────────────────────────
function calcProjection(stats: UserStats, rewardXp: number) {
  const before = { level: stats.level, xp: stats.xp, xpNeeded: xpForLevel(stats.level) };
  const after  = applyXp(stats.level, stats.xp, rewardXp);
  const afterXpNeeded = xpForLevel(after.level);
  return { before, after, afterXpNeeded, leveledUp: after.level > stats.level };
}

// ── Quest Inspect Overlay ─────────────────────────────────────────────────────
function QuestInspectOverlay({
  task, stats, onComplete, onClose,
}: {
  task: Task; stats: UserStats; onComplete: () => void; onClose: () => void;
}) {
  const proj = calcProjection(stats, task.rewardXp);
  const beforePct = Math.round((proj.before.xp / proj.before.xpNeeded) * 100);
  const afterPct  = Math.round((proj.after.xp  / proj.afterXpNeeded)   * 100);
  const rank = getRank(stats.level);

  const diffColor =
    task.difficulty === "hard"   ? "#f87171" :
    task.difficulty === "medium" ? "#fbbf24" : "#4ade80";

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 36 }}
      style={{
        position: "absolute", inset: 0, zIndex: 20,
        background: "rgba(4,7,20,0.97)",
        borderRadius: "inherit",
        padding: "16px",
        display: "flex", flexDirection: "column", gap: 10,
        backdropFilter: "blur(4px)",
        overflowY: "auto",
      }}
    >
      {/* Close */}
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        data-testid={`button-inspect-close-${task.id}`}
        style={{
          position: "absolute", top: 10, right: 10,
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(100,116,139,0.6)", padding: 4,
        }}
      >
        <X style={{ width: 13, height: 13 }} />
      </button>

      {/* Header */}
      <div>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.25em",
          color: "rgba(99,102,241,0.55)", marginBottom: 3,
        }}>
          ◈ QUEST ANALYSIS · RANK {rank}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: "rgba(199,210,254,0.95)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {task.title}
        </div>
        <div style={{
          display: "inline-block", marginTop: 4,
          padding: "2px 8px", borderRadius: 20,
          background: `${diffColor}15`, border: `1px solid ${diffColor}40`,
          fontFamily: "var(--font-mono)", fontSize: 8, color: diffColor, letterSpacing: "0.15em",
        }}>
          {task.difficulty.toUpperCase()} · {task.category.replace("_", " ").toUpperCase()}
        </div>
      </div>

      {/* Rewards row */}
      <div style={{ display: "flex", gap: 8 }}>
        {/* XP */}
        <div style={{
          flex: 1, padding: "10px 12px", borderRadius: 5,
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.25)",
          textAlign: "center",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(99,102,241,0.55)", letterSpacing: "0.15em", marginBottom: 4 }}>
            XP REWARD
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "rgba(165,180,252,0.95)", letterSpacing: "0.05em" }}>
            +{task.rewardXp}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(99,102,241,0.4)", marginTop: 1 }}>EXPERIENCE</div>
        </div>
        {/* Gold */}
        <div style={{
          flex: 1, padding: "10px 12px", borderRadius: 5,
          background: "rgba(245,158,11,0.07)",
          border: "1px solid rgba(245,158,11,0.25)",
          textAlign: "center",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(245,158,11,0.55)", letterSpacing: "0.15em", marginBottom: 4 }}>
            GOLD REWARD
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "rgba(251,191,36,0.95)", letterSpacing: "0.05em" }}>
            +{task.rewardPoints}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(245,158,11,0.4)", marginTop: 1 }}>GOLD</div>
        </div>
      </div>

      {/* Level projection */}
      <div style={{
        padding: "11px 13px", borderRadius: 5,
        background: "rgba(6,10,26,0.8)",
        border: "1px solid rgba(99,102,241,0.18)",
      }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(99,102,241,0.45)", letterSpacing: "0.2em", marginBottom: 8 }}>
          ◇ PROGRESS PROJECTION
        </div>

        {/* Level labels */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(148,163,184,0.7)" }}>
            Lv.{proj.before.level}
          </span>
          {proj.leveledUp ? (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.15em",
                color: "rgba(74,222,128,0.9)", padding: "2px 8px",
                background: "rgba(74,222,128,0.08)", borderRadius: 3,
                border: "1px solid rgba(74,222,128,0.3)",
              }}
            >
              ⬆ LEVEL UP! → Lv.{proj.after.level}
            </motion.span>
          ) : (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(100,116,139,0.5)" }}>
              Lv.{proj.before.level + 1}
            </span>
          )}
        </div>

        {/* Before bar */}
        <div style={{ marginBottom: 5 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(100,116,139,0.5)", marginBottom: 3, display: "flex", justifyContent: "space-between" }}>
            <span>CURRENT</span>
            <span>{proj.before.xp} / {proj.before.xpNeeded} XP</span>
          </div>
          <div style={{ height: 5, background: "rgba(99,102,241,0.1)", borderRadius: 3 }}>
            <div style={{ height: "100%", width: `${beforePct}%`, borderRadius: 3, background: "rgba(99,102,241,0.4)" }} />
          </div>
        </div>

        {/* After bar */}
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(165,180,252,0.6)", marginBottom: 3, display: "flex", justifyContent: "space-between" }}>
            <span>AFTER QUEST</span>
            <span style={{ color: "rgba(165,180,252,0.8)" }}>{proj.after.xp} / {proj.afterXpNeeded} XP</span>
          </div>
          <div style={{ height: 5, background: "rgba(99,102,241,0.1)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
            {/* Base fill */}
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${beforePct}%`, borderRadius: 3, background: "rgba(99,102,241,0.4)" }} />
            {/* XP gain highlight */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${afterPct - (proj.leveledUp ? 0 : beforePct)}%` }}
              transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
              style={{
                position: "absolute",
                left: proj.leveledUp ? 0 : `${beforePct}%`,
                top: 0, height: "100%",
                background: "linear-gradient(90deg, rgba(165,180,252,0.7), rgba(99,102,241,0.95))",
                borderRadius: 3,
                boxShadow: "0 0 6px rgba(99,102,241,0.8)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Complete button */}
      {!task.isCompleted && (
        <motion.button
          onClick={e => { e.stopPropagation(); onComplete(); }}
          data-testid={`button-inspect-complete-${task.id}`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: "100%", padding: "9px 0", borderRadius: 4, cursor: "pointer",
            background: "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(129,140,248,0.8))",
            border: "1px solid rgba(165,180,252,0.35)",
            color: "white", fontFamily: "var(--font-mono)", fontSize: 10,
            fontWeight: 700, letterSpacing: "0.12em",
            boxShadow: "0 0 20px rgba(99,102,241,0.4), 0 0 40px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
            position: "relative", overflow: "hidden",
          }}
        >
          <motion.span
            animate={{ textShadow: ["0 0 0px rgba(255,255,255,0)", "0 0 10px rgba(255,255,255,0.3)", "0 0 0px rgba(255,255,255,0)"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            ◆ COMPLETE QUEST · +{task.rewardXp} XP · +{task.rewardPoints} 🪙
          </motion.span>
        </motion.button>
      )}
    </motion.div>
  );
}

// ── Quest Card ────────────────────────────────────────────────────────────────
function QuestCard({
  task, stats, onComplete, onDelete,
}: {
  task: Task; stats: UserStats | null | undefined; onComplete: () => void; onDelete: () => void;
}) {
  const [inspecting, setInspecting] = useState(false);
  const [hovered, setHovered] = useState(false);

  const showOverlay = inspecting || hovered;

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { if (!inspecting) setHovered(false); }}
      className={`
        group relative bg-card rounded-2xl p-6 border transition-all duration-300 overflow-hidden
        ${task.isCompleted ? "border-border opacity-60" : "border-border/50 hover:border-primary/50"}
      `}
      style={{
        minHeight: 220,
        boxShadow: task.isCompleted
          ? "none"
          : hovered
            ? "0 0 30px rgba(99,102,241,0.2), 0 0 60px rgba(99,102,241,0.1)"
            : "0 0 15px rgba(99,102,241,0.08)",
      }}
      animate={{
        boxShadow: task.isCompleted
          ? "none"
          : hovered
            ? ["0 0 30px rgba(99,102,241,0.2), 0 0 60px rgba(99,102,241,0.1)", "0 0 40px rgba(99,102,241,0.3), 0 0 80px rgba(99,102,241,0.15)", "0 0 30px rgba(99,102,241,0.2), 0 0 60px rgba(99,102,241,0.1)"]
            : "0 0 15px rgba(99,102,241,0.08)",
      }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Inspect pin button */}
      {!task.isCompleted && (
        <button
          onClick={e => { e.stopPropagation(); setInspecting(v => !v); setHovered(false); }}
          data-testid={`button-inspect-${task.id}`}
          title={inspecting ? "Close inspect" : "Inspect quest"}
          style={{
            position: "absolute", top: 10, right: 10, zIndex: 30,
            padding: "3px 8px", borderRadius: 4, cursor: "pointer",
            background: inspecting ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.07)",
            border: `1px solid ${inspecting ? "rgba(99,102,241,0.55)" : "rgba(99,102,241,0.2)"}`,
            color: inspecting ? "rgba(165,180,252,0.9)" : "rgba(99,102,241,0.45)",
            fontFamily: "var(--font-mono)", fontSize: 8,
            letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 4,
            transition: "all 0.2s",
          }}
        >
          <Search style={{ width: 9, height: 9 }} />
          {inspecting ? "CLOSE" : "INSPECT"}
        </button>
      )}

      {/* Card body */}
      <div className="flex justify-between items-start mb-4">
        <span className={`
          px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider
          ${task.difficulty === 'hard'   ? 'bg-red-500/10 text-red-500' :
            task.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}
        `}>
          {task.difficulty}
        </span>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded capitalize" style={{ marginRight: 50 }}>
          {task.category.replace('_', ' ')}
        </span>
      </div>

      <h3 className={`font-bold text-lg mb-2 ${task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
        {task.title}
      </h3>

      <p className="text-sm text-muted-foreground mb-6 line-clamp-2 min-h-[40px]">
        {task.description || "No description provided."}
      </p>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex flex-col text-xs font-medium gap-1">
          <span className="text-accent">+{task.rewardXp} XP</span>
          <span className="text-yellow-500">+{task.rewardPoints} Gold</span>
        </div>

        <div className="flex gap-2">
          {!task.isCompleted && (
            <motion.button
              onClick={onComplete}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: "6px 12px", borderRadius: 6,
                fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", fontWeight: 600,
                cursor: "pointer",
                background: "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(129,140,248,0.8))",
                border: "1px solid rgba(165,180,252,0.4)",
                color: "white",
                boxShadow: "0 0 15px rgba(99,102,241,0.35), 0 0 30px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.15)",
                transition: "all 0.2s",
              }}
            >
              Complete
            </motion.button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Inspect overlay */}
      <AnimatePresence>
        {showOverlay && stats && !task.isCompleted && (
          <QuestInspectOverlay
            task={task}
            stats={stats}
            onComplete={() => { onComplete(); setInspecting(false); setHovered(false); }}
            onClose={() => { setInspecting(false); setHovered(false); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Tasks page ────────────────────────────────────────────────────────────────
export default function Tasks() {
  const { data: tasks, isLoading } = useTasks();
  const { data: stats } = useUserStats();
  const { mutate: deleteTask } = useDeleteTask();
  const { mutate: completeTask } = useCompleteTask();
  const { playSound } = useSound();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleComplete = (id: number) => {
    playSound("task");
    completeTask(id, {
      onError: (error: Error) => {
        toast({
          title: "Quest Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const filteredTasks = tasks?.filter(task => {
    if (filter === "all")       return !task.isCompleted;
    if (filter === "completed") return task.isCompleted;
    return task.category === filter && !task.isCompleted;
  });

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display">Quest Board</h1>
          <p className="text-muted-foreground mt-1">Manage your active missions and daily habits.</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Active Quests</SelectItem>
              <SelectItem value="daily">Dailies</SelectItem>
              <SelectItem value="habit">Habits</SelectItem>
              <SelectItem value="one_time">One-time</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <CreateTaskDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {filteredTasks?.map((task) => (
            <motion.div
              key={task.id}
              layout
              variants={staggerChild}
              exit={{ opacity: 0, scale: 0.92, filter: "blur(6px)", transition: { duration: 0.2 } }}
            >
              <QuestCard
                task={task}
                stats={stats}
                onComplete={() => handleComplete(task.id)}
                onDelete={() => deleteTask(task.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredTasks?.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-2">No quests found</h3>
          <p className="text-muted-foreground">Adjust your filters or create a new quest to begin.</p>
        </div>
      )}
    </div>
  );
}

// ── Create Task Dialog ────────────────────────────────────────────────────────
function CreateTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutate: createTask, isPending } = useCreateTask();
  const { toast } = useToast();
  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "", description: "", category: "one_time", difficulty: "easy",
      rewardXp: 10, rewardPoints: 5,
    },
  });

  const onSubmit = (data: InsertTask) => {
    createTask(data, {
      onSuccess: () => {
        toast({ title: "Quest Created!", description: "Your new quest has been added to the board." });
        onOpenChange(false);
        form.reset();
      },
      onError: (error: any) => {
        toast({ title: "Failed to create quest", description: error.message || "Something went wrong", variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
          <Plus className="w-4 h-4 mr-2" /> New Quest
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Quest</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input {...form.register("title")} placeholder="E.g., Read 10 pages" data-testid="input-task-title" />
            {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea {...form.register("description")} placeholder="Details about this quest..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select onValueChange={(val) => form.setValue("category", val as any)} defaultValue="one_time">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="habit">Habit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <Select onValueChange={(val) => {
                form.setValue("difficulty", val as any);
                if (val === "easy")   { form.setValue("rewardXp", 15);  form.setValue("rewardPoints", 3); }
                if (val === "medium") { form.setValue("rewardXp", 30);  form.setValue("rewardPoints", 6); }
                if (val === "hard")   { form.setValue("rewardXp", 60);  form.setValue("rewardPoints", 12); }
              }} defaultValue="easy">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">XP Reward</label>
              <Input
                type="number"
                {...form.register("rewardXp", { valueAsNumber: true })}
                placeholder="10"
              />
              {form.formState.errors.rewardXp && <p className="text-xs text-destructive">{form.formState.errors.rewardXp.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Gold Reward</label>
              <Input
                type="number"
                {...form.register("rewardPoints", { valueAsNumber: true })}
                placeholder="5"
              />
              {form.formState.errors.rewardPoints && <p className="text-xs text-destructive">{form.formState.errors.rewardPoints.message}</p>}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating..." : "Create Quest"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
