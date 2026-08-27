import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface AuthConfig {
  googleAuthEnabled: boolean;
  emailEnabled: boolean;
}

export function useAuthConfig() {
  return useQuery({
    queryKey: ["/api/auth/config"],
    queryFn: () => api<AuthConfig>("/api/auth/config"),
    staleTime: 5 * 60_000,
  });
}
