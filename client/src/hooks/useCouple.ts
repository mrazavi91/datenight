import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "@/lib/api";
import type { PublicUser } from "@shared/schema";

interface CoupleResponse {
  couple: { id: string; inviteCode: string; paired: boolean; credits: number } | null;
  partner: PublicUser | null;
}

export function useCouple() {
  return useQuery({
    queryKey: ["/api/couples/me"],
    queryFn: () => api<CoupleResponse>("/api/couples/me"),
    refetchInterval: 5000,
  });
}

export function useCoupleActions() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/couples/me"] });
  };

  const create = useMutation({
    mutationFn: () => apiPost("/api/couples/create"),
    onSuccess: invalidate,
  });

  const join = useMutation({
    mutationFn: (inviteCode: string) => apiPost("/api/couples/join", { inviteCode }),
    onSuccess: invalidate,
  });

  return { create, join };
}
