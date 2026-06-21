// ============================================================
// types/appointment.types.ts
// Types frontend — alignés sur IAppointment + AppointmentSchema
// Les dates sont des strings ISO 8601 (JSON ne transporte pas Date)
// Les ObjectId sont des strings (sérialisés par Mongoose)
// ============================================================

// ─── Primitives ───────────────────────────────────────────────────────────────

export type ConsultationType = "video" | "audio" | "chat" | "in_person";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export type Priority = "low" | "medium" | "high" | "emergency";

export type Currency = "XOF" | "EUR" | "USD";

export type PaymentMethod = "mobile_money" | "card" | "wallet" | "Assurance";

export type PaymentProvider = "orange_money" | "mtn_money" | "wave";

export type CancelledBy = "patient" | "doctor" | "system";

export type BookedBy = "patient" | "assistant" | "system";

export type UploadedBy = "patient" | "doctor";

// ─── Sous-types ───────────────────────────────────────────────────────────────

export interface AppointmentDetails {
  type: ConsultationType;
  scheduledFor: Date;       // ISO 8601 — z.date() → sérialisé en string
  duration: number;           // en minutes
  reason: string;
  symptoms: string[];
  priority: Priority;
}

export interface AppointmentStatusInfo {
  current: AppointmentStatus;
  paymentStatus: PaymentStatus;
  cancellationReason?: string;
  cancelledBy?: CancelledBy;
}

export interface AppointmentConsultation {
  startedAt?: string;         // ISO 8601
  endedAt?: string;           // ISO 8601
  actualDuration?: number;    // en minutes, calculé côté backend
  notes?: string;
  diagnosis?: string;
  recommendations: string[];
  prescriptionId?: string;    // ObjectId sérialisé
  followUpDate?: string;      // ISO 8601
}

export interface AppointmentPayment {
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  provider?: PaymentProvider;
  transactionId?: string;
  paidAt?: string;            // ISO 8601
}

export interface SharedDocument {
  name: string;
  url: string;
  uploadedBy: UploadedBy;
}

export interface AppointmentCommunication {
  chatRoomId: string;
  videoRoomId?: string;
  recordings: string[];       // URLs
  sharedDocuments: SharedDocument[];
}

export interface AppointmentNotifications {
  remindersSent: number;
  lastReminderSent?: string;  // ISO 8601
  patientJoinedAt?: string;   // ISO 8601
  doctorJoinedAt?: string;    // ISO 8601
}

export interface AppointmentMetadata {
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
  bookedBy?: BookedBy;        // présent dans IAppointment, absent du schema Zod
}

// ─── Populate patient/médecin (retourné par getById / list) ──────────────────

export interface PopulatedPatient {
  _id: string;
  profile: {
    firstName: string;
    lastName: string;
    photo?: string;
  };
  contact?: {
    phone?: string;
  };
}

export interface PopulatedDoctor {
  _id: string;
  profile: {
    firstName: string;
    lastName: string;
    specialty?: string;
    title?: string;
  };
}

// ─── Type principal ───────────────────────────────────────────────────────────

export interface Appointment {
  _id: string;                          // ObjectId sérialisé
  appointmentId: string;                // ex: "APT-3F9A1C2B4E"

  // Références — string brut ou objet populé selon l'endpoint
  patientId: string | PopulatedPatient;
  doctorId: string | PopulatedDoctor;

  details: AppointmentDetails;
  status: AppointmentStatusInfo;
  consultation: AppointmentConsultation;
  payment: AppointmentPayment;
  communication: AppointmentCommunication;
  notifications: AppointmentNotifications;
  metadata: AppointmentMetadata;
}

// ─── Guards de populate ───────────────────────────────────────────────────────

export const isPopulatedPatient = (
  v: string | PopulatedPatient
): v is PopulatedPatient =>
  typeof v === "object" && v !== null && "profile" in v;

export const isPopulatedDoctor = (
  v: string | PopulatedDoctor
): v is PopulatedDoctor =>
  typeof v === "object" && v !== null && "profile" in v;

// ─── DTOs (envoyés au service) ────────────────────────────────────────────────

/** POST /api/appointments */
export interface CreateAppointmentDTO {
  patientId: string;
  doctorId: string;
  type: ConsultationType;
  scheduledFor: string;       // ISO 8601
  duration: number;
  reason: string;
  symptoms?: string[];
  priority: Priority;
  payment: {
    amount: number;
    currency: Currency;
    method: PaymentMethod;
    provider?: PaymentProvider;
  };
}

/** PATCH /api/appointments/[id]/end */
export interface UpdateConsultationDTO {
  notes?: string;
  diagnosis?: string;
  recommendations?: string[];
  prescriptionId?: string;
  followUpDate?: string;      // ISO 8601
}

/** PATCH /api/appointments/[id]/payment */
export interface UpdatePaymentDTO {
  paymentStatus: PaymentStatus;
  transactionId?: string;
  paidAt?: string;            // ISO 8601
}

/** GET /api/appointments — query params */
export interface AppointmentFiltersDTO {
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  type?: ConsultationType;
  from?: string;              // ISO 8601
  to?: string;                // ISO 8601
  page?: number;
  limit?: number;
}

// ─── Réponses paginées ────────────────────────────────────────────────────────

export interface PaginatedAppointments {
  appointments: Appointment[];
  total: number;
  page: number;
  pages: number;
}

// ─── Stats médecin ────────────────────────────────────────────────────────────

export interface DoctorStatsResponse {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pending: number;
  totalEarnings: number;
  consultationsToday: number;
}