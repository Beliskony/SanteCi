// ============================================================
// services/patientService.ts — Patient connecté
// Endpoints: /api/patients/*
// ============================================================

import * as api from "@/app/frontend/lib/apiClient";
import { useAuthStore } from "../store/useAuthStore";
import { isPatient } from "@/app/frontend/types";
import type {
  PatientUser,
  PatientProfile,
  PatientHealth,
  PatientPreferences,
  Prescription,
  ApiResponse,
  PaginatedResponse,
  BaseLocation,
} from "@/app/frontend/types";

export const patientService = {
  /**
   * Récupérer son propre profil complet
   */
  async getMe(): Promise<PatientUser> {
    const res = await api.get<ApiResponse<PatientUser>>("/api/patients/me");
    return res.data;
  },

  /**
   * Mettre à jour le profil de base
   */
  async updateProfile(data: Partial<PatientProfile>): Promise<PatientUser> {
    const res = await api.patch<ApiResponse<PatientUser>>(
      "/api/patients/me/profile",
      data
    );
    useAuthStore.getState().updatePatientProfile(data);
    return res.data;
  },

  /**
   * Mettre à jour les infos de santé (allergies, maladies chroniques...)
   */
  async updateHealth(data: Partial<PatientHealth>): Promise<PatientUser> {
    const res = await api.patch<ApiResponse<PatientUser>>(
      "/api/patients/me/health",
      data
    );
    useAuthStore.getState().updateHealth(data);
    return res.data;
  },

  /**
   * Mettre à jour les préférences (langue, notifications, vie privée)
   */
  async updatePreferences(
    data: Partial<PatientPreferences>
  ): Promise<PatientUser> {
    const res = await api.patch<ApiResponse<PatientUser>>(
      "/api/patients/me/preferences",
      data
    );
    useAuthStore.getState().updatePreferences(data);
    return res.data;
  },

  /**
   * Mettre à jour la localisation
   */
  async updateLocation(data: Partial<BaseLocation>): Promise<void> {
    await api.patch("/api/patients/me/location", data);
    useAuthStore.getState().updateLocation(data);
  },

  /**
   * Upload photo de profil
   */
  async uploadPhoto(file: File): Promise<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append("photo", file);
    const res = await api.uploadFile<ApiResponse<{ photoUrl: string }>>(
      "/api/patients/me/photo",
      formData
    );
    useAuthStore.getState().updatePatientProfile({ photo: res.data.photoUrl });
    return res.data;
  },

  /**
   * Changer le mot de passe
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const res = await api.patch<ApiResponse<{ message: string }>>(
      "/api/patients/me/password",
      { currentPassword, newPassword }
    );
    return res.data;
  },

  /**
   * Mes ordonnances
   */
  async getMyPrescriptions(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Prescription>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.append("page", String(params.page));
    if (params?.limit) qs.append("limit", String(params.limit));
    const query = qs.toString();
    return api.get<PaginatedResponse<Prescription>>(
      `/api/patients/me/prescriptions${query ? `?${query}` : ""}`
    );
  },

  /**
   * Vérifier si l'utilisateur courant est un patient
   */
  isCurrentUserPatient(): boolean {
    const { user } = useAuthStore.getState();
    return !!user && isPatient(user);
  },
};