// ============================================================
// services/appointmentService.ts
// Aligné sur le backend AppointmentService
// Prefix : /api/appointments
// ============================================================

import * as api from "@/app/frontend/lib/apiClient";
import type { ApiResponse } from "@/app/frontend/types";
import type {
  Appointment,
  PaginatedAppointments,
  AppointmentFiltersDTO,
  CreateAppointmentDTO,
  UpdateConsultationDTO,
  UpdatePaymentDTO,
  DoctorStatsResponse,
  CancelledBy,
} from "../types/Appointment";

// ─── Service ──────────────────────────────────────────────────────────────────

export const appointmentService = {

  async create(dto: CreateAppointmentDTO): Promise<Appointment> {
    const res = await api.post<ApiResponse<Appointment>>("/appointments", dto);
    return res.data;
  },

  async getById(id: string): Promise<Appointment> {
    const res = await api.get<ApiResponse<Appointment>>(`/appointments/${id}`);
    console.log(`📝 [getById] ${id}:`, res.data);
    return res.data;
  },

  //  FIX — Le backend retourne { success: true, ...result }
  // où result = { appointments, total, page, pages }
  // Il n'y a PAS de champ `data` → la route fait `{ success: true, ...result }`
  // Donc res.data n'existe pas : on lit res directement
  async list(filters?: AppointmentFiltersDTO): Promise<PaginatedAppointments> {
    const qs = new URLSearchParams();
    if (filters?.page)      qs.append("page",      String(filters.page));
    if (filters?.limit)     qs.append("limit",     String(filters.limit));
    if (filters?.status)    qs.append("status",    filters.status);
    if (filters?.patientId) qs.append("patientId", filters.patientId);
    if (filters?.doctorId)  qs.append("doctorId",  filters.doctorId);
    if (filters?.from)      qs.append("from",      filters.from);
    if (filters?.to)        qs.append("to",        filters.to);

    const query = qs.toString();
    const res = await api.get<PaginatedAppointments & { success: boolean }>(
      `/appointments${query ? `?${query}` : ""}`
    );

    // Défense contre undefined au cas où l'API échoue silencieusement
    return {
      appointments: res.appointments ?? [],
      total:        res.total        ?? 0,
      page:         res.page         ?? 1,
      pages:        res.pages        ?? 0,
    };
  },

  async confirm(id: string): Promise<Appointment> {
    const res = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/confirm`, {}
    );
    return res.data;
  },

  async start(id: string): Promise<Appointment> {
    const res = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/start`, {}
    );
    return res.data;
  },

  async end(id: string, dto: UpdateConsultationDTO): Promise<Appointment> {
    const res = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/end`, dto
    );
    return res.data;
  },

  async cancel(id: string, cancelledBy: CancelledBy, reason: string): Promise<Appointment> {
    const res = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/cancel`, { cancelledBy, reason }
    );
    return res.data;
  },

  async markNoShow(id: string): Promise<Appointment> {
    const res = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/no-show`, {}
    );
    return res.data;
  },

  async join(id: string, role: "patient" | "doctor"): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>(
      `/appointments/${id}/join`, { role }
    );
    return res.data;
  },

  async updatePayment(id: string, dto: UpdatePaymentDTO): Promise<Appointment> {
    const res = await api.patch<ApiResponse<Appointment>>(
      `/appointments/${id}/payment`, dto
    );
    return res.data;
  },

  //  FIX — manquait .data
  async getAgenda(doctorId: string, date: string): Promise<Appointment[]> {
    const qs = new URLSearchParams({ doctorId, date });
    const res = await api.get<ApiResponse<Appointment[]>>(
      `/appointments/agenda?${qs.toString()}`
    );
    return res.data;
  },

  //  FIX — manquait .data
  async getStats(doctorId: string): Promise<DoctorStatsResponse> {
    const res = await api.get<ApiResponse<DoctorStatsResponse>>(
      `/appointments/stats?doctorId=${encodeURIComponent(doctorId)}`
    );
    return res.data;
  },
};