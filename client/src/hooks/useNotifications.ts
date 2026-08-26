import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "@/lib/api";
import type { Notification } from "@shared/schema";

export function useNotifications() {
  return useQuery({
    queryKey: ["/api/notifications"],
    queryFn: () => api<{ notifications: Notification[] }>("/api/notifications"),
    refetchInterval: 4000,
  });
}

export function useNotificationActions() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

  const markRead = useMutation({
    mutationFn: (id: string) => apiPost(`/api/notifications/${id}/read`),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiPost("/api/notifications/read-all"),
    onSuccess: invalidate,
  });

  return { markRead, markAllRead };
}
