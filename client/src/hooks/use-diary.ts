import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertDiaryEntry } from "@shared/routes";

export function useDiaryEntries() {
  return useQuery({
    queryKey: [api.diary.list.path],
    queryFn: async () => {
      const res = await fetch(api.diary.list.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch diary entries");
      return api.diary.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateDiaryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertDiaryEntry) => {
      const res = await fetch(api.diary.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create entry");
      }
      return api.diary.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.diary.list.path] }),
  });
}

export function useUpdateDiaryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertDiaryEntry> }) => {
      const url = buildUrl(api.diary.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update entry");
      }
      return api.diary.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.diary.list.path] }),
  });
}

export function useDeleteDiaryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.diary.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete entry");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.diary.list.path] }),
  });
}
