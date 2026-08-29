import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "@/lib/api";
import type { OneTimeInvitation } from "@shared/schema";

export function useOneTimeInvitations() {
  return useQuery({
    queryKey: ["/api/one-time-invitations"],
    queryFn: () => api<{ invitations: OneTimeInvitation[] }>("/api/one-time-invitations"),
    refetchInterval: 6000,
  });
}

export interface CreateOneTimeInvitationInput {
  recipientEmail: string;
  recipientName?: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  note?: string;
  emoji: string;
}

export function useOneTimeInvitationActions() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/one-time-invitations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const checkout = useMutation({
    mutationFn: (input: CreateOneTimeInvitationInput) => apiPost<{ url: string }>("/api/one-time-invitations/checkout", input),
  });

  const useCredit = useMutation({
    mutationFn: (input: CreateOneTimeInvitationInput) =>
      apiPost<{ invitation: OneTimeInvitation }>("/api/one-time-invitations/use-credit", input),
    onSuccess: invalidate,
  });

  const createFree = useMutation({
    mutationFn: (input: CreateOneTimeInvitationInput) =>
      apiPost<{ invitation: OneTimeInvitation }>("/api/one-time-invitations/free", input),
    onSuccess: invalidate,
  });

  return { checkout, useCredit, createFree };
}
