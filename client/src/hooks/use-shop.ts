import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertShopItem } from "@shared/routes";
import { useGamificationEffects } from "./use-gamification";

export function useShopItems() {
  return useQuery({
    queryKey: [api.shop.list.path],
    queryFn: async () => {
      const res = await fetch(api.shop.list.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch shop items");
      return api.shop.list.responses[200].parse(await res.json());
    },
  });
}

export function useInventory() {
  return useQuery({
    queryKey: [api.inventory.list.path],
    queryFn: async () => {
      const res = await fetch(api.inventory.list.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return api.inventory.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateShopItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertShopItem) => {
      const res = await fetch(api.shop.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create item");
      }
      return api.shop.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.shop.list.path] }),
  });
}

export function useBuyItem() {
  const queryClient = useQueryClient();
  const { handleSuccess } = useGamificationEffects();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.shop.buy.path, { id });
      const res = await fetch(url, { method: "POST", credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to buy item");
      }
      return api.shop.buy.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.inventory.list.path] });
      handleSuccess({ stats: data.stats }, "Item Purchased!");
    },
  });
}
