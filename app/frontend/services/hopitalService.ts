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

// ── Helper interne : fetch multipart avec méthode configurable ──
async function uploadWithMethod<T>(
  endpoint: string,
  method: "PUT" | "PATCH",
  formData: FormData
): Promise<T> {
  const token = typeof window !== "undefined"
    ? (() => {
        try {
          const raw = localStorage.getItem("auth-storage");
          return raw ? JSON.parse(raw)?.state?.token ?? null : null;
        } catch { return null; }
      })()
    : null;

  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? ""}${endpoint}`,
    { method, headers, body: formData }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Erreur ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const hospitalService = {

  // ── Publics ────────────────────────────────────────────────

  /**
   * Recherche avec filtres
   * → GET /hopitaux
   */
  async search(filters?: HospitalFilters): Promise<HospitalSearchResponse> {
    const qs = new URLSearchParams();

    if (filters?.city)                     qs.append("city",                 filters.city);
    if (filters?.district)                 qs.append("district",             filters.district);
    if (filters?.type)                     qs.append("type",                 filters.type);
    if (filters?.category)                 qs.append("category",             filters.category);
    if (filters?.specialty)                qs.append("specialty",            filters.specialty);
    if (filters?.telemedicineEnabled !== undefined)
      qs.append("telemedicineEnabled", String(filters.telemedicineEnabled));
    if (filters?.homeVisits !== undefined)
      qs.append("homeVisits",          String(filters.homeVisits));
    if (filters?.emergency24h !== undefined)
      qs.append("emergency24h",        String(filters.emergency24h));
    if (filters?.page)                     qs.append("page",                 String(filters.page));
    if (filters?.limit)                    qs.append("limit",                String(filters.limit));

    const query = qs.toString();
    const res = await api.get<RawSearchResponse>(
      `/hopitaux${query ? `?${query}` : ""}`,
      false
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
   * → GET /hopitaux/[id]
   */
  async getById(id: string): Promise<IHospitalClinic> {
    const res = await api.get<ApiResponse<IHospitalClinic>>(
      `/hopitaux/${id}`,
      false
    );
    return res.data;
  },

  // ── Admin ──────────────────────────────────────────────────

  /**
   * Créer un établissement — FormData pour supporter l'image optionnelle
   * → POST /hopitaux  (via uploadFile qui gère le multipart)
   */
  async create(payload: CreateHospitalPayload, image?: File): Promise<IHospitalClinic> {
    const formData = new FormData();
    formData.append("data", JSON.stringify(payload));
    if (image) formData.append("image", image);

    const res = await api.uploadFile<ApiResponse<IHospitalClinic>>(
      "/hopitaux",
      formData
    );
    return res.data;
  },

  /**
   * Mettre à jour un établissement — FormData pour supporter l'image optionnelle
   * → PUT /hopitaux/[id]
   */
  async update(
    id: string,
    payload: UpdateHospitalPayload,
    image?: File
  ): Promise<IHospitalClinic> {
    const formData = new FormData();
    formData.append("data", JSON.stringify(payload));
    if (image) formData.append("image", image);

    const res = await uploadWithMethod<ApiResponse<IHospitalClinic>>(
      `/hopitaux/${id}`,
      "PUT",
      formData
    );
    return res.data;
  },

  /**
   * Mettre à jour uniquement l'image de couverture
   * → PATCH /hopitaux/[id]/cover
   */
  async updateCoverImage(id: string, image: File): Promise<IHospitalClinic> {
    const formData = new FormData();
    formData.append("image", image);

    const res = await uploadWithMethod<ApiResponse<IHospitalClinic>>(
      `/hopitaux/${id}/cover`,
      "PATCH",
      formData
    );
    return res.data;
  },

  /**
   * Supprimer l'image de couverture
   * → DELETE /hopitaux/[id]/cover
   */
  async deleteCoverImage(id: string): Promise<{ message: string }> {
    const res = await api.del<ApiResponse<{ message: string }>>(
      `/hopitaux/${id}/cover`
    );
    return res.data;
  },

  /**
   * Ajouter un médecin au staff
   * → POST /hopitaux/[id]/doctors
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
   * → DELETE /hopitaux/[id]/doctors?doctorId=xxx
   * api.del n'accepte pas de body → doctorId en query param
   */
  async removeDoctor(
    facilityId: string,
    doctorId: string
  ): Promise<{ message: string }> {
    const res = await api.del<ApiResponse<{ message: string }>>(
      `/hopitaux/${facilityId}/doctors?doctorId=${doctorId}`
    );
    return res.data;
  },

  /**
   * Soumettre une note
   * → POST /hopitaux/[id]/rating
   */
  async submitReview(
    id: string,
    data: { rating: number; comment?: string }
  ): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>(
      `/hopitaux/${id}/rating`,
      data
    );
    return res.data;
  },

  /**
   * Vérifier un établissement (admin)
   * → PATCH /hopitaux/[id]/verify
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
   * → DELETE /hopitaux/[id]
   */
  async delete(id: string): Promise<{ message: string }> {
    const res = await api.del<ApiResponse<{ message: string }>>(
      `/hopitaux/${id}`
    );
    return res.data;
  },
};