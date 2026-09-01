// ============================================================
// services/notificationService.ts
// Aligné sur le backend NotificationService
// Prefix : /api/notifications
// ============================================================

import * as api from "@/app/frontend/lib/apiClient";
import type { ApiResponse } from "@/app/frontend/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "appointment"
  | "prescription"
  | "message"
  | "reminder"
  | "payment"
  | "system"
  | "emergency"
  | "call";

export type NotificationUserType = "patient" | "doctor";
export type NotificationPriority = "low" | "normal" | "high";

export interface NotificationData {
  appointmentId?: string;
  prescriptionId?: string;
  doctorId?: string;
  patientId?: string;
  url?: string;

  callSessionId?: string;
  callerName?: string;
  callType?: 'audio' | 'video';
  duration?: number;
  otherUserName?: string;

  // Marqueur ajouté côté client (pas en base) pour distinguer un appel
  // entrant "en direct" (sonnerie + Accepter/Refuser) d'une notif d'appel
  // informative (manqué, terminé) — voir NotificationGlobalListener.
  isLiveIncomingCall?: boolean;
}

export interface NotificationChannels {
  push: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

export interface NotificationStatut {
  sent: boolean;
  sentAt?: string;
  delivered: boolean;
  deliveredAt?: string;
  read: boolean;
  readAt?: string;
}

export interface NotificationMetadata {
  createdAt: string;
  expiresAt?: string;
  priority: NotificationPriority;
}

export interface Notification {
  _id: string;
  userId: string;
  userType: NotificationUserType;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
  channels: NotificationChannels;
  statut: NotificationStatut;
  metadata: NotificationMetadata;
}

export interface PaginatedNotifications {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pages: number;
}

export interface NotificationFiltersDTO {
  type?: NotificationType;
  read?: boolean;
  page?: number;
  limit?: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const notificationService = {

  // Le backend fait `{ success: true, ...result }` — pas de champ `data`
  async list(filters?: NotificationFiltersDTO): Promise<PaginatedNotifications> {
    const qs = new URLSearchParams();
    if (filters?.page)  qs.append("page",  String(filters.page));
    if (filters?.limit) qs.append("limit", String(filters.limit));
    if (filters?.type)  qs.append("type",  filters.type);
    if (filters?.read !== undefined) qs.append("read", String(filters.read));

    const query = qs.toString();
    const res = await api.get<PaginatedNotifications & { success: boolean }>(
      `/notifications${query ? `?${query}` : ""}`
    );

    // Défense contre undefined au cas où l'API échoue silencieusement
    return {
      notifications: res.notifications ?? [],
      total:         res.total         ?? 0,
      unreadCount:   res.unreadCount   ?? 0,
      page:          res.page          ?? 1,
      pages:         res.pages         ?? 0,
    };
  },

  // Pas de `data` non plus ici — juste { success, count }
  async getUnreadCount(): Promise<number> {
    const res = await api.get<{ success: boolean; count: number }>(
      `/notifications/unread-count`
    );
    return res.count ?? 0;
  },

  // Ici il y a bien un champ `data`
  async markAsRead(id: string): Promise<Notification> {
    const res = await api.patch<ApiResponse<Notification>>(
      `/notifications/${id}`, {}
    );
    return res.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const res = await api.del<{ success: boolean; message: string }>(
      `/notifications/${id}`
    );
    return { message: res.message };
  },

  async markAllAsRead(): Promise<{ modified: number }> {
    const res = await api.post<{ success: boolean; modified: number }>(
      `/notifications/mark-all-read`, {}
    );
    return { modified: res.modified ?? 0 };
  },

  async clearRead(): Promise<{ deleted: number }> {
    const res = await api.del<{ success: boolean; deleted: number }>(
      `/notifications/clear-read`
    );
    return { deleted: res.deleted ?? 0 };
  },
};