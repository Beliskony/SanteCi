// ============================================================
// services/consultationService.ts — Consultations
// Endpoints: /api/consultations/*
// ============================================================

import * as api from "@/app/frontend/lib/apiClient";
import type {
  Consultation,
  CreateConsultationPayload,
  ConsultationFilters,
  Prescription,
  ApiResponse,
  PaginatedResponse,
} from "@/app/frontend/types";

export const consultationService = {
  /**
   * Prendre un rendez-vous (patient)
   */
  async book(payload: CreateConsultationPayload): Promise<Consultation> {
    const res = await api.post<ApiResponse<Consultation>>(
      "/api/consultations",
      payload
    );
    return res.data;
  },

  /**
   * Mes consultations (patient ou médecin selon le token)
   */
  async getMine(
    filters?: ConsultationFilters
  ): Promise<PaginatedResponse<Consultation>> {
    const qs = new URLSearchParams();
    if (filters?.status) qs.append("status", filters.status);
    if (filters?.type) qs.append("type", filters.type);
    if (filters?.from) qs.append("from", filters.from);
    if (filters?.to) qs.append("to", filters.to);
    if (filters?.page) qs.append("page", String(filters.page));
    if (filters?.limit) qs.append("limit", String(filters.limit));
    const query = qs.toString();
    return api.get<PaginatedResponse<Consultation>>(
      `/api/consultations/mine${query ? `?${query}` : ""}`
    );
  },

  /**
   * Détail d'une consultation
   */
  async getById(id: string): Promise<Consultation> {
    const res = await api.get<ApiResponse<Consultation>>(
      `/api/consultations/${id}`
    );
    return res.data;
  },

  /**
   * Annuler une consultation
   */
  async cancel(id: string, reason?: string): Promise<Consultation> {
    const res = await api.patch<ApiResponse<Consultation>>(
      `/api/consultations/${id}/cancel`,
      { reason }
    );
    return res.data;
  },

  /**
   * Confirmer (médecin)
   */
  async confirm(id: string): Promise<Consultation> {
    const res = await api.patch<ApiResponse<Consultation>>(
      `/api/consultations/${id}/confirm`,
      {}
    );
    return res.data;
  },

  /**
   * Démarrer la séance (médecin)
   * Retourne notamment le meetingUrl pour la vidéo
   */
  async start(id: string): Promise<Consultation> {
    const res = await api.patch<ApiResponse<Consultation>>(
      `/api/consultations/${id}/start`,
      {}
    );
    return res.data;
  },

  /**
   * Clore la consultation avec notes + ordonnance (médecin)
   */
  async complete(
    id: string,
    data: {
      notes: string;
      prescription?: Omit<Prescription, "_id" | "consultationId" | "patientId" | "doctorId" | "createdAt">;
    }
  ): Promise<Consultation> {
    const res = await api.patch<ApiResponse<Consultation>>(
      `/api/consultations/${id}/complete`,
      data
    );
    return res.data;
  },

  /**
   * Ordonnance d'une consultation
   */
  async getPrescription(consultationId: string): Promise<Prescription> {
    const res = await api.get<ApiResponse<Prescription>>(
      `/api/consultations/${consultationId}/prescription`
    );
    return res.data;
  },

  /**
   * Rejoindre la salle de téléconsultation (patient ou médecin)
   * Retourne le token de salle
   */
  async joinRoom(id: string): Promise<{ meetingUrl: string; roomToken: string }> {
    const res = await api.post<ApiResponse<{ meetingUrl: string; roomToken: string }>>(
      `/api/consultations/${id}/join`,
      {}
    );
    return res.data;
  },

  /**
   * Laisser un avis (patient, après consultation terminée)
   */
  async leaveReview(
    id: string,
    data: { rating: number; comment?: string }
  ): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>(
      `/api/consultations/${id}/review`,
      data
    );
    return res.data;
  },
};