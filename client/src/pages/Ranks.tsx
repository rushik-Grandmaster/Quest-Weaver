import { useState } from "react";
import { motion } from "framer-motion";
import { useUserStats } from "@/hooks/use-gamification";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getRank, xpForLevel } from "@shared/levels";
import { Loader2, Lock, CheckCircle2, ChevronRight, Trophy, Users, Crown, Medal } from "lucide-react";

type LeaderboardEntry = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  level: number;
  xp: number;
  points: number;
};

const RANK_DATA = [
  {
    rank: "E",
    label: "E-RANK",
    minLevel: 1,
    maxLevel: 14,
    color: "#94a3b8",
    glowColor: "rgba(148,163,184,0.15)",
    borderColor: "rgba(148,163,184,0.35)",
    title: "Shadow Initiate",
    lore: "The weakest of hunters. Barely recognized by the system. Every legend starts here.",
    icon: "◉",
  },
  {
    rank: "D",
    label: "D-RANK",
    minLevel: 15,
    maxLevel: 29,
    color: "#4ade80",
    glowColor: "rgba(74,222,128,0.12)",
    borderColor: "rgba(74,222,128,0.3)",
    title: "Awakened Scout",
    lore: "Mana is stirring. The gates no longer terrify you — they intrigue you.",
    icon: "◈",
  },
  {
    rank: "C",
    label: "C-RANK",
    minLevel: 30,
    maxLevel: 44,
    color: "#60a5fa",
    glowColor: "rgba(96,165,250,0.12)",
    borderColor: "rgba(96,165,250,0.3)",
    title: "Dungeon Crawler",
    lore: "Mid-tier hunter. Capable of leading raids on B-class dungeons solo.",
    icon: "◆",
  },
  {
    rank: "B",
    label: "B-RANK",
    minLevel: 45,
    maxLevel: 59,
    color: "#a78bfa",
    glowColor: "rgba(167,139,250,0.12)",
    borderColor: "rgba(167,139,250,0.3)",
    title: "Gate Breaker",
    lore: "Feared in most circles. Other hunters think twice before challenging you.",
    icon: "✦",
  },
  {
    rank: "A",
    label: "A-RANK",
    minLevel: 60,
    maxLevel: 74,
    color: "#f59e0b",
    glowColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.3)",
    title: "Elite Hunter",
    lore: "National-class power. Governments keep files on hunters at this level.",
    icon: "★",
  },
  {
    rank: "S",
    label: "S-RANK",
    minLevel: 75,
    maxLevel: 89,
    color: "#f97316",
    glowColor: "rgba(249,115,22,0.14)",
    borderColor: "rgba(249,115,22,0.35)",
    title: "Shadow Monarch's Vanguard",
    lore: "One of the chosen few. Monsters of any rank bow before your presence.",
    icon: "◈",
  },
  {
    rank: "SS",
    label: "SS-RANK",
    minLevel: 90,
    maxLevel: null,
    color: "#6366f1",
    glowColor: "rgba(99,102,241,0.18)",
    borderColor: "rgba(99,102,241,0.5)",
    title: "Arise",
    lore: "The pinnacle. Beyond human limits. You walk alone where none can follow.",
    icon: "⬡",
  },
];

function getRankData(rank: string) {
  return RANK_DATA.find(r => r.rank === rank) ?? RANK_DATA[0];
}

function RankCard({
  data,
  isCurrent,
  isUnlocked,
  playerLevel,
  index,
}: {
  data: typeof RANK_DATA[0];
  isCurrent: boolean;
  isUnlocked: boolean;
  playerLevel: number;
  index: number;
}) {
  const levelRange = data.maxLevel
    ? `LVL ${data.minLevel} – ${data.maxLevel}`
    : `LVL ${data.minLevel}+`;

  const progressInRank = isCurrent
    ? ((playerLevel - data.minLevel) / ((data.maxLevel ?? data.minLevel + 15) - data.minLevel + 1)) * 100
    : isUnlocked ? 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="relative"
      style={{
        background: isCurrent
          ? `linear-gradient(135deg, ${data.glowColor} 0%, rgba(4,7,18,0.98) 60%)`
          : "rgba(6,10,26,0.85)",
        border: `1px solid ${isCurrent ? data.borderColor : isUnlocked ? data.borderColor + "66" : "rgba(30,35,60,0.6)"}`,
        borderRadius: "4px",
        boxShadow: isCurrent ? `0 0 32px ${data.glowColor}, inset 0 1px 0 ${data.borderColor}30` : "none",
        opacity: isUnlocked ? 1 : 0.45,
      }}
    >
      {isCurrent && (
        <>
          <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: data.color }} />
          <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2" style={{ borderColor: data.color }} />
          <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2" style={{ borderColor: data.color }} />
          <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2" style={{ borderColor: data.color }} />
        </>
      )}

      <div className="p-5 flex flex-col md:flex-row gap-4 md:items-center">
        <div
          className="flex-shrink-0 w-16 h-16 flex flex-col items-center justify-center"
          style={{
            background: isUnlocked ? `${data.glowColor}` : "rgba(15,20,40,0.8)",
            border: `1px solid ${isUnlocked ? data.borderColor : "rgba(30,35,60,0.6)"}`,
            borderRadius: "4px",
          }}
        >
          <span
            className="text-2xl font-black"
            style={{
              fontFamily: "var(--font-mono)",
              color: isUnlocked ? data.color : "rgba(50,60,90,0.8)",
              textShadow: isUnlocked ? `0 0 12px ${data.color}` : "none",
            }}
          >
            {data.rank}
          </span>
          <span style={{ fontSize: "0.6rem", color: isUnlocked ? data.color + "88" : "rgba(50,60,90,0.6)", fontFamily: "var(--font-mono)" }}>
            {data.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span
              className="font-bold tracking-widest"
              style={{ fontFamily: "var(--font-mono)", color: isUnlocked ? data.color : "rgba(50,60,90,0.8)", fontSize: "0.85rem" }}
            >
              {data.label}
            </span>
            <span className="hud-label">{levelRange}</span>
            {isCurrent && (
              <span
                className="hud-label px-2 py-0.5"
                style={{
                  background: `${data.color}18`,
                  border: `1px solid ${data.color}44`,
                  color: data.color,
                  borderRadius: "3px",
                  fontSize: "0.55rem",
                }}
              >
                CURRENT RANK
              </span>
            )}
            {isUnlocked && !isCurrent && (
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: data.color + "99" }} />
            )}
            {!isUnlocked && (
              <Lock className="w-3 h-3" style={{ color: "rgba(50,60,90,0.8)" }} />
            )}
          </div>

          <div
            className="font-semibold mb-1"
            style={{ color: isUnlocked ? "rgba(199,210,254,0.9)" : "rgba(50,60,90,0.8)", fontSize: "0.9rem" }}
          >
            {data.title}
          </div>

          <p style={{ color: "rgba(100,116,139,0.8)", fontSize: "0.75rem", lineHeight: 1.5 }}>
            {data.lore}
          </p>

          {isCurrent && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="hud-label" style={{ color: data.color + "80" }}>RANK PROGRESS</span>
                <span className="hud-label" style={{ color: data.color }}>
                  LVL {playerLevel} / {data.maxLevel ?? "INF"}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(15,20,40,0.8)", border: `1px solid ${data.borderColor}44` }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${data.color}88, ${data.color})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, progressInRank)}%` }}
                  transition={{ delay: index * 0.08 + 0.3, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </div>

        {!isUnlocked && (
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <span className="hud-label">UNLOCKS AT</span>
            <span
              className="font-bold"
              style={{ fontFamily: "var(--font-mono)", color: "rgba(50,60,90,0.9)", fontSize: "1.1rem" }}
            >
              LVL {data.minLevel}
            </span>
          </div>
        )}

        {isCurrent && data.maxLevel && (
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <span className="hud-label">NEXT RANK AT</span>
            <div className="flex items-center gap-1">
              <span
                className="font-bold"
                style={{ fontFamily: "var(--font-mono)", color: data.color, fontSize: "1.1rem" }}
              >
                LVL {data.maxLevel + 1}
              </span>
              <ChevronRight className="w-4 h-4" style={{ color: data.color + "88" }} />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LeaderboardRow({
  entry,
  position,
  isCurrentUser,
  index,
}: {
  entry: LeaderboardEntry;
  position: number;
  isCurrentUser: boolean;
  index: number;
}) {
  const rank = getRank(entry.level);
  const rankData = getRankData(rank);
  const displayName = entry.firstName
    ? `${entry.firstName.charAt(0).toUpperCase() + entry.firstName.slice(1)}${entry.lastName ? ` ${entry.lastName.charAt(0).toUpperCase()}.` : ""}`
    : "Unknown Hunter";

  const getMedalColor = (pos: number) => {
    if (pos === 1) return "#fbbf24";
    if (pos === 2) return "#94a3b8";
    if (pos === 3) return "#f97316";
    return null;
  };

  const medalColor = getMedalColor(position);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="flex items-center gap-3 p-3"
      style={{
        background: isCurrentUser
          ? `linear-gradient(90deg, ${rankData.glowColor} 0%, rgba(6,10,26,0.9) 40%)`
          : "rgba(6,10,26,0.85)",
        border: `1px solid ${isCurrentUser ? rankData.borderColor : "rgba(99,102,241,0.12)"}`,
        borderRadius: "4px",
        boxShadow: isCurrentUser ? `0 0 16px ${rankData.glowColor}` : "none",
      }}
    >
      {/* Position */}
      <div
        className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
        style={{
          background: medalColor ? `${medalColor}18` : "rgba(15,20,40,0.8)",
          border: `1px solid ${medalColor ? `${medalColor}44` : "rgba(99,102,241,0.2)"}`,
          borderRadius: "3px",
        }}
      >
        {position <= 3 ? (
          <Trophy className="w-4 h-4" style={{ color: medalColor ?? "rgba(148,163,184,0.8)" }} />
        ) : (
          <span
            className="text-xs font-bold"
            style={{ fontFamily: "var(--font-mono)", color: "rgba(148,163,184,0.8)" }}
          >
            {position}
          </span>
        )}
      </div>

      {/* Rank badge */}
      <div
        className="w-10 h-10 flex-shrink-0 flex flex-col items-center justify-center"
        style={{
          background: rankData.glowColor,
          border: `1px solid ${rankData.borderColor}`,
          borderRadius: "3px",
        }}
      >
        <span
          className="text-sm font-black"
          style={{
            fontFamily: "var(--font-mono)",
            color: rankData.color,
            textShadow: `0 0 8px ${rankData.color}`,
          }}
        >
          {rank}
        </span>
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-semibold truncate"
            style={{ color: isCurrentUser ? rankData.color : "rgba(199,210,254,0.9)", fontSize: "0.85rem" }}
          >
            {displayName}
          </span>
          {isCurrentUser && (
            <span
              className="hud-label px-1.5 py-0.5"
              style={{
                background: `${rankData.color}18`,
                border: `1px solid ${rankData.color}44`,
                color: rankData.color,
                borderRadius: "2px",
                fontSize: "0.55rem",
              }}
            >
              YOU
            </span>
          )}
        </div>
        <div className="hud-label mt-0.5" style={{ color: "rgba(99,102,241,0.4)" }}>
          {entry.xp.toLocaleString()} XP
        </div>
      </div>

      {/* Level */}
      <div className="flex-shrink-0 text-right">
        <div
          className="text-lg font-black"
          style={{ fontFamily: "var(--font-mono)", color: isCurrentUser ? rankData.color : "rgba(199,210,254,0.95)" }}
        >
          {entry.level}
        </div>
        <div className="hud-label" style={{ color: "rgba(99,102,241,0.35)" }}>LVL</div>
      </div>
    </motion.div>
  );
}

export default function Ranks() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useUserStats();
  const [activeTab, setActiveTab] = useState<"ranks" | "leaderboard">("ranks");

  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard?limit=50");
      return res.json();
    },
  });

  if (isLoading || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(99,102,241,0.6)" }} />
      </div>
    );
  }

  const playerLevel = stats.level;
  const currentRank = getRank(playerLevel);
  const xpNeeded = xpForLevel(playerLevel);
  const currentRankData = getRankData(currentRank);

  const userPosition = leaderboard.findIndex(e => e.userId === user?.id) + 1;

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="hud-label mb-1">HUNTER RANK REGISTRY</div>
        <h1
          className="text-3xl font-black tracking-widest uppercase"
          style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}
        >
          Rank System
        </h1>
        <p style={{ color: "rgba(100,116,139,0.8)", fontSize: "0.8rem", marginTop: "4px" }}>
          Your rank is determined by your level. Keep completing quests to ascend.
        </p>
      </motion.div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("ranks")}
          className="flex items-center gap-2 px-4 py-2 transition-all duration-200"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            fontWeight: 800,
            background: activeTab === "ranks" ? "rgba(99,102,241,0.15)" : "rgba(6,10,26,0.8)",
            border: `1px solid ${activeTab === "ranks" ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.15)"}`,
            borderRadius: "3px",
            color: activeTab === "ranks" ? "rgba(165,180,252,1)" : "rgba(100,116,139,0.7)",
          }}
        >
          <Crown className="w-3.5 h-3.5" />
          MY RANK
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className="flex items-center gap-2 px-4 py-2 transition-all duration-200"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            fontWeight: 800,
            background: activeTab === "leaderboard" ? "rgba(99,102,241,0.15)" : "rgba(6,10,26,0.8)",
            border: `1px solid ${activeTab === "leaderboard" ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.15)"}`,
            borderRadius: "3px",
            color: activeTab === "leaderboard" ? "rgba(165,180,252,1)" : "rgba(100,116,139,0.7)",
          }}
        >
          <Users className="w-3.5 h-3.5" />
          GLOBAL
          {leaderboard.length > 0 && (
            <span
              className="ml-0.5 px-1.5 py-0.5"
              style={{ background: "rgba(99,102,241,0.2)", borderRadius: "2px", fontSize: "0.6rem" }}
            >
              {leaderboard.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "ranks" && (
        <>
          {/* Current status summary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45 }}
            className="relative p-5"
            style={{
              background: `linear-gradient(135deg, ${currentRankData.glowColor} 0%, rgba(4,7,18,0.98) 70%)`,
              border: `1px solid ${currentRankData.borderColor}`,
              borderRadius: "4px",
              boxShadow: `0 0 40px ${currentRankData.glowColor}`,
            }}
          >
            <div className="hud-label mb-3" style={{ color: currentRankData.color + "88" }}>
              CURRENT STATUS
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <div className="hud-label mb-1">RANK</div>
                <span
                  className="text-5xl font-black"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: currentRankData.color,
                    textShadow: `0 0 20px ${currentRankData.color}`,
                  }}
                >
                  {currentRank}
                </span>
              </div>
              <div className="flex-1 min-w-[140px]">
                <div className="flex justify-between mb-1">
                  <span className="hud-label">LEVEL</span>
                  <span className="hud-label" style={{ color: currentRankData.color }}>
                    {stats.xp} / {xpNeeded} XP
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden mb-2"
                  style={{ background: "rgba(15,20,40,0.8)", border: `1px solid ${currentRankData.borderColor}44` }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${currentRankData.color}66, ${currentRankData.color})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (stats.xp / xpNeeded) * 100)}%` }}
                    transition={{ delay: 0.4, duration: 0.9, ease: "easeOut" }}
                  />
                </div>
                <div
                  className="text-3xl font-black"
                  style={{ fontFamily: "var(--font-mono)", color: "rgba(199,210,254,0.9)" }}
                >
                  {currentRankData.title}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Rank list */}
          <div className="space-y-3">
            <div className="hud-label">ALL RANKS</div>
            {RANK_DATA.map((rankData, i) => {
              const isCurrent = rankData.rank === currentRank;
              const isUnlocked = playerLevel >= rankData.minLevel;
              return (
                <RankCard
                  key={rankData.rank}
                  data={rankData}
                  isCurrent={isCurrent}
                  isUnlocked={isUnlocked}
                  playerLevel={playerLevel}
                  index={i}
                />
              );
            })}
          </div>
        </>
      )}

      {activeTab === "leaderboard" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* Leaderboard header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="hud-label mb-0.5">GLOBAL STANDINGS</div>
              <p style={{ color: "rgba(100,116,139,0.7)", fontSize: "0.75rem" }}>
                {leaderboard.length} registered hunters competing
              </p>
            </div>
            {userPosition > 0 && (
              <div
                className="text-right p-3"
                style={{
                  background: `${currentRankData.glowColor}`,
                  border: `1px solid ${currentRankData.borderColor}`,
                  borderRadius: "4px",
                }}
              >
                <div className="hud-label" style={{ color: currentRankData.color + "88" }}>YOUR POSITION</div>
                <div
                  className="text-2xl font-black"
                  style={{ fontFamily: "var(--font-mono)", color: currentRankData.color }}
                >
                  #{userPosition}
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard list */}
          {leaderboardLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(99,102,241,0.6)" }} />
            </div>
          ) : leaderboard.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-3"
              style={{
                background: "rgba(6,10,26,0.85)",
                border: "1px solid rgba(99,102,241,0.15)",
                borderRadius: "4px",
              }}
            >
              <Users className="w-8 h-8" style={{ color: "rgba(99,102,241,0.3)" }} />
              <p className="hud-label" style={{ color: "rgba(99,102,241,0.35)" }}>NO HUNTERS REGISTERED YET</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  position={i + 1}
                  isCurrentUser={entry.userId === user?.id}
                  index={i}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Footer note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center pb-4"
        style={{ color: "rgba(99,102,241,0.35)", fontSize: "0.7rem", fontFamily: "var(--font-mono)" }}
      >
        Complete daily quests to earn XP and advance your rank
      </motion.div>
    </div>
  );
}
