// ============================================================
// types/index.ts — Types centralisés SanteMedCI
// ⚠️  AuthUser / PatientUser / DoctorUser + leurs sous-types
//     sont importés directement depuis useAuthStore
//     → source de vérité UNIQUE, zéro duplication, zéro conflit
// ============================================================

import { AuthUser } from "@/app/frontend/store/useAuthStore";

// ─── Source de vérité : le store ─────────────────────────────
export type {
  AuthUser,
  PatientUser,
  DoctorUser,
  PatientProfile,
  PatientContact,
  PatientHealth,
  PatientPreferences,
  DoctorProfile,
  DoctorTelemedicine,
  BaseProfile,
  BaseContact,
  BaseLocation,
  BaseStatus,
} from "@/app/frontend/store/useAuthStore";



// Type guards (définis dans le store, réexportés ici)
export { isPatient, isDoctor } from "@/app/frontend/store/useAuthStore";

// ─── Auth Payloads (nouveaux types, pas dans le store) ────────

export interface LoginPayload {
  email: string;
  password: string;
  role: "patient" | "doctor";
}

export interface RegisterPatientPayload {
  role: "patient";
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  phone: string;
  email: string;
  password: string;
}

export interface RegisterDoctorPayload {
  role: "doctor";
  firstName: string;
  lastName: string;
  title: "Dr" | "Pr" | "Médecin" | "Spécialiste";
  specialty: string;
  phone: string;
  email: string;
  licenseNumber: string;
  university: string;
  graduationYear: number;
  password: string;
}

export type RegisterPayload = RegisterPatientPayload | RegisterDoctorPayload;

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// ─── Consultation ─────────────────────────────────────────────

export type ConsultationType = "video" | "audio" | "chat";

export type ConsultationStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Consultation {
  _id: string;
  patientId: string;
  doctorId: string;
  type: ConsultationType;
  status: ConsultationStatus;
  scheduledAt: Date;
  duration?: number;
  symptoms?: string;
  notes?: string;
  fee: number;
  paymentStatus: "pending" | "paid" | "refunded";
  meetingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConsultationPayload {
  doctorId: string;
  type: ConsultationType;
  scheduledAt: string;
  symptoms?: string;
}

export interface ConsultationFilters {
  status?: ConsultationStatus;
  type?: ConsultationType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// ─── Ordonnance ───────────────────────────────────────────────

export interface Medicament {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  _id: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  medications: Medicament[];
  generalInstructions?: string;
  validUntil?: Date;
  createdAt: Date;
}

// ─── Notification ─────────────────────────────────────────────

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  category: "consultation" | "payment" | "system" | "reminder";
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
}

// ─── Filtres médecins ─────────────────────────────────────────

export interface DoctorFilters {
  specialty?: string;
  city?: string;
  consultationType?: ConsultationType;
  available?: boolean;
  minRating?: number;
  maxFee?: number;
  page?: number;
  limit?: number;
}

// ─── Réponses API génériques ──────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}