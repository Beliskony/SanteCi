import { create } from "zustand";
import { devtools } from "zustand/middleware";
import * as api from "@/app/frontend/lib/apiClient";
import { doctorService, DoctorFilters } from "@/app/frontend/services/doctorService";
import type { DoctorUser, Notification, ApiResponse } from "@/app/frontend/types";

// ============================================================
// DoctorStore
// ============================================================

interface DoctorState {
  doctors: Partial<DoctorUser>[];
  currentDoctor: Partial<DoctorUser> | null;
  specialties: string[];
  availableSlots: string[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    pages: number;   //"pages" et non "totalPages" (format backend)
  };

  fetchDoctors: (filters?: DoctorFilters) => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  fetchSlots: (doctorId: string, date: string, type: "video" | "audio" | "chat") => Promise<void>;
  fetchSpecialties: () => Promise<void>;
  clearCurrent: () => void;
  clearError: () => void;
}

export const useDoctorStore = create<DoctorState>()(
  devtools(
    (set) => ({
      doctors: [],
      currentDoctor: null,
      specialties: [],
      availableSlots: [],
      isLoading: false,
      error: null,
      pagination: { total: 0, page: 1, pages: 0 },

      fetchDoctors: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          // Retourne { doctors, total, page, pages }
          const res = await doctorService.search(filters);
          set({
            doctors: res.doctors,
            pagination: {
              total: res.total,
              page: res.page,
              pages: res.pages,
            },
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur de recherche",
            isLoading: false,
          });
        }
      },

      fetchById: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const doctor = await doctorService.getById(id);
          set({ currentDoctor: doctor, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Médecin introuvable",
            isLoading: false,
          });
        }
      },

      fetchSlots: async (doctorId, date, type) => {
        set({ isLoading: true });
        try {
          const slots = await doctorService.getAvailableSlots(doctorId, date, type);
          set({ availableSlots: slots, isLoading: false });
        } catch {
          set({ availableSlots: [], isLoading: false });
        }
      },

      fetchSpecialties: async () => {
        try {
          const specialties = await doctorService.getSpecialties();
          set({ specialties });
        } catch { /* silencieux */ }
      },

      clearCurrent: () => set({ currentDoctor: null, availableSlots: [] }),
      clearError: () => set({ error: null }),
    }),
    { name: "DoctorStore" }
  )
);

// ============================================================
// NotificationStore
// ============================================================

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  fetchAll: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,

      fetchAll: async () => {
        set({ isLoading: true });
        try {
          const res = await api.get<ApiResponse<Notification[]>>("/notifications");
          const notifications = res.data;
          set({
            notifications,
            unreadCount: notifications.filter((n) => !n.read).length,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      markAsRead: async (id) => {
        try {
          await api.patch(`/notifications/${id}/read`, {});
          set((state) => {
            const notifications = state.notifications.map((n) =>
              n._id === id ? { ...n, read: true } : n
            );
            return {
              notifications,
              unreadCount: notifications.filter((n) => !n.read).length,
            };
          });
        } catch { /* silencieux */ }
      },

      markAllAsRead: async () => {
        try {
          await api.patch("/notifications/read-all", {});
          set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
          }));
        } catch { /* silencieux */ }
      },

      remove: async (id) => {
        try {
          await api.del(`/notifications/${id}`);
          set((state) => {
            const notifications = state.notifications.filter((n) => n._id !== id);
            return {
              notifications,
              unreadCount: notifications.filter((n) => !n.read).length,
            };
          });
        } catch { /* silencieux */ }
      },
    }),
    { name: "NotificationStore" }
  )
);