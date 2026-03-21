import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Lock, Star, Loader2 } from "lucide-react";
import { ACHIEVEMENTS, RARITY_COLORS, type Achievement } from "@shared/achievements";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { format } from "date-fns";

type AchievementWithStatus = Achievement & {
  unlocked: boolean;
  unlockedAt: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  quests: "⚔️ Quests",
  levels: "⭐ Levels",
  streaks: "🔥 Streaks",
  gold: "💰 Gold",
  shop: "🛒 Shop",
  diary: "📖 Diary",
  health: "💪 Health",
  special: "✨ Special",
};

export default function Achievements() {
  const [filter, setFilter] = useState<string>("all");

  const { data: achievements, isLoading } = useQuery<AchievementWithStatus[]>({
    queryKey: ["/api/achievements"],
  });

  const filtered = achievements?.filter(
    (a) => filter === "all" || a.category === filter
  );

  const total = achievements?.length ?? 0;
  const unlocked = achievements?.filter((a) => a.unlocked).length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-2">
            <Trophy className="text-yellow-500" /> Achievements
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Milestones you've conquered on your journey, Rushik Sama.
          </p>
        </div>

        {/* Progress summary */}
        <div className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-500">{unlocked}</div>
            <div className="text-xs text-muted-foreground">Unlocked</div>
          </div>
          <div className="text-muted-foreground">/</div>
          <div className="text-center">
            <div className="text-3xl font-bold">{total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {total > 0 ? Math.round((unlocked / total) * 100) : 0}%
            </div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-500 to-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${total > 0 ? (unlocked / total) * 100 : 0}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const count = key === "all"
            ? achievements?.filter((a) => a.unlocked).length
            : achievements?.filter((a) => a.category === key && a.unlocked).length;

          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                filter === key
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/50 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span className="ml-1.5 bg-primary/20 text-primary px-1 rounded text-[10px] font-bold">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Achievements grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered?.map((achievement, i) => {
            const colors = RARITY_COLORS[achievement.rarity];
            return (
              <motion.div
                key={achievement.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ delay: i * 0.03 }}
                className={`relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-300 ${
                  achievement.unlocked
                    ? `${colors.bg} ${colors.border} ${colors.glow && `shadow-lg ${colors.glow}`}`
                    : "bg-muted/20 border-border/30 opacity-50"
                }`}
                data-testid={`achievement-${achievement.id}`}
              >
                {/* Lock overlay */}
                {!achievement.unlocked && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-3 h-3 text-muted-foreground/50" />
                  </div>
                )}

                {/* Icon */}
                <div className={`text-4xl mb-3 ${achievement.unlocked ? "" : "grayscale opacity-40"}`}>
                  {achievement.icon}
                </div>

                {/* Rarity badge */}
                <Badge
                  variant="outline"
                  className={`text-[9px] mb-2 capitalize px-1.5 py-0 h-4 ${colors.border} ${colors.text}`}
                >
                  {achievement.rarity}
                </Badge>

                {/* Title */}
                <p className={`text-xs font-bold leading-tight ${achievement.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                  {achievement.title}
                </p>

                {/* Description */}
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight line-clamp-2">
                  {achievement.description}
                </p>

                {/* Unlocked date */}
                {achievement.unlocked && achievement.unlockedAt && (
                  <p className={`text-[9px] mt-2 ${colors.text} opacity-70`}>
                    {format(new Date(achievement.unlockedAt), "MMM d, yyyy")}
                  </p>
                )}

                {/* Shine effect for unlocked */}
                {achievement.unlocked && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.15, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 + i * 0.2 }}
                    style={{ background: "linear-gradient(135deg, white 0%, transparent 60%)" }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Star className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No achievements in this category yet.</p>
        </div>
      )}
    </div>
  );
}
