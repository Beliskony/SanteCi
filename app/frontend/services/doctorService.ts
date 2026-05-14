// ============================================================
// services/doctorService.ts — Médecins
// Routes alignées sur app/doctor/*
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
   * → GET /doctor/search
   * → searchDoctors() backend
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
   * → GET /doctor/[id]
   * → getDoctorPublicProfile() backend
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
   * → GET /doctor/[id]/profile  (ou availability selon ta route)
   * → getAvailability() backend
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
   * → GET /doctor/teleconsultation/slot
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
   * → GET /doctor/search?distinct=specialty
   */
  async getSpecialties(): Promise<string[]> {
    const res = await api.get<ApiResponse<string[]>>(
      "/doctor/search?distinct=specialty",
      false
    );
    return res.data;
  },

  // ── Médecin connecté (auth) ──────────────────────────────

  /**
   * Mon profil complet
   * → GET /doctor/(auth)/[id]/profile
   */
  async getMyProfile(): Promise<DoctorUser> {
    const res = await api.get<ApiResponse<DoctorUser>>(
      "/doctor/auth/profile"
    );
    return res.data;
  },

  /**
   * Mettre à jour mon profil
   * → PATCH /doctor/(auth)/[id]/profile
   */
  async updateMyProfile(data: Partial<DoctorProfile>): Promise<DoctorUser> {
    const res = await api.patch<ApiResponse<DoctorUser>>(
      "/doctor/auth/profile",
      data
    );
    useAuthStore.getState().updateDoctorProfile(data);
    return res.data;
  },

  /**
   * Mettre à jour les paramètres de télémédecine
   * → PATCH /doctor/(auth)/telemedicine
   */
  async updateTelemedicine(data: Partial<DoctorTelemedicine>): Promise<DoctorUser> {
    const res = await api.patch<ApiResponse<DoctorUser>>(
      "/doctor/auth/telemedicine",
      data
    );
    useAuthStore.getState().updateTelemedicine(data);
    return res.data;
  },

  /**
   * Passer en ligne / hors ligne
   * → PATCH /doctor/(auth)/ligne
   */
  async setOnlineStatus(isOnline: boolean): Promise<void> {
    await api.patch("/doctor/auth/ligne", { isOnline });
    useAuthStore.getState().setOnlineStatus(isOnline);
  },

  /**
   * Upload photo de profil
   * → POST /doctor/(auth)/photo
   */
  async uploadPhoto(file: File): Promise<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append("photo", file);
    const res = await api.uploadFile<ApiResponse<{ photoUrl: string }>>(
      "/doctor/auth/photo",
      formData
    );
    useAuthStore.getState().updateDoctorProfile({ photo: res.data.photoUrl });
    return res.data;
  },

  /**
   * Ajouter une certification
   * → POST /doctor/(auth)/ligne/certifications/[certId]
   */
  async addCertification(data: {
    name: string;
    year: number;
    issuer: string;
  }): Promise<DoctorUser> {
    const res = await api.post<ApiResponse<DoctorUser>>(
      "/doctor/auth/ligne/certifications",
      data
    );
    return res.data;
  },

  /**
   * Supprimer une certification
   * → DELETE /doctor/(auth)/ligne/certifications/[certId]
   */
  async removeCertification(certId: string): Promise<DoctorUser> {
    const res = await api.del<ApiResponse<DoctorUser>>(
      `/doctor/auth/ligne/certifications/${certId}`
    );
    return res.data;
  },

  /**
   * Supprimer mon compte
   * → DELETE /doctor/(auth)/ligne/delete
   */
  async deleteAccount(): Promise<{ message: string }> {
    const res = await api.del<ApiResponse<{ message: string }>>(
      "/doctor/auth/ligne/delete"
    );
    return res.data;
  },

  /**
   * Mettre à jour le statut d'un créneau
   * → PATCH /doctor/creneau/status
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