// ============================================================
// store/toastStore.ts
// Store léger et indépendant pour l'affichage de toasts éphémères.
// N'importe quel composant, service ou listener socket peut appeler
// useToastStore.getState().push(notification) pour faire apparaître
// un toast n'importe où sur le site, sans passer par un provider React.
// ============================================================

import { create } from "zustand";
import type { Notification } from "../services/notificationService";

export interface ToastItem {
  id: string;
  notification: Notification;
  createdAt: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (notification: Notification) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

// On ne garde jamais plus de N toasts à l'écran en même temps
const MAX_VISIBLE_TOASTS = 4;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  push: (notification) => {
    const id = `${notification._id}-${Date.now()}`;
    const toast: ToastItem = { id, notification, createdAt: Date.now() };
    set({ toasts: [toast, ...get().toasts].slice(0, MAX_VISIBLE_TOASTS) });
  },

  dismiss: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },

  clear: () => set({ toasts: [] }),
}));