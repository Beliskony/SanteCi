// ============================================================
// store/useReviewStore.ts — Gestion des avis patients
// ============================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { reviewService } from "@/app/frontend/services/reviewService";
import type {
  Review,
  DoctorReviewsResponse,
  CreateReviewDTO,
  UpdateReviewDTO,
} from "@/app/frontend/types";

interface ReviewState {
  isSaving: boolean;
  error: string | null;

  // Avis existant pour le RDV actuellement affiché (permet de savoir
  // s'il faut proposer "Laisser un avis" ou "Modifier mon avis")
  currentAppointmentReview: Review | null;

  // Avis publiés d'un médecin (page publique)
  doctorReviews: DoctorReviewsResponse | null;

  createReview: (dto: CreateReviewDTO) => Promise<Review>;
  updateReview: (reviewId: string, dto: UpdateReviewDTO) => Promise<Review>;
  deleteReview: (reviewId: string) => Promise<void>;
  fetchReviewForAppointment: (appointmentId: string) => Promise<void>;
  fetchDoctorReviews: (doctorId: string, filters?: { page?: number; limit?: number }) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Une erreur inattendue s'est produite.";
}

const initialState = {
  isSaving: false,
  error: null,
  currentAppointmentReview: null,
  doctorReviews: null,
};

export const useReviewStore = create<ReviewState>()(
  devtools(
    (set) => ({
      ...initialState,

      createReview: async (dto) => {
        set({ isSaving: true, error: null });
        try {
          const review = await reviewService.create(dto);
          set({ currentAppointmentReview: review });
          return review;
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      updateReview: async (reviewId, dto) => {
        set({ isSaving: true, error: null });
        try {
          const review = await reviewService.update(reviewId, dto);
          set({ currentAppointmentReview: review });
          return review;
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      deleteReview: async (reviewId) => {
        set({ isSaving: true, error: null });
        try {
          await reviewService.remove(reviewId);
          set({ currentAppointmentReview: null });
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      fetchReviewForAppointment: async (appointmentId) => {
        set({ error: null });
        try {
          const review = await reviewService.getForAppointment(appointmentId);
          set({ currentAppointmentReview: review });
        } catch (err) {
          set({ error: toMessage(err) });
        }
      },

      fetchDoctorReviews: async (doctorId, filters) => {
        set({ error: null });
        try {
          const result = await reviewService.getForDoctor(doctorId, filters);
          set({ doctorReviews: result });
        } catch (err) {
          set({ error: toMessage(err) });
        }
      },

      clearError: () => set({ error: null }),
      reset: () => set(initialState),
    }),
    { name: "ReviewStore" }
  )
);