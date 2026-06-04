import { useUserStats } from "@/hooks/use-gamification";
import { useTasks, useCompleteTask } from "@/hooks/use-tasks";
import { Loader2, Circle, ArrowRight } from "lucide-react";
import { motion, useAnimationFrame } from "framer-motion";
import { format } from "date-fns";
import { Link } from "wouter";
import { getRank, xpForLevel } from "@shared/levels";
import { useRef } from "react";

// Fixed particle positions so they don't recompute on render
const HERO_PARTICLES = [
  { left: "8%",  top: "18%", size: 2,   dur: 4.2, delay: 0    },
  { left: "78%", top: "12%", size: 1.5, dur: 5.8, delay: 0.9  },
  { left: "62%", top: "72%", size: 2.5, dur: 3.9, delay: 1.4  },
  { left: "25%", top: "80%", size: 1.5, dur: 6.1, delay: 0.3  },
  { left: "90%", top: "55%", size: 2,   dur: 4.7, delay: 2.1  },
  { left: "42%", top: "25%", size: 1,   dur: 5.3, delay: 1.7  },
  { left: "15%", top: "55%", size: 1.5, dur: 3.5, delay: 2.6  },
  { left: "55%", top: "90%", size: 2,   dur: 6.8, delay: 0.6  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="hud-label">{children}</span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.3), transparent)" }} />
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <motion.div
      className="flex flex-col gap-1 p-4 relative overflow-hidden"
      style={{
        background: "rgba(6,10,26,0.9)",
        border: `1px solid ${color}25`,
        borderRadius: "4px",
      }}
      whileHover={{ borderColor: `${color}55`, boxShadow: `0 0 18px ${color}18` }}
      transition={{ duration: 0.3 }}
    >
      {/* Corner bracket accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: `${color}50` }} />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: `${color}50` }} />

      {/* Subtle pulse shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0, 0.04, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(ellipse at center, ${color} 0%, transparent 70%)` }}
      />

      <span className="hud-label relative z-10" style={{ color: `${color}70` }}>{label}</span>
      <span className="text-2xl font-bold relative z-10" style={{ fontFamily: "var(--font-mono)", color }}>
        {value}
      </span>
    </motion.div>
  );
}

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   "rgba(74,222,128,0.8)",
  medium: "rgba(234,179,8,0.8)",
  hard:   "rgba(239,68,68,0.8)",
};

export default function Home() {
  const { data: stats } = useUserStats();
  const { data: tasks, isLoading } = useTasks();
  const { mutate: completeTask, isPending: isCompleting } = useCompleteTask();

  const dailyQuests    = tasks?.filter(t => t.category === "daily" && !t.isCompleted) ?? [];
  const activeTasks    = tasks?.filter(t => !t.isCompleted).slice(0, 4) ?? [];
  const completedToday = tasks?.filter(t => t.isCompleted).length ?? 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(99,102,241,0.6)" }} />
      </div>
    );
  }

  const rank        = getRank(stats?.level ?? 1);
  const xpForNext   = xpForLevel(stats?.level ?? 1);
  const xpProgress  = Math.min(100, ((stats?.xp ?? 0) / xpForNext) * 100);

  return (
    <div className="p-5 md:p-8 space-y-8 max-w-7xl mx-auto">

      {/* ── Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.12) 0%, rgba(4,7,18,0.0) 60%), rgba(6,10,26,0.95)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: "6px",
          boxShadow: "0 0 40px rgba(99,102,241,0.07)",
        }}
      >
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />

        {/* Ambient floating particles */}
        {HERO_PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: p.left,
              top: p.top,
              width: p.size + "px",
              height: p.size + "px",
              background: "rgba(129,140,248,0.7)",
              boxShadow: "0 0 4px rgba(129,140,248,0.5)",
            }}
            animate={{ y: [0, -14, 0], opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}

        {/* Animated sweep scan line */}
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.35), transparent)" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Static background scan lines */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{
              top: `${20 + i * 22}%`,
              background: "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.05) 50%, transparent 100%)",
            }}
          />
        ))}

        {/* Breathing border glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-[6px]"
          animate={{ boxShadow: ["0 0 0px rgba(99,102,241,0)", "0 0 30px rgba(99,102,241,0.1)", "0 0 0px rgba(99,102,241,0)"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
          {/* Left: identity */}
          <div className="flex-1">
            <div className="hud-label mb-2">◈ PLAYER STATUS / OBJECTIVE</div>
            <h1
              className="text-3xl md:text-5xl font-black mb-1"
              style={{
                fontFamily: "var(--font-display)",
                background: "linear-gradient(135deg, #e2e8f0, #c7d2fe 40%, #818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 24px rgba(99,102,241,0.3))",
              }}
            >
              Rank {rank} — Level {stats?.level ?? 1}
            </h1>
            <p
              className="text-sm mb-5"
              style={{ color: "rgba(148,163,184,0.65)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}
            >
              Complete quests · earn XP · arise.
            </p>

            {/* XP bar */}
            <div className="mb-5 max-w-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="hud-label">XP PROGRESS</span>
                <span className="hud-label">{stats?.xp ?? 0} / {xpForNext}</span>
              </div>
              <div className="h-2 rounded-sm overflow-hidden relative" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <motion.div
                  className="h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 1.4, ease: "easeOut" }}
                  style={{
                    background: "linear-gradient(90deg, rgba(99,102,241,0.7), rgba(129,140,248,1))",
                    boxShadow: "0 0 10px rgba(99,102,241,0.7)",
                  }}
                />
                {/* shimmer on bar */}
                <motion.div
                  className="absolute top-0 bottom-0 w-8 pointer-events-none"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)", left: "-2rem" }}
                  animate={{ left: ["−2rem", "110%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 1.5, ease: "easeInOut" }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/tasks"
                className="px-5 py-2.5 text-sm font-bold tracking-widest uppercase transition-all duration-200"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(79,70,229,0.85))",
                  border: "1px solid rgba(129,140,248,0.4)",
                  borderRadius: "3px",
                  color: "white",
                  boxShadow: "0 0 20px rgba(99,102,241,0.25)",
                }}
              >
                ▸ &nbsp;Begin Quests
              </Link>
              <Link
                href="/shop"
                className="px-5 py-2.5 text-sm font-semibold tracking-wider transition-all duration-200"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  borderRadius: "3px",
                  color: "rgba(165,180,252,0.8)",
                }}
              >
                ◆ &nbsp;Shop
              </Link>
            </div>
          </div>

          {/* Right: stat blocks */}
          <div className="grid grid-cols-2 gap-3 md:min-w-[220px]">
            <StatBlock label="LEVEL"  value={`${stats?.level ?? 1}`}    color="rgba(129,140,248,1)"    />
            <StatBlock label="GOLD"   value={`${stats?.points ?? 0}`}   color="rgba(234,179,8,0.9)"   />
            <StatBlock label="STREAK" value={`${stats?.streak ?? 0}D`}  color="rgba(249,115,22,0.9)"  />
            <StatBlock label="DONE"   value={`${completedToday}`}       color="rgba(74,222,128,0.8)"  />
          </div>
        </div>
      </motion.div>

      {/* ── Daily Quests + Active Tasks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Daily Quests */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SectionLabel>◈ DAILY QUESTS</SectionLabel>
          <div className="space-y-2">
            {dailyQuests.length === 0 ? (
              <div
                className="p-6 text-center"
                style={{
                  background: "rgba(6,10,26,0.8)",
                  border: "1px dashed rgba(99,102,241,0.2)",
                  borderRadius: "4px",
                  color: "rgba(99,102,241,0.5)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8rem",
                  letterSpacing: "0.1em",
                }}
              >
                ✓ ALL DAILIES COMPLETE
              </div>
            ) : (
              dailyQuests.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.07 }}
                  className="quest-card flex items-start gap-4 p-4 group cursor-default"
                  style={{ borderRadius: "4px" }}
                >
                  <button
                    disabled={isCompleting}
                    onClick={() => completeTask(task.id)}
                    data-testid={`button-complete-task-${task.id}`}
                    className="mt-0.5 flex-shrink-0 transition-all duration-200"
                    style={{ color: "rgba(99,102,241,0.4)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(74,222,128,0.9)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(99,102,241,0.4)")}
                  >
                    <Circle className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: "rgba(199,210,254,0.9)" }}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(100,116,139,0.7)" }}>
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="system-badge" style={{ color: "rgba(74,222,128,0.8)", borderColor: "rgba(74,222,128,0.2)", fontSize: "0.65rem" }}>
                        +{task.rewardXp} XP
                      </span>
                      <span className="system-badge" style={{ color: "rgba(234,179,8,0.8)", borderColor: "rgba(234,179,8,0.2)", fontSize: "0.65rem" }}>
                        +{task.rewardPoints} G
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.section>

        {/* Active Tasks */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <SectionLabel>◈ ACTIVE TASKS</SectionLabel>
          <div className="space-y-2">
            {activeTasks.length === 0 ? (
              <div
                className="p-6 text-center"
                style={{
                  background: "rgba(6,10,26,0.8)",
                  border: "1px dashed rgba(99,102,241,0.2)",
                  borderRadius: "4px",
                  color: "rgba(99,102,241,0.5)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8rem",
                  letterSpacing: "0.1em",
                }}
              >
                NO ACTIVE TASKS
              </div>
            ) : (
              activeTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.07 }}
                  className="quest-card flex items-center gap-3 p-4"
                  style={{ borderRadius: "4px" }}
                >
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: DIFFICULTY_COLOR[task.difficulty] ?? "rgba(99,102,241,0.6)" }}
                    animate={{ boxShadow: [`0 0 4px ${DIFFICULTY_COLOR[task.difficulty] ?? "rgba(99,102,241,0.6)"}`, `0 0 10px ${DIFFICULTY_COLOR[task.difficulty] ?? "rgba(99,102,241,0.6)"}`, `0 0 4px ${DIFFICULTY_COLOR[task.difficulty] ?? "rgba(99,102,241,0.6)"}`] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "rgba(199,210,254,0.85)" }}>
                      {task.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ fontFamily: "var(--font-mono)", color: "rgba(100,116,139,0.6)", fontSize: "0.65rem", letterSpacing: "0.08em" }}>
                      {task.category.toUpperCase()} · {task.difficulty.toUpperCase()}
                    </p>
                  </div>
                  {task.dueDate && (
                    <span className="text-xs whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", color: "rgba(99,102,241,0.5)", fontSize: "0.65rem" }}>
                      {format(new Date(task.dueDate), "MMM d")}
                    </span>
                  )}
                </motion.div>
              ))
            )}

            <Link
              href="/tasks"
              className="flex items-center justify-center gap-2 p-3 transition-all duration-200"
              style={{
                background: "rgba(99,102,241,0.04)",
                border: "1px dashed rgba(99,102,241,0.2)",
                borderRadius: "4px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                letterSpacing: "0.12em",
                color: "rgba(99,102,241,0.5)",
              }}
            >
              + ADD NEW QUEST <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
