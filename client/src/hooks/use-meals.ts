import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MealEntry, InsertMealEntry } from "@shared/schema";

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message ?? "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

export function useMealEntries() {
  return useQuery<MealEntry[]>({
    queryKey: ["/api/meals"],
    queryFn: () => fetchJson("/api/meals"),
  });
}

export function useCreateMealEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InsertMealEntry>) =>
      fetchJson("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meals"] }),
  });
}

export function useUpdateMealEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<MealEntry> & { id: number }) =>
      fetchJson(`/api/meals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meals"] }),
  });
}

export function useDeleteMealEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson(`/api/meals/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meals"] }),
  });
}

export function useAnalyzeMeal() {
  return useMutation({
    mutationFn: (data: { mealName: string; notes?: string }) =>
      fetchJson("/api/ai/meals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
