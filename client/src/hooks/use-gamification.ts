import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { UserStats } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { emitLevelUp, getRank, getPrevRank } from "@/components/LevelUpCeremony";

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

export function useGamificationEffects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSuccess = (data: { stats: UserStats; leveledUp?: boolean }, action: string) => {
    queryClient.invalidateQueries({ queryKey: [api.userStats.get.path] });

    if (data.leveledUp) {
      emitLevelUp({
        level: data.stats.level,
        rank: getRank(data.stats.level),
        prevRank: getPrevRank(data.stats.level),
      });
    } else {
      toast({
        title: action,
        description: `+XP earned · Gold: ${data.stats.points}`,
        className: "bg-card border-primary/20 text-foreground",
      });
    }
  };

  return { handleSuccess };
}
