import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUpBlur, fadeTransition } from "@/lib/animations";
import type { Task } from "@shared/schema";
import { Swords, Play, Square, CircleCheck as CheckCircle2, Skull as SkullIcon, TriangleAlert as AlertTriangle, Clock, Trophy, Coins, Plus, Minus } from "lucide-react";

/* ─── helpers ─────────────────────────────────────────────── */
function fmtTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function CircleProgress({
  progress,
  isOvertime,
  size = 220,
}: { progress: number; isOvertime: boolean; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(1, Math.max(0, progress));
  const gap  = circ - dash;

  const trackColor  = "rgba(30,35,60,0.6)";
  const activeColor = isOvertime ? "rgba(239,68,68,0.85)" : "rgba(99,102,241,0.9)";
  const glowColor   = isOvertime ? "rgba(239,68,68,0.4)"  : "rgba(99,102,241,0.35)";

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <defs>
        <filter id="arcGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={activeColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
        animate={{ strokeDasharray: `${dash} ${gap}` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </svg>
  );
}

function CornerBrackets({ color = "rgba(99,102,241,0.5)" }: { color?: string }) {
  const s: React.CSSProperties = { borderColor: color };
  return (
    <>
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2" style={s} />
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2" style={s} />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2" style={s} />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2" style={s} />
    </>
  );
}

/* ─── component ───────────────────────────────────────────── */
type Phase = "setup" | "running" | "done";
type Result = "completed" | "abandoned" | null;

export default function QuestTimer() {
  const { toast } = useToast();
  const { user } = useAuth();
  const playerName = user?.firstName
    ? user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1) + " Sama"
    : "Hunter";

  /* ── server data ──────────────────────────────────────── */
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const incompleteTasks = tasks.filter(
    (t) => !t.isCompleted || t.category === "daily" || t.category === "habit",
  );

  const penaltyMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/quest-timer/penalty"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/tasks/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-stats"] });
    },
  });

  /* ── timer state ──────────────────────────────────────── */
  const [phase, setPhase]               = useState<Phase>("setup");
  const [result, setResult]             = useState<Result>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | "">("");
  const [timeLimit, setTimeLimit]       = useState(25); // minutes
  const [startedAt, setStartedAt]       = useState<number | null>(null);
  const [now, setNow]                   = useState<number>(Date.now());
  const [penaltiesApplied, setPenaltiesApplied] = useState(0);
  const [wasOvertime, setWasOvertime]   = useState(false);
  const penaltiesRef = useRef(0);

  /* ── derived values ────────────────────────────────────── */
  const timeLimitMs    = timeLimit * 60 * 1000;
  const elapsed        = startedAt ? now - startedAt : 0;
  const remaining      = Math.max(0, timeLimitMs - elapsed);
  const isOvertime     = phase === "running" && elapsed > timeLimitMs;
  const overtimeMs     = isOvertime ? elapsed - timeLimitMs : 0;
  const penaltiesDue   = Math.floor(overtimeMs / (5 * 60 * 1000));
  const totalGoldLost  = penaltiesApplied * 5;
  const selectedTask   = tasks.find((t) => t.id === selectedTaskId);
  const progress       = isOvertime
    ? 0
    : timeLimitMs > 0 ? remaining / timeLimitMs : 0;

  /* ── tick every second while running ──────────────────── */
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [phase]);

  /* ── overtime entrance toast ───────────────────────────── */
  useEffect(() => {
    if (isOvertime && !wasOvertime) {
      setWasOvertime(true);
      toast({
        title: "⚠ TIME EXPIRED",
        description: "You are now in OVERTIME. -5 GOLD every 5 minutes.",
        variant: "destructive",
      });
    }
  }, [isOvertime, wasOvertime, toast]);

  /* ── penalty fire ─────────────────────────────────────── */
  useEffect(() => {
    if (!isOvertime) return;
    if (penaltiesDue > penaltiesRef.current) {
      const newCount = penaltiesDue;
      penaltiesRef.current = newCount;
      setPenaltiesApplied(newCount);
      penaltyMutation.mutate();
      toast({
        title: `⚠ -5 GOLD PENALTY`,
        description: `${newCount * 5} gold lost for overtime. Complete your quest, ${playerName}!`,
        variant: "destructive",
      });
    }
  }, [penaltiesDue, isOvertime]);

  /* ── actions ──────────────────────────────────────────── */
  const handleStart = () => {
    if (!selectedTaskId || timeLimit < 1) return;
    setStartedAt(Date.now());
    setNow(Date.now());
    setPenaltiesApplied(0);
    penaltiesRef.current = 0;
    setWasOvertime(false);
    setResult(null);
    setPhase("running");
  };

  const handleComplete = async () => {
    setPhase("done");
    setResult("completed");
    if (typeof selectedTaskId === "number") {
      completeMutation.mutate(selectedTaskId);
    }
    toast({ title: "✓ QUEST COMPLETE", description: `Well done, ${playerName}!` });
  };

  const handleAbandon = () => {
    setPhase("done");
    setResult("abandoned");
  };

  const handleReset = () => {
    setPhase("setup");
    setResult(null);
    setStartedAt(null);
    setPenaltiesApplied(0);
    penaltiesRef.current = 0;
    setWasOvertime(false);
    setSelectedTaskId("");
  };

  /* ─── SETUP PHASE ──────────────────────────────────────── */
  if (phase === "setup") {
    return (
      <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-6">
        <motion.div variants={fadeUpBlur} initial="hidden" animate="visible" transition={fadeTransition}>
          <div className="hud-label mb-1">◈ QUEST TIMER MODULE</div>
          <h1 className="text-3xl font-black tracking-widest uppercase"
            style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}>
            Quest Timer
          </h1>
          <p style={{ color: "rgba(100,116,139,0.7)", fontSize: "0.78rem", marginTop: "4px" }}>
            Set a time limit for a quest. Every 5 minutes wasted in overtime costs 5 gold.
          </p>
        </motion.div>

        <div className="h-px" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.4), transparent)" }} />

        <motion.div variants={fadeUpBlur} initial="hidden" animate="visible"
          transition={{ ...fadeTransition, delay: 0.1 }}
          className="relative p-6 space-y-6"
          style={{ background: "rgba(6,10,26,0.9)", border: "1px solid rgba(30,35,60,0.7)", borderRadius: "4px" }}
        >
          <CornerBrackets />

          {/* Quest select */}
          <div>
            <div className="hud-label mb-3">◈ SELECT QUEST</div>
            {incompleteTasks.length === 0 ? (
              <div className="text-center py-6" style={{ color: "rgba(100,116,139,0.5)", fontSize: "0.8rem" }}>
                No active quests found. Add quests on the Quests page first.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-app pr-1">
                {incompleteTasks.map((task) => {
                  const sel = selectedTaskId === task.id;
                  const diffColor: Record<string, string> = {
                    easy: "rgba(34,197,94,0.8)", medium: "rgba(234,179,8,0.8)",
                    hard: "rgba(249,115,22,0.8)", legendary: "rgba(168,85,247,0.8)",
                  };
                  return (
                    <button
                      key={task.id}
                      data-testid={`select-task-${task.id}`}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left transition-all duration-200"
                      style={{
                        background: sel ? "rgba(99,102,241,0.12)" : "rgba(10,14,30,0.7)",
                        border: `1px solid ${sel ? "rgba(99,102,241,0.5)" : "rgba(30,35,60,0.5)"}`,
                        borderRadius: "3px",
                        color: sel ? "rgba(199,210,254,0.95)" : "rgba(148,163,184,0.75)",
                        boxShadow: sel ? "0 0 12px rgba(99,102,241,0.1)" : "none",
                      }}
                    >
                      <span style={{ fontSize: "0.85rem" }}>{task.title}</span>
                      <span className="hud-label" style={{
                        color: diffColor[task.difficulty] ?? "rgba(100,116,139,0.6)",
                        fontSize: "0.55rem",
                      }}>
                        {task.difficulty?.toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Time limit */}
          <div>
            <div className="hud-label mb-3">◈ TIME LIMIT</div>
            <div className="flex items-center gap-4">
              <button
                data-testid="button-decrease-time"
                onClick={() => setTimeLimit(t => Math.max(1, t - 5))}
                className="w-10 h-10 flex items-center justify-center transition-all duration-200"
                style={{ background: "rgba(10,14,30,0.8)", border: "1px solid rgba(30,35,60,0.6)", borderRadius: "3px", color: "rgba(148,163,184,0.7)" }}
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="flex-1 text-center">
                <div
                  className="text-5xl font-black tabular-nums"
                  style={{ fontFamily: "var(--font-mono)", color: "rgba(165,180,252,0.95)" }}
                  data-testid="text-time-limit"
                >
                  {String(timeLimit).padStart(2, "0")}
                </div>
                <div className="hud-label" style={{ fontSize: "0.55rem", color: "rgba(100,116,139,0.55)", marginTop: "4px" }}>
                  MINUTES
                </div>
              </div>

              <button
                data-testid="button-increase-time"
                onClick={() => setTimeLimit(t => Math.min(180, t + 5))}
                className="w-10 h-10 flex items-center justify-center transition-all duration-200"
                style={{ background: "rgba(10,14,30,0.8)", border: "1px solid rgba(30,35,60,0.6)", borderRadius: "3px", color: "rgba(148,163,184,0.7)" }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 mt-3">
              {[5, 15, 25, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setTimeLimit(m)}
                  data-testid={`button-preset-${m}`}
                  className="flex-1 py-1.5 font-bold transition-all duration-200"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.65rem",
                    letterSpacing: "0.04em",
                    background: timeLimit === m ? "rgba(99,102,241,0.15)" : "rgba(10,14,30,0.6)",
                    border: `1px solid ${timeLimit === m ? "rgba(99,102,241,0.5)" : "rgba(30,35,60,0.5)"}`,
                    borderRadius: "3px",
                    color: timeLimit === m ? "rgba(165,180,252,0.9)" : "rgba(100,116,139,0.6)",
                  }}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Penalty info */}
          <div
            className="flex items-start gap-3 p-3"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: "3px" }}
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgba(248,113,113,0.7)" }} />
            <p style={{ color: "rgba(248,113,113,0.65)", fontSize: "0.75rem", lineHeight: 1.55 }}>
              If you exceed your time limit, you enter <strong style={{ color: "rgba(248,113,113,0.85)" }}>OVERTIME</strong>.
              Every 5 minutes of overtime deducts <strong style={{ color: "rgba(248,113,113,0.85)" }}>5 GOLD</strong> from your balance.
            </p>
          </div>

          {/* Start button */}
          <button
            data-testid="button-start-timer"
            onClick={handleStart}
            disabled={!selectedTaskId || timeLimit < 1}
            className="w-full flex items-center justify-center gap-3 py-3.5 font-black tracking-widest uppercase transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              background: selectedTaskId ? "rgba(99,102,241,0.18)" : "rgba(15,20,40,0.7)",
              border: `1px solid ${selectedTaskId ? "rgba(99,102,241,0.55)" : "rgba(30,35,60,0.5)"}`,
              borderRadius: "3px",
              color: selectedTaskId ? "rgba(199,210,254,0.95)" : "rgba(100,116,139,0.4)",
              boxShadow: selectedTaskId ? "0 0 20px rgba(99,102,241,0.12)" : "none",
              cursor: selectedTaskId ? "pointer" : "not-allowed",
            }}
          >
            <Play className="w-5 h-5" /> INITIATE QUEST TIMER
          </button>
        </motion.div>
      </div>
    );
  }

  /* ─── RUNNING PHASE ────────────────────────────────────── */
  if (phase === "running") {
    const borderColor = isOvertime ? "rgba(239,68,68,0.45)" : "rgba(99,102,241,0.35)";
    const accentColor = isOvertime ? "rgba(248,113,113,0.9)" : "rgba(165,180,252,0.95)";
    const glowShadow  = isOvertime
      ? "0 0 40px rgba(239,68,68,0.08)"
      : "0 0 40px rgba(99,102,241,0.08)";

    return (
      <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="hud-label mb-1">◈ QUEST TIMER — ACTIVE</div>
          <h2
            className="text-xl font-black tracking-widest uppercase truncate"
            style={{ fontFamily: "var(--font-display)", color: accentColor }}
          >
            {selectedTask?.title ?? "UNKNOWN QUEST"}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="hud-label" style={{ color: "rgba(100,116,139,0.55)", fontSize: "0.6rem" }}>
              CATEGORY: {selectedTask?.category?.toUpperCase() ?? "—"}
            </span>
            <span className="hud-label" style={{ color: "rgba(100,116,139,0.55)", fontSize: "0.6rem" }}>
              LIMIT: {timeLimit}MIN
            </span>
          </div>
        </motion.div>

        <div className="h-px" style={{ background: `linear-gradient(90deg, ${isOvertime ? "rgba(239,68,68,0.4)" : "rgba(99,102,241,0.4)"}, transparent)` }} />

        {/* Central timer HUD */}
        <motion.div
          className="relative p-6 flex flex-col items-center gap-5"
          style={{ background: "rgba(6,10,26,0.9)", border: `1px solid ${borderColor}`, borderRadius: "4px", boxShadow: glowShadow }}
        >
          <CornerBrackets color={borderColor} />

          {/* Overtime badge */}
          <AnimatePresence>
            {isOvertime && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 py-1.5"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "3px" }}
              >
                <AlertTriangle className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.8)" }} />
                <span className="hud-label" style={{ color: "rgba(248,113,113,0.85)", fontSize: "0.6rem" }}>
                  OVERTIME — PENALTIES ACTIVE
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ring + time */}
          <div className="relative flex items-center justify-center">
            <motion.div
              animate={isOvertime ? { opacity: [1, 0.6, 1] } : {}}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <CircleProgress progress={progress} isOvertime={isOvertime} />
            </motion.div>

            <div className="absolute flex flex-col items-center">
              {/* Countdown / overtime label */}
              <div
                className="hud-label mb-1"
                style={{ color: isOvertime ? "rgba(248,113,113,0.6)" : "rgba(99,102,241,0.5)", fontSize: "0.55rem" }}
              >
                {isOvertime ? "OVERTIME" : "REMAINING"}
              </div>
              <div
                className="font-black tabular-nums"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "2.6rem",
                  color: isOvertime ? "rgba(248,113,113,0.95)" : "rgba(165,180,252,0.95)",
                  lineHeight: 1,
                  textShadow: isOvertime ? "0 0 20px rgba(239,68,68,0.3)" : "0 0 20px rgba(99,102,241,0.25)",
                }}
                data-testid="text-timer-display"
              >
                {isOvertime ? fmtTime(overtimeMs) : fmtTime(remaining)}
              </div>
              {isOvertime && (
                <div
                  className="hud-label mt-1"
                  style={{ color: "rgba(248,113,113,0.5)", fontSize: "0.55rem" }}
                >
                  NEXT PENALTY IN {fmtTime((5 * 60 * 1000) - (overtimeMs % (5 * 60 * 1000)))}
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 w-full">
            {[
              { label: "ELAPSED", value: fmtTime(elapsed), icon: Clock, color: "rgba(148,163,184,0.7)" },
              { label: "GOLD LOST", value: `-${totalGoldLost}`, icon: Coins, color: "rgba(248,113,113,0.75)" },
              { label: "PENALTIES", value: `×${penaltiesApplied}`, icon: AlertTriangle, color: "rgba(249,115,22,0.75)" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="flex-1 flex flex-col items-center py-3 gap-1"
                style={{ background: "rgba(10,14,30,0.7)", border: "1px solid rgba(30,35,60,0.5)", borderRadius: "3px" }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <div className="font-black tabular-nums" style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", color }}>
                  {value}
                </div>
                <div className="hud-label" style={{ fontSize: "0.5rem", color: "rgba(100,116,139,0.45)" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              data-testid="button-abandon-quest"
              onClick={handleAbandon}
              className="flex items-center justify-center gap-2 px-4 py-2.5 font-bold transition-all duration-200"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.06em",
                background: "rgba(15,20,40,0.8)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "3px",
                color: "rgba(248,113,113,0.65)",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.5)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.25)"}
            >
              <Square className="w-3.5 h-3.5" /> ABANDON
            </button>

            <button
              data-testid="button-complete-quest"
              onClick={handleComplete}
              disabled={completeMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 font-black tracking-widest transition-all duration-200"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.45)",
                borderRadius: "3px",
                color: "rgba(134,239,172,0.95)",
                boxShadow: "0 0 16px rgba(34,197,94,0.08)",
              }}
            >
              <CheckCircle2 className="w-4 h-4" /> COMPLETE QUEST
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─── DONE PHASE ───────────────────────────────────────── */
  const timeTaken = startedAt ? Date.now() - startedAt : 0;
  const completedInTime = result === "completed" && !wasOvertime;
  const completedOvertime = result === "completed" && wasOvertime;
  const abandoned = result === "abandoned";

  const statusColor = completedInTime
    ? "rgba(34,197,94,0.85)"
    : completedOvertime
    ? "rgba(234,179,8,0.85)"
    : "rgba(239,68,68,0.75)";

  const statusLabel = completedInTime
    ? "QUEST COMPLETE — FLAWLESS"
    : completedOvertime
    ? "QUEST COMPLETE — OVERTIME"
    : "QUEST ABANDONED";

  const statusIcon = completedInTime ? Trophy
    : completedOvertime ? CheckCircle2
    : SkullIcon;
  const StatusIcon = statusIcon;

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="hud-label mb-1">◈ QUEST TIMER — RESULT</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative p-8 flex flex-col items-center gap-6 text-center"
        style={{
          background: "rgba(6,10,26,0.9)",
          border: `1px solid ${statusColor.replace("0.85", "0.35")}`,
          borderRadius: "4px",
          boxShadow: `0 0 40px ${statusColor.replace("0.85", "0.06")}`,
        }}
      >
        <CornerBrackets color={statusColor.replace("0.85", "0.5")} />

        {/* Status icon */}
        <div
          className="w-20 h-20 flex items-center justify-center"
          style={{
            background: `${statusColor.replace("0.85", "0.08")}`,
            border: `1px solid ${statusColor.replace("0.85", "0.35")}`,
            borderRadius: "4px",
          }}
        >
          <StatusIcon className="w-10 h-10" style={{ color: statusColor }} />
        </div>

        <div>
          <div className="hud-label mb-2" style={{ color: statusColor, fontSize: "0.65rem" }}>
            {statusLabel}
          </div>
          <h2
            className="text-xl font-black tracking-widest uppercase"
            style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.9)" }}
          >
            {selectedTask?.title ?? "Quest"}
          </h2>
        </div>

        {/* Result stats */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {[
            { label: "TIME TAKEN", value: fmtTime(timeTaken) },
            { label: "TIME LIMIT", value: `${timeLimit}:00` },
            { label: "GOLD LOST", value: totalGoldLost > 0 ? `-${totalGoldLost}` : "NONE" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center py-4 gap-1"
              style={{ background: "rgba(10,14,30,0.7)", border: "1px solid rgba(30,35,60,0.5)", borderRadius: "3px" }}
            >
              <div
                className="font-black tabular-nums"
                style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", color: "rgba(165,180,252,0.9)" }}
              >
                {value}
              </div>
              <div className="hud-label" style={{ fontSize: "0.5rem", color: "rgba(100,116,139,0.5)" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {result === "completed" && (
          <div
            className="flex items-start gap-3 p-3 w-full"
            style={{
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: "3px",
            }}
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgba(134,239,172,0.7)" }} />
            <p style={{ color: "rgba(134,239,172,0.75)", fontSize: "0.78rem", lineHeight: 1.55 }}>
              Quest rewards have been applied to your account. Keep conquering, {playerName}!
            </p>
          </div>
        )}

        {abandoned && (
          <div
            className="flex items-start gap-3 p-3 w-full"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.18)",
              borderRadius: "3px",
            }}
          >
            <SkullIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgba(248,113,113,0.6)" }} />
            <p style={{ color: "rgba(248,113,113,0.65)", fontSize: "0.78rem", lineHeight: 1.55 }}>
              Quest abandoned. No rewards earned.
              {totalGoldLost > 0 && ` ${totalGoldLost} gold was already deducted for overtime.`}
            </p>
          </div>
        )}

        <button
          data-testid="button-new-quest-timer"
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 py-3 font-black tracking-widest uppercase transition-all duration-200"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.78rem",
            background: "rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.45)",
            borderRadius: "3px",
            color: "rgba(165,180,252,0.95)",
          }}
        >
          <Swords className="w-4 h-4" /> NEW QUEST TIMER
        </button>
      </motion.div>
    </div>
  );
}
