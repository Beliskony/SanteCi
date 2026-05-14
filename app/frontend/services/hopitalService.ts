// ============================================================
// services/hospitalService.ts — Hôpitaux & Cliniques
// Miroir exact du HospitalClinicService backend
// ============================================================

import * as api from "@/app/frontend/lib/apiClient";
import type {
  IHospitalClinic,
  HospitalFilters,
  HospitalSearchResponse,
  CreateHospitalPayload,
  UpdateHospitalPayload,
} from "@/app/frontend/types/Etablisement";
import type { ApiResponse } from "@/app/frontend/types";


interface RawSearchResponse {
  success: boolean;
  facilities: IHospitalClinic[];
  total: number;
  page: number;
  pages: number;
}


export const hospitalService = {

  // ── Publics ────────────────────────────────────────────────

  /**
   * Recherche avec filtres
   * → search() du backend
   */
  async search(filters?: HospitalFilters): Promise<HospitalSearchResponse> {
    const qs = new URLSearchParams();

    if (filters?.city)                    qs.append("city",                 filters.city);
    if (filters?.district)                qs.append("district",             filters.district);
    if (filters?.type)                    qs.append("type",                 filters.type);
    if (filters?.category)                qs.append("category",             filters.category);
    if (filters?.specialty)               qs.append("specialty",            filters.specialty);
    if (filters?.telemedicineEnabled !== undefined)
      qs.append("telemedicineEnabled", String(filters.telemedicineEnabled));
    if (filters?.homeVisits !== undefined)
      qs.append("homeVisits",          String(filters.homeVisits));
    if (filters?.emergency24h !== undefined)
      qs.append("emergency24h",        String(filters.emergency24h));
    if (filters?.page)                    qs.append("page",                 String(filters.page));
    if (filters?.limit)                   qs.append("limit",                String(filters.limit));

    const query = qs.toString();
    const res = await api.get<RawSearchResponse>(
      `/hopitaux${query ? `?${query}` : ""}`,
      false // accessible sans auth
    );
   return {
      facilities: res.facilities ?? [],
      total:      res.total      ?? 0,
      page:       res.page       ?? 1,
      pages:      res.pages      ?? 0,
    };
  },

  /**
   * Détail par _id MongoDB
   * → getById() du backend
   */
  async getById(id: string): Promise<IHospitalClinic> {
    const res = await api.get<ApiResponse<IHospitalClinic>>(
      `/hopitaux/${id}`,
      false
    );
    return res.data;
  },

  /**
   * Détail par facilityId (ex: "FAC-A3F2B1C4")
   * → getByFacilityId() du backend
   */
  async getByFacilityId(facilityId: string): Promise<IHospitalClinic> {
    const res = await api.get<ApiResponse<IHospitalClinic>>(
      `/hopitaux/facility/${facilityId}`,
      false
    );
    return res.data;
  },

  // ── Admin ──────────────────────────────────────────────────

  /**
   * Créer un établissement (admin)
   * → create() du backend
   */
  async create(payload: CreateHospitalPayload): Promise<IHospitalClinic> {
    const res = await api.post<ApiResponse<IHospitalClinic>>(
      "/hopitaux",
      payload
    );
    return res.data;
  },

  /**
   * Mettre à jour un établissement (admin)
   * → update() du backend — dot-notation côté serveur
   */
  async update(
    id: string,
    payload: UpdateHospitalPayload
  ): Promise<IHospitalClinic> {
    const res = await api.put<ApiResponse<IHospitalClinic>>(
      `/hopitaux/${id}`,
      payload
    );
    return res.data;
  },

  /**
   * Ajouter un médecin au staff
   * → addDoctor() du backend
   */
  async addDoctor(
    facilityId: string,
    doctorId: string
  ): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>(
      `/hopitaux/${facilityId}/doctors`,
      { doctorId }
    );
    return res.data;
  },

  /**
   * Retirer un médecin du staff
   * → removeDoctor() du backend
   */
  async removeDoctor(
    facilityId: string,
    doctorId: string
  ): Promise<{ message: string }> {
    const res = await api.del<ApiResponse<{ message: string }>>(
      `/hopitaux/${facilityId}/doctors/${doctorId}`
    );
    return res.data;
  },

  /**
   * Vérifier un établissement (admin)
   * → verify() du backend
   */
  async verify(id: string): Promise<{ message: string }> {
    const res = await api.patch<ApiResponse<{ message: string }>>(
      `/hopitaux/${id}/verify`,
      {}
    );
    return res.data;
  },

  /**
   * Supprimer un établissement (admin)
   * → delete() du backend
   */
  async delete(id: string): Promise<{ message: string }> {
    const res = await api.del<ApiResponse<{ message: string }>>(
      `/hopitaux/${id}`
    );
    return res.data;
  },

  /**
   * Soumettre un avis + note (patient)
   * → updateRating() du backend (déclenché côté serveur après review)
   */
  async submitReview(
    id: string,
    data: { rating: number; comment?: string }
  ): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>(
      `/hopitaux/${id}/reviews`,
      data
    );
    return res.data;
  },
};