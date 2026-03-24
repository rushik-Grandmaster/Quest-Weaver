import { useUserStats } from "@/hooks/use-gamification";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { getRank, xpForLevel } from "@shared/levels";
import { xpBarTransition } from "@/lib/animations";

export function Header() {
  const { data: stats, isLoading } = useUserStats();
  const { user } = useAuth();

  if (isLoading || !stats) {
    return (
      <header
        className="h-14 flex items-center px-6"
        style={{
          background: "rgba(4,7,18,0.95)",
          borderBottom: "1px solid rgba(99,102,241,0.15)",
        }}
      >
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(99,102,241,0.5)" }} />
      </header>
    );
  }

  const xpForNextLevel = xpForLevel(stats.level);
  const progress = Math.min(100, (stats.xp / xpForNextLevel) * 100);
  const rank = getRank(stats.level);

  return (
    <header
      className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6 px-5 py-3 sticky top-0 z-40"
      style={{
        background: "rgba(4,7,18,0.95)",
        borderBottom: "1px solid rgba(99,102,241,0.15)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* ── Player info ── */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Level orb */}
        <div className="relative flex-shrink-0">
          <div
            className="w-11 h-11 flex items-center justify-center text-lg font-bold"
            style={{
              fontFamily: "var(--font-mono)",
              background: "radial-gradient(circle at 35% 35%, rgba(129,140,248,0.2), rgba(99,102,241,0.05))",
              border: "1px solid rgba(99,102,241,0.5)",
              borderRadius: "4px",
              color: "rgba(165,180,252,1)",
              boxShadow: "0 0 16px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {stats.level}
          </div>
          {/* Rank badge */}
          <div
            className="absolute -bottom-1.5 -right-1.5 w-5 h-5 flex items-center justify-center text-[9px] font-bold"
            style={{
              fontFamily: "var(--font-mono)",
              background: "rgba(4,7,18,0.95)",
              border: "1px solid rgba(99,102,241,0.6)",
              borderRadius: "2px",
              color: "rgba(165,180,252,1)",
              boxShadow: "0 0 8px rgba(99,102,241,0.3)",
            }}
          >
            {rank}
          </div>
        </div>

        {/* Name + XP bar */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold truncate"
              style={{ color: "rgba(199,210,254,0.9)", fontFamily: "var(--font-display)" }}
            >
              {user?.firstName ? `${user.firstName} Sama` : "Rushik Sama"}
            </span>
            <span
              className="hidden md:inline-block hud-label"
              style={{ color: "rgba(99,102,241,0.4)", fontSize: "0.55rem" }}
            >
              / SHADOW PLAYER
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* XP bar */}
            <div
              className="h-1.5 rounded-sm overflow-hidden flex-1 max-w-[180px]"
              style={{
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.15)",
              }}
            >
              <motion.div
                className="h-full"
                initial={{ width: 0, filter: "blur(4px)" }}
                animate={{ width: `${progress}%`, filter: "blur(0px)" }}
                transition={xpBarTransition}
                style={{
                  background: "linear-gradient(90deg, rgba(99,102,241,0.7), rgba(129,140,248,1), rgba(165,180,252,0.9))",
                  boxShadow: "0 0 10px rgba(99,102,241,0.7), 0 0 20px rgba(99,102,241,0.3)",
                }}
              />
            </div>
            <span
              className="text-[10px] whitespace-nowrap"
              style={{ fontFamily: "var(--font-mono)", color: "rgba(99,102,241,0.55)" }}
            >
              {stats.xp}/{xpForNextLevel} XP
            </span>
          </div>
        </div>
      </div>

      {/* ── Stat chips ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 md:pb-0 w-full md:w-auto">
        {/* Gold */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap flex-shrink-0"
          style={{
            background: "rgba(234,179,8,0.06)",
            border: "1px solid rgba(234,179,8,0.2)",
            borderRadius: "3px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            color: "rgba(234,179,8,0.9)",
          }}
        >
          <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>◆</span>
          <span>{stats.points.toLocaleString()} G</span>
        </div>

        {/* Streak */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap flex-shrink-0"
          style={{
            background: "rgba(249,115,22,0.06)",
            border: "1px solid rgba(249,115,22,0.2)",
            borderRadius: "3px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            color: "rgba(249,115,22,0.9)",
          }}
        >
          <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>🔥</span>
          <span>{stats.streak}D</span>
        </div>

        {/* Status online */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 whitespace-nowrap flex-shrink-0"
          style={{
            background: "rgba(74,222,128,0.05)",
            border: "1px solid rgba(74,222,128,0.18)",
            borderRadius: "3px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            color: "rgba(74,222,128,0.8)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          <span>ONLINE</span>
        </div>
      </div>
    </header>
  );
}
