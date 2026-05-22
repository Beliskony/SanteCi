// services/patientService.ts — Patient connecté
// Endpoints: /api/patients/*

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

export interface EmergencyContactDTO {
  name: string;
  phone: string;
  relationship: string;
}

export interface PatientStats {
  totalConsultations: number;
  totalPrescriptions: number;
  lastMedicalUpdate: Date | null;
  bmi: number | null;
}

export const patientService = {


  async updateProfile(data: Partial<PatientProfile>): Promise<PatientUser> {
    const res = await api.patch<ApiResponse<PatientUser>>(
      "/patients/uniquement/profile",
      data
    );
    useAuthStore.getState().updatePatientProfile(data);
    return res.data;
  },

  // bmi recalculé par le backend → on sync avec res.data.health, pas data
  async updateHealth(data: Partial<PatientHealth>): Promise<PatientUser> {
      // Récupérer l'ID du patient connecté depuis le store
  const user = useAuthStore.getState().user;
  const patientId = user?._id.toString();

  if (!patientId) {
    throw new Error("Utilisateur non authentifié.");
  }

    const res = await api.put<ApiResponse<PatientUser>>(
      `/patients/${patientId}/health`,
      data
    );
    useAuthStore.getState().updateHealth(res.data.health);
    return res.data;
  },

  async updatePreferences(data: Partial<PatientPreferences>): Promise<PatientUser> {
    const res = await api.patch<ApiResponse<PatientUser>>(
      "/patients/preferences",
      data
    );
    useAuthStore.getState().updatePreferences(data);
    return res.data;
  },

  async updateLocation(data: Partial<BaseLocation>): Promise<void> {
    await api.patch("/patients/uniquement/location", data);
    useAuthStore.getState().updateLocation(data);
  },

  async uploadPhoto(file: File, patientId?: string): Promise<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append("photo", file);
    const res = await api.uploadFile<ApiResponse<{ photoUrl: string }>>(
      `/patients/${patientId || useAuthStore.getState().user?._id}/photo`,
      formData
    );
    useAuthStore.getState().updateProfilePhoto(res.data.photoUrl);
    return res.data;
  },

  // Backend limite à 3 contacts, retourne le patient complet mis à jour
  async addEmergencyContact(dto: EmergencyContactDTO): Promise<PatientUser> {
    const res = await api.post<ApiResponse<PatientUser>>(
      "/patients/emergency-contacts",
      dto
    );
    useAuthStore.setState({ user: res.data });
    return res.data;
  },

  async removeEmergencyContact(contactId: string): Promise<PatientUser> {
    const res = await api.del<ApiResponse<PatientUser>>(
      `/patients/emergency-contacts/${contactId}`
    );
    useAuthStore.setState({ user: res.data });
    return res.data;
  },

  async getStats(): Promise<PatientStats> {
    const res = await api.get<ApiResponse<PatientStats>>(
      "/patients/stats"
    );
    return res.data;
  },

  // Soft delete : status → suspended + isActive → false, puis logout
  async deleteAccount(): Promise<{ message: string }> {
    const res = await api.del<ApiResponse<{ message: string }>>(
      "/patients/delete"
    );
    useAuthStore.getState().logout();
    return res.data;
  },

  async getMyPrescriptions(patientId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Prescription>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.append("page", String(params.page));
    if (params?.limit) qs.append("limit", String(params.limit));
    const query = qs.toString();
    return api.get<PaginatedResponse<Prescription>>(
      `/appointments/${patientId}/${query ? `?${query}` : ""}`
    );
  },

  isCurrentUserPatient(): boolean {
    const { user } = useAuthStore.getState();
    return !!user && isPatient(user);
  },
};