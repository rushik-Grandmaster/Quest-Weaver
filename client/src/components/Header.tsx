import { useUserStats } from "@/hooks/use-gamification";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Zap, Trophy, Flame } from "lucide-react";
import { motion } from "framer-motion";

export function Header() {
  const { data: stats, isLoading } = useUserStats();
  const { user } = useAuth();

  if (isLoading || !stats) {
    return (
      <header className="h-16 border-b border-border/50 bg-background/50 backdrop-blur-sm flex items-center px-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </header>
    );
  }

  // Calculate XP progress (simple logic: next level = level * 100)
  const xpForNextLevel = stats.level * 100;
  const progress = Math.min(100, (stats.xp / xpForNextLevel) * 100);

  return (
    <header className="h-auto md:h-20 border-b border-border/50 bg-background/50 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 gap-4 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold font-display text-lg shadow-lg shadow-primary/20">
            {stats.level}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] text-black font-bold">
              ★
            </div>
          </div>
        </div>
        
        <div className="flex flex-col">
          <h2 className="font-bold text-sm md:text-base leading-none">
            {user?.firstName ? `${user.firstName}'s Journey` : 'Hero Journey'}
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="h-2 w-24 md:w-48 bg-secondary rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {stats.xp}/{xpForNextLevel} XP
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 text-sm font-medium whitespace-nowrap">
          <Trophy className="w-4 h-4" />
          <span>{stats.points} Gold</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-500 text-sm font-medium whitespace-nowrap">
          <Flame className="w-4 h-4" />
          <span>{stats.streak} Day Streak</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-500 text-sm font-medium whitespace-nowrap">
          <Zap className="w-4 h-4" />
          <span>Active</span>
        </div>
      </div>
    </header>
  );
}
