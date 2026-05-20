// ============================================================
// services/appointmentService.ts
// Aligné sur le backend AppointmentService
// Prefix : /api/appointments
// ============================================================

import * as api from "@/app/frontend/lib/apiClient";
import type {
  ApiResponse,
} from "@/app/frontend/types";
import { Appointment, PaginatedAppointments } from "../types/Appointment";

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface CreateAppointmentDTO {
  patientId: string;
  doctorId: string;
  type: ConsultationType;
  scheduledFor: string; // ISO string côté frontend, converti en Date côté backend
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

export interface UpdateConsultationDTO {
  notes?: string;
  diagnosis?: string;
  recommendations?: string[];
  prescriptionId?: string;
  followUpDate?: string; // ISO string
}

export interface AppointmentFiltersDTO {
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  type?: ConsultationType;
  from?: string; // ISO string
  to?: string;   // ISO string
  page?: number;
  limit?: number;
}

export interface UpdatePaymentDTO {
  paymentStatus: PaymentStatus;
  transactionId?: string;
  paidAt?: string; // ISO string
}

export interface DoctorStatsResponse {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pending: number;
  totalEarnings: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const appointmentService = {

  // ── Créer un rendez-vous (patient) ────────────────────────────────────────

  /**
   * POST /api/appointments
   * Vérifie : médecin actif, patient actif, pas de conflit de créneau.
   */
  async create(dto: CreateAppointmentDTO): Promise<Appointment> {
    const res = await api.post<ApiResponse<Appointment>>(
      "/appointments",
      dto
    );
    return res.data;
  },

  // ── Récupérer un rendez-vous par _id Mongo ────────────────────────────────

  /**
   * GET /api/appointments/[id]
   * Retourne le rendez-vous avec populate patient + médecin.
   */
  async getById(id: string): Promise<Appointment> {
    const res = await api.get<ApiResponse<Appointment>>(
      `/appointments/${id}`
    );
    return res.data;
  },

  // ── Lister avec filtres ───────────────────────────────────────────────────

  /**
   * GET /api/appointments?patientId=...&status=...&page=...
   * Réponse paginée : { appointments, total, page, pages }
   */
  async list(filters?: AppointmentFiltersDTO): Promise<PaginatedAppointments> {
    const qs = new URLSearchParams();
    if (filters?.page) qs.append('page', String(filters.page));
    if (filters?.limit) qs.append('limit', String(filters.limit));
    if (filters?.status) qs.append('status', filters.status);
    if (filters?.patientId) qs.append('patientId', filters.patientId);
    if (filters?.doctorId) qs.append('doctorId', filters.doctorId);
    if (filters?.from) qs.append('from', filters.from);
    if (filters?.to) qs.append('to', filters.to);

    const query = qs.toString();
    return api.get<PaginatedAppointments>(`/appointments${query ? `?${query}` : ""}`);
  },

  // ── Confirmer (médecin) ───────────────────────────────────────────────────

  /**
   * PATCH /api/appointments/[id]/confirm
   * pending → confirmed. Réservé au médecin concerné.
   */
  async confirm(id: string): Promise<Appointment> {
    const res = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/confirm`,
      {}
    );
    return res.data;
  },

  // ── Démarrer la consultation (médecin) ────────────────────────────────────

  /**
   * PATCH /api/appointments/[id]/start
   * confirmed → ongoing. Enregistre consultation.startedAt.
   * Réservé au médecin concerné.
   */
  async start(id: string): Promise<Appointment> {
    const res = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/start`,
      {}
    );
    return res.data;
  },

  // ── Clore la consultation (médecin) ──────────────────────────────────────

  /**
   * PATCH /api/appointments/[id]/end
   * ongoing → completed. Calcule actualDuration automatiquement côté backend.
   * Accepte : notes, diagnosis, recommendations, prescriptionId, followUpDate.
   */
  async end(id: string, dto: UpdateConsultationDTO): Promise<Appointment> {
    const res = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/end`,
      dto
    );
    return res.data;
  },

  // ── Annuler (patient ou médecin) ──────────────────────────────────────────

  /**
   * PATCH /api/appointments/[id]/cancel
   * Statuts annulables : pending, confirmed.
   * Si déjà payé → paymentStatus bascule à "refunded".
   * cancelledBy est requis — le backend vérifie que le requester
   * est bien le patient ou le médecin du rendez-vous.
   */
  async cancel(
    id: string,
    cancelledBy: CancelledBy,
    reason: string
  ): Promise<Appointment> {
    const res = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/cancel`,
      { cancelledBy, reason }
    );
    return res.data;
  },

  // ── Marquer absent (médecin) ──────────────────────────────────────────────

  /**
   * PATCH /api/appointments/[id]/no-show
   * confirmed → no_show. Réservé au médecin concerné.
   */
  async markNoShow(id: string): Promise<Appointment> {
    const res = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/no-show`,
      {}
    );
    return res.data;
  },

  // ── Rejoindre la salle (patient ou médecin) ───────────────────────────────

  /**
   * POST /api/appointments/[id]/join
   * Enregistre patientJoinedAt ou doctorJoinedAt selon le rôle.
   * Aucune URL de salle retournée — le backend enregistre juste
   * l'horodatage. La gestion de la salle vidéo est externe (ex: Daily.co).
   */
  async join(
    id: string,
    role: "patient" | "doctor"
  ): Promise<{ message: string }> {
    return api.post(`/appointments/${id}/join`, { role });
  },

  // ── Mettre à jour le paiement ─────────────────────────────────────────────

  /**
   * PATCH /api/appointments/[id]/payment
   * Met à jour paymentStatus, transactionId, paidAt.
   * Appelé typiquement après callback du prestataire (Orange Money, Wave…).
   */
  async updatePayment(
    id: string,
    dto: UpdatePaymentDTO
  ): Promise<Appointment> {
    const res = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/payment`,
      dto
    );
    return res.data;
  },

  // ── Agenda du médecin pour un jour donné ──────────────────────────────────

  /**
   * GET /api/appointments/agenda?doctorId=...&date=YYYY-MM-DD
   * Retourne tous les rendez-vous d'un médecin pour une journée.
   * Exclut les annulés. Trié par scheduledFor ASC.
   */
  async getAgenda(doctorId: string, date: string): Promise<Appointment[]> {
    const qs = new URLSearchParams({ doctorId, date });
    return api.get(`/appointments/agenda?${qs.toString()}`);
  },

  // ── Statistiques du médecin ───────────────────────────────────────────────

  /**
   * GET /api/appointments/stats?doctorId=...
   * Agrégation MongoDB : total, completed, cancelled, noShow, pending, totalEarnings.
   * totalEarnings = somme des paiements au statut "paid" uniquement.
   */
  async getStats(doctorId: string): Promise<DoctorStatsResponse> {
    return api.get(
      `/appointments/stats?doctorId=${encodeURIComponent(doctorId)}`
    );
  },
};