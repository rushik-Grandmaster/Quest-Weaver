import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertScheduleItem } from "@shared/routes";

export function useSchedule() {
  return useQuery({
    queryKey: [api.schedule.list.path],
    queryFn: async () => {
      const res = await fetch(api.schedule.list.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch schedule");
      return api.schedule.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertScheduleItem) => {
      // JSON dates as strings problem - Zod handles coerce on backend, but let's be safe
      const res = await fetch(api.schedule.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create schedule item");
      return api.schedule.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.schedule.list.path] }),
  });
}

export function useDeleteScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.schedule.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete schedule item");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.schedule.list.path] }),
  });
}
