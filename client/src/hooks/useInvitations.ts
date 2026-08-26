import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "@/lib/api";
import type { Invitation, Memory } from "@shared/schema";

export function useInvitations() {
  return useQuery({
    queryKey: ["/api/invitations"],
    queryFn: () => api<{ invitations: Invitation[] }>("/api/invitations"),
    refetchInterval: 4000,
  });
}

export interface CreateInvitationInput {
  title: string;
  date: string;
  time: string;
  location?: string;
  note?: string;
  emoji: string;
}

export type RespondInput =
  | { action: "accept" }
  | { action: "decline" }
  | { action: "propose"; proposedDate: string; proposedTime: string; proposedNote?: string };

export function useInvitationActions() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  };

  const create = useMutation({
    mutationFn: (input: CreateInvitationInput) => apiPost<{ invitation: Invitation }>("/api/invitations", input),
    onSuccess: invalidate,
  });

  const respond = useMutation({
    mutationFn: ({ id, input }: { id: string; input: RespondInput }) =>
      apiPost<{ invitation: Invitation }>(`/api/invitations/${id}/respond`, input),
    onSuccess: invalidate,
  });

  const saveMemory = useMutation({
    mutationFn: ({ id, note, rating }: { id: string; note?: string; rating?: number }) =>
      apiPost<{ memory: Memory }>(`/api/invitations/${id}/memory`, { note, rating }),
    onSuccess: invalidate,
  });

  return { create, respond, saveMemory };
}
