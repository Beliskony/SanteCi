// services/patientService.ts — Patient connecté
// Endpoints: /api/patients/*
//
// Rappel structure Next.js :
// Les dossiers (patient seul), (medecin) etc. sont des route groups → pas dans l'URL
// /api/patients/(patient seul)/stats  → URL réelle : /api/patients/stats
// /api/patients/(patient seul)/delete → URL réelle : /api/patients/delete
// /api/patients/[id]/ordonnance       → URL réelle : /api/patients/:id/ordonnance

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

// ─── Helper interne ───────────────────────────────────────────────────────────
// Lecture sécurisée du patientId depuis le store
// Après rehydration localStorage, _id peut être string ou ObjectId → on normalise
function getPatientId(): string {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error("Utilisateur non authentifié.");
  const raw = user._id;
  return typeof raw === "string" ? raw : raw.toString();
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const patientService = {

  // ── getProfile — appelé par fetchProfile dans le store ────────────────────
  // Route publique /api/patients/[id] → on passe l'id du patient connecté
  async getProfile(): Promise<PatientUser> {
    const patientId = getPatientId();
    const res = await api.get<ApiResponse<PatientUser>>(`/patients/${patientId}`);
    return res.data;
  },


  // ── updateProfile ─────────────────────────────────────────────────────────
  //  FIX #4 — Sync avec res.data.profile (réponse serveur) et non `data` (input)
  async updateProfile(data: Partial<PatientProfile>): Promise<PatientUser> {
    const patientId = getPatientId();
    const res = await api.patch<ApiResponse<PatientUser>>(
      `/patients/${patientId}`,
      data
    );
    useAuthStore.getState().updatePatientProfile(res.data.profile);
    return res.data;
  },

  // ── getHealth ─────────────────────────────────────────────────────────────
  // GET /api/patients/[id]/health → { success: true, data: patient.health }
  // À appeler au montage des pages qui ont besoin de health à jour
  async getHealth(): Promise<PatientHealth> {
    const patientId = getPatientId();
    const res = await api.get<ApiResponse<PatientHealth>>(`/patients/${patientId}/health`);
    useAuthStore.getState().updateHealth(res.data);
    return res.data;
  },

  // ── updateHealth ──────────────────────────────────────────────────────────
  // FIX — La route retourne { success: true, data: updated.health }
  // donc res.data EST PatientHealth directement, pas PatientUser
  async updateHealth(data: Partial<PatientHealth>): Promise<PatientHealth> {
    const patientId = getPatientId();
    const res = await api.put<ApiResponse<PatientHealth>>(
      `/patients/${patientId}/health`,
      data
    );
    useAuthStore.getState().updateHealth(res.data);
    return res.data;
  },

  // ── updatePreferences ─────────────────────────────────────────────────────
  //  FIX #3 — URL corrigée (route group (patient seul) invisible dans l'URL)
  //  FIX #4 — Sync avec res.data.preferences et non `data`
  async updatePreferences(data: Partial<PatientPreferences>): Promise<PatientUser> {
    const res = await api.patch<ApiResponse<PatientUser>>(
      "/patients/preferences",
      data
    );
    useAuthStore.getState().updatePreferences(res.data.preferences);
    return res.data;
  },

  // ── updateLocation ────────────────────────────────────────────────────────
  async updateLocation(data: Partial<BaseLocation>): Promise<void> {
    await api.patch("/patients/location", data);
    // Location n'a pas de champs calculés → sync optimiste avec `data` OK ici
    useAuthStore.getState().updateLocation(data);
  },

  // ── uploadPhoto ───────────────────────────────────────────────────────────
async uploadPhoto(file: File): Promise<{ photoUrl: string }> {
  const patientId = getPatientId();
  
  // Validation côté client
  const maxSize = 5 * 1024 * 1024;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Format non supporté. Utilisez JPG, PNG ou WEBP.");
  }
  
  if (file.size > maxSize) {
    throw new Error("L'image ne doit pas dépasser 5MB.");
  }
  
  const formData = new FormData();
  formData.append("photo", file);
  
  const token = useAuthStore.getState().token;
  
  const response = await fetch(`/api/patients/${patientId}/photo`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Erreur ${response.status}`);
  }
  
  const res = await response.json();
  
  // Mettre à jour le store
  useAuthStore.getState().updateProfilePhoto(res.data.photoUrl);
  
  return res.data;
},
  // ── addEmergencyContact ───────────────────────────────────────────────────
  //  FIX #2 — Ne plus écraser tout le user avec setState({ user: res.data })
  // On merge proprement via updatePatientProfile pour ne toucher qu'au contact
  async addEmergencyContact(dto: EmergencyContactDTO): Promise<PatientUser> {
    const res = await api.post<ApiResponse<PatientUser>>(
      "/patients/emergency-contacts",
      dto
    );
    // Le backend retourne le patient complet → on merge contact + profile
    const { updatePatientProfile, updateHealth } = useAuthStore.getState();
    updatePatientProfile(res.data.profile);
    // On met à jour le contact via une action dédiée si disponible,
    // sinon on force un merge partiel du user sans toucher token/auth
    useAuthStore.setState((state) => ({
      user: state.user ? { ...state.user, contact: res.data.contact } : state.user,
    }));
    return res.data;
  },

  // ── removeEmergencyContact ────────────────────────────────────────────────
  //  FIX #2 — Même correction
  async removeEmergencyContact(contactId: string): Promise<PatientUser> {
    const res = await api.del<ApiResponse<PatientUser>>(
      `/patients/emergency-contacts/${contactId}`
    );
    useAuthStore.setState((state) => ({
      user: state.user ? { ...state.user, contact: res.data.contact } : state.user,
    }));
    return res.data;
  },

  // ── getStats ──────────────────────────────────────────────────────────────
  // Route JWT-based : le backend lit patientId depuis le token
  async getStats(): Promise<PatientStats> {
    const res = await api.get<ApiResponse<PatientStats>>("/patients/stats");
    return res.data;
  },

  // ── deleteAccount ─────────────────────────────────────────────────────────
  async deleteAccount(): Promise<{ message: string }> {
    const res = await api.del<ApiResponse<{ message: string }>>(
      "/patients/delete"
    );
    useAuthStore.getState().logout();
    return res.data;
  },

  // ── getMyPrescriptions ────────────────────────────────────────────────────
  //  FIX #1 — URL corrigée : /patients/[id]/ordonnance (et non /appointments/...)
  async getMyPrescriptions(
    patientId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Prescription>> {
    const qs = new URLSearchParams();
    if (params?.page)  qs.append("page",  String(params.page));
    if (params?.limit) qs.append("limit", String(params.limit));
    const query = qs.toString();
    return api.get<PaginatedResponse<Prescription>>(
      `/patients/${patientId}/ordonnance${query ? `?${query}` : ""}`
    );
  },

  // ── isCurrentUserPatient ──────────────────────────────────────────────────
  isCurrentUserPatient(): boolean {
    const { user } = useAuthStore.getState();
    return !!user && isPatient(user);
  },
};