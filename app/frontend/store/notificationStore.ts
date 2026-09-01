import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { notificationService } from "../services/notificationService";
import { useToastStore } from "./toastStore"
import type {
  Notification,
  NotificationFiltersDTO,
} from "../services/notificationService";

// ─────────────────────────────────────────────
// Store state & actions
// ─────────────────────────────────────────────

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  page: number;
  pages: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchNotifications: (filters?: NotificationFiltersDTO) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearRead: () => Promise<void>;

  // Appelé quand une notif arrive en temps réel (Socket.IO, plus tard)
  addNotification: (notification: Notification) => void;

  setError: (error: string | null) => void;
  reset: () => void;
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      total: 0,
      page: 1,
      pages: 0,
      isLoading: false,
      error: null,

      fetchNotifications: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const result = await notificationService.list(filters);
          set({
            notifications: result.notifications,
            total:         result.total,
            unreadCount:   result.unreadCount,
            page:          result.page,
            pages:         result.pages,
            isLoading:     false,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erreur inconnue.";
          set({ error: message, isLoading: false });
        }
      },

      fetchUnreadCount: async () => {
        try {
          const count = await notificationService.getUnreadCount();
          set({ unreadCount: count });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erreur inconnue.";
          set({ error: message });
        }
      },

      markAsRead: async (id) => {
        const { notifications, unreadCount } = get();
        const target = notifications.find((n) => n._id === id);

        // Update optimiste
        set({
          notifications: notifications.map((n) =>
            n._id === id ? { ...n, statut: { ...n.statut, read: true } } : n
          ),
          unreadCount: target && !target.statut.read
            ? Math.max(0, unreadCount - 1)
            : unreadCount,
        });

        try {
          await notificationService.markAsRead(id);
        } catch (err) {
          // Rollback si échec
          set({ notifications, unreadCount });
          const message = err instanceof Error ? err.message : "Erreur inconnue.";
          set({ error: message });
        }
      },

      markAllAsRead: async () => {
        const { notifications, unreadCount } = get();

        set({
          notifications: notifications.map((n) => ({
            ...n,
            statut: { ...n.statut, read: true },
          })),
          unreadCount: 0,
        });

        try {
          await notificationService.markAllAsRead();
        } catch (err) {
          set({ notifications, unreadCount });
          const message = err instanceof Error ? err.message : "Erreur inconnue.";
          set({ error: message });
        }
      },

      deleteNotification: async (id) => {
        const { notifications, unreadCount, total } = get();
        const target = notifications.find((n) => n._id === id);

        set({
          notifications: notifications.filter((n) => n._id !== id),
          total: Math.max(0, total - 1),
          unreadCount: target && !target.statut.read
            ? Math.max(0, unreadCount - 1)
            : unreadCount,
        });

        try {
          await notificationService.delete(id);
        } catch (err) {
          set({ notifications, unreadCount, total });
          const message = err instanceof Error ? err.message : "Erreur inconnue.";
          set({ error: message });
        }
      },

      clearRead: async () => {
        const { notifications, total } = get();
        const unread = notifications.filter((n) => !n.statut.read);

        set({
          notifications: unread,
          total: unread.length,
        });

        try {
          await notificationService.clearRead();
        } catch (err) {
          set({ notifications, total });
          const message = err instanceof Error ? err.message : "Erreur inconnue.";
          set({ error: message });
        }
      },

      addNotification: (notification) => {
        const { notifications, unreadCount, total } = get();
        set({
          notifications: [notification, ...notifications],
          unreadCount: unreadCount + 1,
          total: total + 1,
        });

        // Affiche aussi un toast, peu importe où se trouve l'utilisateur sur le site.
        // Les notifications de type "call" passent aussi par ici désormais —
        // NotificationToast gère lui-même la sonnerie/les boutons Accepter-Refuser
        // quand data.isLiveIncomingCall est présent (voir NotificationGlobalListener).
        useToastStore.getState().push(notification);
      },

      setError: (error) => set({ error }),

      reset: () =>
        set({
          notifications: [],
          unreadCount: 0,
          total: 0,
          page: 1,
          pages: 0,
          isLoading: false,
          error: null,
        }),
    }),
    { name: "NotificationStore" }
  )
);