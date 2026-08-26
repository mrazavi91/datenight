import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "@/lib/api";
import type { PublicUser } from "@shared/schema";

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

  return {
    user: meQuery.data ?? null,
    isLoading: meQuery.isLoading,
    signup,
    login,
    logout,
  };
}
