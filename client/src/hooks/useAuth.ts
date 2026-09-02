import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "@/lib/api";
import type { PublicUser } from "@shared/schema";

async function apiPatch<T = unknown>(url: string, data?: unknown): Promise<T> {
  return api<T>(url, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined });
}

async function apiDelete<T = unknown>(url: string, data?: unknown): Promise<T> {
  return api<T>(url, { method: "DELETE", body: data !== undefined ? JSON.stringify(data) : undefined });
}

export function useAuth() {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const data = await api<{ user: PublicUser }>("/api/auth/me");
        return data.user;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const signup = useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) => apiPost<{ user: PublicUser }>("/api/auth/signup", input),
    onSuccess: (data) => queryClient.setQueryData(["/api/auth/me"], data.user),
  });

  const login = useMutation({
    mutationFn: (input: { email: string; password: string }) => apiPost<{ user: PublicUser }>("/api/auth/login", input),
    onSuccess: (data) => queryClient.setQueryData(["/api/auth/me"], data.user),
  });

  const logout = useMutation({
    mutationFn: () => apiPost("/api/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });

  const updateProfile = useMutation({
    mutationFn: (input: { name: string }) => apiPatch<{ user: PublicUser }>("/api/auth/me", input),
    onSuccess: (data) => queryClient.setQueryData(["/api/auth/me"], data.user),
  });

  const deleteAccount = useMutation({
    mutationFn: (input: { reason?: string }) => apiDelete("/api/auth/me", input),
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
    },
  });

  return {
    user: meQuery.data ?? null,
    isLoading: meQuery.isLoading,
    signup,
    login,
    logout,
    updateProfile,
    deleteAccount,
  };
}

export function usePasswordReset() {
  const forgotPassword = useMutation({
    mutationFn: (input: { email: string }) => apiPost("/api/auth/forgot-password", input),
  });

  const resetPassword = useMutation({
    mutationFn: (input: { token: string; password: string }) => apiPost("/api/auth/reset-password", input),
  });

  return { forgotPassword, resetPassword };
}
