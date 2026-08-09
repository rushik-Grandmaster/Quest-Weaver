import { motion } from "framer-motion";
import { Loader as Loader2, Mail, Calendar, Trophy, Flame, Coins, Zap, Shield, Star, TrendingUp, Award } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserStats } from "@/hooks/use-gamification";
import { useTasks } from "@/hooks/use-tasks";
import { getRank, xpForLevel, RANK_THRESHOLDS } from "@shared/levels";
import { format } from "date-fns";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="hud-label">{children}</span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.3), transparent)" }} />
    </div>
  );
}

function StatBlock({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
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
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: `${color}50` }} />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: `${color}50` }} />

      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0, 0.04, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: `radial-gradient(ellipse at center, ${color} 0%, transparent 70%)` }}
      />

      <div className="flex items-center gap-2 relative z-10">
        <Icon className="w-3.5 h-3.5" style={{ color: `${color}80` }} />
        <span className="hud-label" style={{ color: `${color}70` }}>{label}</span>
      </div>
      <span className="text-2xl font-bold relative z-10" style={{ fontFamily: "var(--font-mono)", color }}>
        {value}
      </span>
    </motion.div>
  );
}

export default function Profile() {
  const { user, isLoading: userLoading } = useAuth();
  const { data: stats } = useUserStats();
  const { data: tasks } = useTasks();

  if (userLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(99,102,241,0.6)" }} />
      </div>
    );
  }

  const rank = getRank(stats?.level ?? 1);
  const xpForNext = xpForLevel(stats?.level ?? 1);
  const xpProgress = Math.min(100, ((stats?.xp ?? 0) / xpForNext) * 100);

  const completedTasks = tasks?.filter((t) => t.isCompleted).length ?? 0;
  const totalTasks = tasks?.length ?? 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const currentRankIndex = RANK_THRESHOLDS.findIndex((r) => r.rank === rank);
  const nextRank = RANK_THRESHOLDS[currentRankIndex + 1];
  const prevRankLevel = currentRankIndex > 0 ? RANK_THRESHOLDS[currentRankIndex].minLevel : 1;
  const nextRankLevel = nextRank?.minLevel ?? stats?.level ?? 1;
  const rankProgress = nextRank
    ? Math.min(100, ((stats?.level ?? 1 - prevRankLevel) / (nextRankLevel - prevRankLevel)) * 100)
    : 100;

  const memberSince = user?.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "Unknown";

  return (
    <div className="p-5 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Profile Hero */}
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

        {/* Animated sweep scan line */}
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.35), transparent)" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Breathing border glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-[6px]"
          animate={{ boxShadow: ["0 0 0px rgba(99,102,241,0)", "0 0 30px rgba(99,102,241,0.1)", "0 0 0px rgba(99,102,241,0)"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
          {/* Avatar + identity */}
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-lg object-cover"
                  style={{ border: "2px solid rgba(99,102,241,0.5)" }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-lg flex items-center justify-center"
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    border: "2px solid rgba(99,102,241,0.5)",
                  }}
                >
                  <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color: "rgba(165,180,252,1)" }}>
                    {(user?.firstName?.[0] ?? "?").toUpperCase()}
                  </span>
                </div>
              )}
              {/* Rank badge overlay */}
              <div
                className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded text-xs font-bold"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "rgba(4,7,18,0.95)",
                  border: "1px solid rgba(99,102,241,0.6)",
                  color: "rgba(165,180,252,1)",
                }}
              >
                {rank}
              </div>
            </div>

            <div>
              <div className="hud-label mb-1">◈ HUNTER PROFILE</div>
              <h1
                className="text-2xl md:text-3xl font-black mb-1"
                style={{
                  fontFamily: "var(--font-display)",
                  background: "linear-gradient(135deg, #e2e8f0, #c7d2fe 40%, #818cf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 24px rgba(99,102,241,0.3))",
                }}
              >
                {user?.firstName ?? "Hunter"} {user?.lastName ?? ""}
              </h1>
              <div className="flex items-center gap-3 text-xs" style={{ fontFamily: "var(--font-mono)", color: "rgba(148,163,184,0.6)" }}>
                {user?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {user.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {memberSince}
                </span>
              </div>
            </div>
          </div>

          {/* XP bar */}
          <div className="flex-1 md:ml-auto md:max-w-xs">
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
              <motion.div
                className="absolute top-0 bottom-0 w-8 pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)", left: "-2rem" }}
                animate={{ left: ["-2rem", "110%"] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 1.5, ease: "easeInOut" }}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="hud-label">LV {stats?.level ?? 1}</span>
              <span className="hud-label">LV {(stats?.level ?? 1) + 1}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Core stats */}
      <div>
        <SectionLabel>◈ CORE STATS</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatBlock label="LEVEL" value={`${stats?.level ?? 1}`} icon={Zap} color="rgba(129,140,248,1)" />
          <StatBlock label="GOLD" value={`${stats?.points ?? 0}`} icon={Coins} color="rgba(234,179,8,0.9)" />
          <StatBlock label="STREAK" value={`${stats?.streak ?? 0}D`} icon={Flame} color="rgba(249,115,22,0.9)" />
          <StatBlock label="RANK" value={rank} icon={Shield} color="rgba(99,102,241,0.9)" />
          <StatBlock label="QUESTS" value={`${completedTasks}`} icon={Trophy} color="rgba(74,222,128,0.8)" />
          <StatBlock label="TRUST" value={`${stats?.trustScore ?? 100}`} icon={Star} color="rgba(165,180,252,0.9)" />
        </div>
      </div>

      {/* Rank progression */}
      <div>
        <SectionLabel>◈ RANK PROGRESSION</SectionLabel>
        <div
          className="p-6 relative overflow-hidden"
          style={{
            background: "rgba(6,10,26,0.9)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "4px",
          }}
        >
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: "rgba(99,102,241,0.5)" }} />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: "rgba(99,102,241,0.5)" }} />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: "rgba(99,102,241,0.8)" }} />
              <span className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)", color: "rgba(199,210,254,0.9)" }}>
                Rank {rank}
              </span>
            </div>
            {nextRank ? (
              <span className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "rgba(148,163,184,0.6)" }}>
                Next: Rank {nextRank.rank} at Lv. {nextRank.minLevel}
              </span>
            ) : (
              <span className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "rgba(234,179,8,0.8)" }}>
                ◈ MAX RANK ACHIEVED
              </span>
            )}
          </div>

          {/* Rank bar */}
          <div className="h-2.5 rounded-sm overflow-hidden relative" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
            <motion.div
              className="h-full"
              initial={{ width: 0 }}
              animate={{ width: `${rankProgress}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{
                background: "linear-gradient(90deg, rgba(99,102,241,0.6), rgba(165,180,252,0.9))",
                boxShadow: "0 0 8px rgba(99,102,241,0.5)",
              }}
            />
          </div>

          {/* Rank ladder */}
          <div className="flex items-center justify-between mt-5 gap-1">
            {RANK_THRESHOLDS.map((r, i) => {
              const isCurrent = r.rank === rank;
              const isPassed = i < currentRankIndex;
              return (
                <div key={r.rank} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: isCurrent
                        ? "rgba(99,102,241,0.2)"
                        : isPassed
                        ? "rgba(99,102,241,0.08)"
                        : "rgba(15,23,42,0.6)",
                      border: isCurrent
                        ? "1px solid rgba(165,180,252,0.7)"
                        : isPassed
                        ? "1px solid rgba(99,102,241,0.3)"
                        : "1px solid rgba(99,102,241,0.12)",
                      color: isCurrent
                        ? "rgba(199,210,254,1)"
                        : isPassed
                        ? "rgba(129,140,248,0.8)"
                        : "rgba(100,116,139,0.5)",
                      boxShadow: isCurrent ? "0 0 12px rgba(99,102,241,0.3)" : "none",
                    }}
                  >
                    {r.rank}
                  </div>
                  <span className="text-[0.55rem]" style={{ fontFamily: "var(--font-mono)", color: "rgba(100,116,139,0.5)" }}>
                    Lv.{r.minLevel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quest performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SectionLabel>◈ QUEST PERFORMANCE</SectionLabel>
          <div
            className="p-6 relative overflow-hidden"
            style={{
              background: "rgba(6,10,26,0.9)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "4px",
            }}
          >
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: "rgba(99,102,241,0.5)" }} />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: "rgba(99,102,241,0.5)" }} />

            <div className="flex items-center gap-4 mb-5">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" style={{ color: "rgba(74,222,128,0.8)" }} />
                <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-mono)", color: "rgba(74,222,128,0.9)" }}>
                  {completionRate}%
                </span>
              </div>
              <span className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "rgba(148,163,184,0.6)" }}>
                Completion Rate
              </span>
            </div>

            <div className="h-2 rounded-sm overflow-hidden mb-5" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <motion.div
                className="h-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{
                  background: "linear-gradient(90deg, rgba(74,222,128,0.6), rgba(74,222,128,0.9))",
                  boxShadow: "0 0 8px rgba(74,222,128,0.4)",
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3" style={{ background: "rgba(99,102,241,0.05)", borderRadius: "3px", border: "1px solid rgba(99,102,241,0.12)" }}>
                <Trophy className="w-4 h-4" style={{ color: "rgba(74,222,128,0.7)" }} />
                <div>
                  <div className="text-lg font-bold" style={{ fontFamily: "var(--font-mono)", color: "rgba(199,210,254,0.9)" }}>{completedTasks}</div>
                  <div className="text-[0.6rem]" style={{ fontFamily: "var(--font-mono)", color: "rgba(100,116,139,0.6)" }}>COMPLETED</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3" style={{ background: "rgba(99,102,241,0.05)", borderRadius: "3px", border: "1px solid rgba(99,102,241,0.12)" }}>
                <TrendingUp className="w-4 h-4" style={{ color: "rgba(129,140,248,0.7)" }} />
                <div>
                  <div className="text-lg font-bold" style={{ fontFamily: "var(--font-mono)", color: "rgba(199,210,254,0.9)" }}>{totalTasks}</div>
                  <div className="text-[0.6rem]" style={{ fontFamily: "var(--font-mono)", color: "rgba(100,116,139,0.6)" }}>TOTAL QUESTS</div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Account info */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <SectionLabel>◈ ACCOUNT DATA</SectionLabel>
          <div
            className="p-6 relative overflow-hidden space-y-4"
            style={{
              background: "rgba(6,10,26,0.9)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "4px",
            }}
          >
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: "rgba(99,102,241,0.5)" }} />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: "rgba(99,102,241,0.5)" }} />

            {[
              { label: "Hunter ID", value: user?.id ?? "—", icon: Shield },
              { label: "Email", value: user?.email ?? "—", icon: Mail },
              { label: "Member Since", value: memberSince, icon: Calendar },
              { label: "Current Rank", value: `Rank ${rank} · Level ${stats?.level ?? 1}`, icon: Star },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: "rgba(129,140,248,0.8)" }} />
                  </div>
                  <div className="min-w-0">
                    <div className="hud-label" style={{ fontSize: "0.55rem" }}>{item.label}</div>
                    <div className="text-sm truncate" style={{ fontFamily: "var(--font-mono)", color: "rgba(199,210,254,0.85)" }}>
                      {item.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
