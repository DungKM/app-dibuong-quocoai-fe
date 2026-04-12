import { env } from "@/config/env";
import { authenticatedRequest } from "@/services/auth.api";

export type NotificationsResponse = {
  data: any[];
  unreadCount: number;
};

export async function getNotifications(): Promise<NotificationsResponse> {
  const res = await authenticatedRequest(
    `${env.API_BACKEND_AUTH_NODE_URL}/api/notifications`,
    { method: "GET" }
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  return {
    data: json.data || [],
    unreadCount: json.unreadCount || 0,
  };
}
