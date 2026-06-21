// ============================================================
// services/doctorService.ts — Médecins
// Routes alignées sur app/doctor/*
//front
// ============================================================

import * as api from "@/app/frontend/lib/apiClient";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import { isDoctor } from "@/app/frontend/types";
import type {
  DoctorUser,
  DoctorProfile,
  DoctorTelemedicine,
  ApiResponse,
  BaseLocation,
} from "@/app/frontend/types";

// ─── Types alignés sur le backend ────────────────────────────

export interface DoctorFilters {
  specialty?: string;
  city?: string;
  isAvailable?: boolean;
  consultationType?: "video" | "audio" | "chat";
  minRating?: number;
  maxFee?: number;
  page?: number;
  limit?: number;
}

// Format exact retourné par searchDoctors() backend
export interface DoctorSearchResponse {
  doctors: Partial<DoctorUser>[];
  total: number;
  page: number;
  pages: number;
}

// ─── Service ─────────────────────────────────────────────────

export const doctorService = {

  // ── Publics (sans auth) ──────────────────────────────────

  /**
   * Recherche de médecins
   * GET /doctor/search
   * searchDoctors() backend
   */
  async search(filters?: DoctorFilters): Promise<DoctorSearchResponse> {
    const qs = new URLSearchParams();
    if (filters?.specialty)        qs.append("specialty",        filters.specialty);
    if (filters?.city)             qs.append("city",             filters.city);
    if (filters?.consultationType) qs.append("consultationType", filters.consultationType);
    if (filters?.isAvailable !== undefined)
      qs.append("isAvailable", String(filters.isAvailable));
    if (filters?.minRating)        qs.append("minRating",        String(filters.minRating));
    if (filters?.maxFee)           qs.append("maxFee",           String(filters.maxFee));
    if (filters?.page)             qs.append("page",             String(filters.page));
    if (filters?.limit)            qs.append("limit",            String(filters.limit));

    const query = qs.toString();
    // La route retourne { success, doctors, total, page, pages } sans enveloppe "data"
    const res = await api.get<DoctorSearchResponse & { success: boolean }>(
      `/doctor/search${query ? `?${query}` : ""}`,
      false
    );
    return {
      doctors: res.doctors,
      total:   res.total,
      page:    res.page,
      pages:   res.pages,
    };
  },

  /**
   * Profil public d'un médecin par doctorId
   * GET /doctor/[id]
   * getDoctorPublicProfile() backend
   */
  async getById(doctorId: string): Promise<Partial<DoctorUser>> {
    const res = await api.get<ApiResponse<Partial<DoctorUser>>>(
      `/doctor/${doctorId}`,
      false
    );
    return res.data;
  },

  /**
   * Disponibilités d'un médecin
   * GET /doctor/[id]/profile  (ou availability selon ta route)
   * getAvailability() backend
   */
  async getAvailability(doctorId: string): Promise<DoctorUser["telemedicine"]> {
    const res = await api.get<ApiResponse<DoctorUser["telemedicine"]>>(
      `/doctor/${doctorId}/profile`,
      false
    );
    return res.data;
  },

  /**
   * Créneaux disponibles pour un type donné
   * GET /doctor/teleconsultation/slot
   */
  async getAvailableSlots(
    doctorId: string,
    date: string,
    type: "video" | "audio" | "chat"
  ): Promise<string[]> {
    const res = await api.get<ApiResponse<string[]>>(
      `/doctor/teleconsultation/slot?doctorId=${doctorId}&date=${date}&type=${type}`,
      false
    );
    return res.data;
  },

  /**
   * Spécialités disponibles (déduit des données existantes)
   * GET /doctor/search?distinct=specialty
   */
  async getSpecialties(): Promise<string[]> {
    const res = await api.get<ApiResponse<string[]>>(
      "/doctor/search?distinct=specialty",
      false
    );
    return res.data;
  },

  /**
   * Mes patients — annuaire patient du médecin connecté
   * GET /doctor/patients
   */
  async getMyPatients(filters?: {
    query?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    patients: Array<{
      _id: string;
      profile: { firstName: string; lastName: string; photo?: string; dateOfBirth: string; bloodGroup?: string };
      mainCondition: string;
      followUpStatus: "priority" | "followed" | "recent" | null;
      nextAppointment: { date: string; label: string } | null;
      patientSince: string;
      totalConsultations: number;
    }>;
    total: number;
    page: number;
    pages: number;
  }> {
    const qs = new URLSearchParams();
    if (filters?.query)  qs.append("query", filters.query);
    if (filters?.page)   qs.append("page", String(filters.page));
    if (filters?.limit)  qs.append("limit", String(filters.limit));

    const query = qs.toString();
    const res = await api.get<{
      success: boolean;
      patients: any[];
      total: number;
      page: number;
      pages: number;
    }>(`/doctor/ligne/patients${query ? `?${query}` : ""}`);

    return {
      patients: res.patients,
      total:    res.total,
      page:     res.page,
      pages:    res.pages,
    };
  },

  // ── Médecin connecté (auth) ──────────────────────────────

  /**
   * Mon profil complet
   * GET /doctor/(auth)/[id]/profile
   */
  async getMyProfile(): Promise<DoctorUser> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error("Non authentifié.");
    const res = await api.get<ApiResponse<DoctorUser>>(
      `/doctor/${user._id}/profile`
    );
    return res.data;
  },

  /**
   * Mettre à jour mon profil
   * PATCH /doctor/(auth)/[id]/profile
   */
  async updateMyProfile(data: Partial<DoctorProfile>): Promise<DoctorUser> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error("Non authentifié.");
    const res = await api.put<ApiResponse<DoctorUser>>(
      `/doctor/${user._id}/profile`,
      data
    );
    useAuthStore.getState().updateDoctorProfile(data);
    return res.data;
  },

  /**
   * Mettre à jour les paramètres de télémédecine
   * PATCH /doctor/(auth)/telemedicine
   */
  async updateTelemedicine(data: Partial<DoctorTelemedicine>): Promise<DoctorUser> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error("Non authentifié.");
    const res = await api.put<ApiResponse<DoctorUser>>(
      `/doctor/${user._id}/telemedicine`,
      data
    );
    useAuthStore.getState().updateTelemedicine(data);
    return res.data;
  },

  /**
   * Passer en ligne / hors ligne
   * PATCH /doctor/(auth)/ligne
 
  async setOnlineStatus(isOnline: boolean): Promise<void> {
    await api.patch("/doctor/auth/ligne", { isOnline });
    useAuthStore.getState().setOnlineStatus(isOnline);
  },  */

  /**
   * Upload photo de profil
   * POST /doctor/(auth)/photo
   */
  async uploadPhoto(file: File): Promise<{ photoUrl: string }> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error("Non authentifié.");
    const formData = new FormData();
    formData.append("photo", file);
    const res = await api.uploadFile<ApiResponse<{ photoUrl: string }>>(
      `/doctor/${user._id}/photo`,
      formData
    );
    useAuthStore.getState().updateDoctorProfile({ photo: res.data.photoUrl });
    return res.data;
  },

  /**
   * Ajouter une certification
   * POST /doctor/(auth)/ligne/certifications/[certId]
   */
  async addCertification(data: {
    name: string;
    year: number;
    issuer: string;
    document?: File;
  }): Promise<DoctorUser> {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("year", String(data.year));
    formData.append("issuer", data.issuer);
    if (data.document) formData.append("document", data.document);

    const res = await api.uploadFile<ApiResponse<DoctorUser>>(
      "/doctor/ligne/certifications",
      formData
    );
    return res.data;
  },

  /**
   * Supprimer une certification
   * DELETE /doctor/(auth)/ligne/certifications/[certId]
   */
  async removeCertification(certId: string): Promise<DoctorUser> {
    const res = await api.del<ApiResponse<DoctorUser>>(
      `/doctor/ligne/certifications/${certId}`
    );
    return res.data;
  },

  /**
   * Supprimer mon compte
   * DELETE /doctor/(auth)/ligne/delete
   */
  async deleteAccount(): Promise<{ message: string }> {
    const res = await api.del<{ success: boolean; message: string }>(
      "/doctor/ligne/delete"
    );
    return { message: res.message };
  },

  /**
   * Mettre à jour le statut d'un créneau
   * PATCH /doctor/creneau/status
   */
  async updateSlotStatus(
    doctorId: string,
    day: string,
    slotStart: string,
    isBooked: boolean
  ): Promise<{ message: string }> {
    const res = await api.patch<ApiResponse<{ message: string }>>(
      "/doctor/creneau/status",
      { doctorId, day, slotStart, isBooked }
    );
    return res.data;
  },

  // ── Helper ───────────────────────────────────────────────

  isCurrentUserDoctor(): boolean {
    const { user } = useAuthStore.getState();
    return !!user && isDoctor(user);
  },
};