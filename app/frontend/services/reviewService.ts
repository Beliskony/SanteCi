// ============================================================
// services/reviewService.ts
// Prefix : /api/reviews
// ============================================================

import * as api from "@/app/frontend/lib/apiClient";
import type { ApiResponse } from "@/app/frontend/types";
import type {
  Review,
  DoctorReviewsResponse,
  CreateReviewDTO,
  UpdateReviewDTO,
} from "../types";

export const reviewService = {

  /**
   * Laisser un avis (patient uniquement, RDV "completed" requis)
   * POST /api/reviews
   */
  async create(dto: CreateReviewDTO): Promise<Review> {
    const res = await api.post<ApiResponse<Review>>("/reviews", dto);
    return res.data;
  },

  /**
   * Modifier son avis (fenêtre de 30 jours)
   * PATCH /api/reviews/:id
   */
  async update(reviewId: string, dto: UpdateReviewDTO): Promise<Review> {
    const res = await api.patch<ApiResponse<Review>>(`/reviews/${reviewId}`, dto);
    return res.data;
  },

  /**
   * Supprimer son avis
   * DELETE /api/reviews/:id
   */
  async remove(reviewId: string): Promise<{ message: string }> {
    const res = await api.del<{ success: boolean; message: string }>(`/reviews/${reviewId}`);
    return { message: res.message };
  },

  /**
   * Avis publiés d'un médecin (page publique du médecin)
   * GET /api/reviews?doctorId=...
   */
  async getForDoctor(doctorId: string, filters?: { page?: number; limit?: number }): Promise<DoctorReviewsResponse> {
    const qs = new URLSearchParams({ doctorId });
    if (filters?.page)  qs.append("page", String(filters.page));
    if (filters?.limit) qs.append("limit", String(filters.limit));

    const res = await api.get<DoctorReviewsResponse & { success: boolean }>(
      `/reviews?${qs.toString()}`,
      false // route publique, pas besoin d'auth
    );
    return {
      reviews:       res.reviews,
      total:         res.total,
      page:          res.page,
      pages:         res.pages,
      averageRating: res.averageRating,
      reviewCount:   res.reviewCount,
    };
  },

  /**
   * Vérifier si un avis existe déjà pour un rendez-vous donné
   * GET /api/reviews/appointment/:appointmentId
   * → utile pour afficher "Laisser un avis" ou "Modifier mon avis"
   */
  async getForAppointment(appointmentId: string): Promise<Review | null> {
    const res = await api.get<ApiResponse<Review | null>>(`/reviews/appointment/${appointmentId}`);
    return res.data;
  },
};