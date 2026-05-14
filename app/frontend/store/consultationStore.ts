// ============================================================
// store/consultationStore.ts — État global des consultations
// Compatible avec useAuthStore (PatientUser / DoctorUser)
// ============================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { consultationService } from "../services/consultationService";
import type {
  Consultation,
  CreateConsultationPayload,
  ConsultationFilters,
  ConsultationStatus,
  Prescription,
  PaginatedResponse,
} from "../types";

interface ConsultationState {
  // Données
  consultations: Consultation[];
  currentConsultation: Consultation | null;
  currentPrescription: Prescription | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  // Actions
  fetchMine: (filters?: ConsultationFilters) => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  book: (payload: CreateConsultationPayload) => Promise<Consultation>;
  cancel: (id: string, reason?: string) => Promise<void>;
  confirm: (id: string) => Promise<void>;
  start: (id: string) => Promise<void>;
  complete: (
    id: string,
    data: Parameters<typeof consultationService.complete>[1]
  ) => Promise<void>;
  fetchPrescription: (consultationId: string) => Promise<void>;
  joinRoom: (id: string) => Promise<{ meetingUrl: string; roomToken: string }>;
  leaveReview: (id: string, data: { rating: number; comment?: string }) => Promise<void>;

  // Utils
  getByStatus: (status: ConsultationStatus) => Consultation[];
  clearCurrent: () => void;
  clearError: () => void;
}

export const useConsultationStore = create<ConsultationState>()(
  devtools(
    (set, get) => ({
      consultations: [],
      currentConsultation: null,
      currentPrescription: null,
      isLoading: false,
      error: null,
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },

      fetchMine: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const res: PaginatedResponse<Consultation> =
            await consultationService.getMine(filters);
          set({
            consultations: res.data,
            pagination: {
              total: res.total,
              page: res.page,
              limit: res.limit,
              totalPages: res.totalPages,
            },
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur de chargement",
            isLoading: false,
          });
        }
      },

      fetchById: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const consultation = await consultationService.getById(id);
          set({ currentConsultation: consultation, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Consultation introuvable",
            isLoading: false,
          });
        }
      },

      book: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const newConsultation = await consultationService.book(payload);
          set((state) => ({
            consultations: [newConsultation, ...state.consultations],
            isLoading: false,
          }));
          return newConsultation;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erreur de réservation";
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      cancel: async (id, reason) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await consultationService.cancel(id, reason);
          set((state) => ({
            consultations: state.consultations.map((c) =>
              c._id === id ? updated : c
            ),
            currentConsultation:
              state.currentConsultation?._id === id
                ? updated
                : state.currentConsultation,
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur d'annulation",
            isLoading: false,
          });
          throw err;
        }
      },

      confirm: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await consultationService.confirm(id);
          set((state) => ({
            consultations: state.consultations.map((c) =>
              c._id === id ? updated : c
            ),
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur de confirmation",
            isLoading: false,
          });
          throw err;
        }
      },

      start: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await consultationService.start(id);
          set((state) => ({
            consultations: state.consultations.map((c) =>
              c._id === id ? updated : c
            ),
            currentConsultation: updated,
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur au démarrage",
            isLoading: false,
          });
          throw err;
        }
      },

      complete: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await consultationService.complete(id, data);
          set((state) => ({
            consultations: state.consultations.map((c) =>
              c._id === id ? updated : c
            ),
            currentConsultation: updated,
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur lors de la clôture",
            isLoading: false,
          });
          throw err;
        }
      },

      fetchPrescription: async (consultationId) => {
        set({ isLoading: true, error: null });
        try {
          const prescription = await consultationService.getPrescription(consultationId);
          set({ currentPrescription: prescription, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Ordonnance introuvable",
            isLoading: false,
          });
        }
      },

      joinRoom: async (id) => {
        return consultationService.joinRoom(id);
      },

      leaveReview: async (id, data) => {
        await consultationService.leaveReview(id, data);
      },

      // Getter filtré côté client (pas d'appel API)
      getByStatus: (status) => {
        return get().consultations.filter((c) => c.status === status);
      },

      clearCurrent: () =>
        set({ currentConsultation: null, currentPrescription: null }),
      clearError: () => set({ error: null }),
    }),
    { name: "ConsultationStore" }
  )
);