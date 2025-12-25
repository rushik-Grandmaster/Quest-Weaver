import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { UserStats } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useUserStats() {
  return useQuery({
    queryKey: [api.userStats.get.path],
    queryFn: async () => {
      const res = await fetch(api.userStats.get.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch stats");
      return api.userStats.get.responses[200].parse(await res.json());
    },
  });
}

// Helper to handle gamification events (level up, point gain)
export function useGamificationEffects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSuccess = (data: { stats: UserStats, leveledUp?: boolean }, action: string) => {
    // Invalidate stats to update header
    queryClient.invalidateQueries({ queryKey: [api.userStats.get.path] });
    
    if (data.leveledUp) {
      toast({
        title: "LEVEL UP! 🎉",
        description: `Congratulations! You reached Level ${data.stats.level}!`,
        className: "bg-gradient-to-r from-yellow-500 to-amber-600 border-none text-black font-bold",
        duration: 5000,
      });
    } else {
      toast({
        title: action,
        description: `Current XP: ${data.stats.xp} | Points: ${data.stats.points}`,
        className: "bg-card border-accent/20 text-foreground",
      });
    }
  };

  return { handleSuccess };
}
