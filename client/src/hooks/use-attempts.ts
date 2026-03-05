import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useAttempts() {
  return useQuery({
    queryKey: [api.attempts.list.path],
    queryFn: async () => {
      const res = await fetch(api.attempts.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attempts");
      return api.attempts.list.responses[200].parse(await res.json());
    },
  });
}

export function useAttempt(id: number) {
  return useQuery({
    queryKey: [api.attempts.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.attempts.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch attempt");
      return api.attempts.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useStartAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.attempts.start.input>) => {
      const res = await fetch(api.attempts.start.path, {
        method: api.attempts.start.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to start attempt");
      }
      return api.attempts.start.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attempts.list.path] });
    },
  });
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof api.attempts.submit.input> }) => {
      const url = buildUrl(api.attempts.submit.path, { id });
      const res = await fetch(url, {
        method: api.attempts.submit.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit attempt");
      }
      return api.attempts.submit.responses[200].parse(await res.json());
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.attempts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.attempts.get.path, id] });
    },
  });
}

export function useSubmitPartition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof api.attempts.submitPartition.input> }) => {
      const url = buildUrl(api.attempts.submitPartition.path, { id });
      const res = await fetch(url, {
        method: api.attempts.submitPartition.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit part");
      }
      return api.attempts.submitPartition.responses[200].parse(await res.json());
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.attempts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.attempts.get.path, id] });
    },
  });
}

export function useAiGradeAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.attempts.aiGrade.path, { id });
      const res = await fetch(url, {
        method: api.attempts.aiGrade.method,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "AI grading failed");
      }
      return api.attempts.aiGrade.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.attempts.get.path, id] });
    },
  });
}

export function useGradeAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof api.attempts.grade.input> }) => {
      const url = buildUrl(api.attempts.grade.path, { id });
      const res = await fetch(url, {
        method: api.attempts.grade.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save marks");
      }
      return api.attempts.grade.responses[200].parse(await res.json());
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.attempts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.attempts.get.path, id] });
    },
  });
}
