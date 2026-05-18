// ============================================================
// store/appointmentStore.ts
// Aligné sur appointmentService.ts + appointment.types.ts
// ============================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { appointmentService } from "../services/consultationService";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentFiltersDTO,
  CreateAppointmentDTO,
  UpdateConsultationDTO,
  UpdatePaymentDTO,
  PaginatedAppointments,
  DoctorStatsResponse,
  CancelledBy,
} from "../types/Appointment";

// ─── State ────────────────────────────────────────────────────────────────────

interface AppointmentState {
  // ── Données ──────────────────────────────────────────────────────────────
  appointments: Appointment[];
  currentAppointment: Appointment | null;
  agenda: Appointment[];
  stats: DoctorStatsResponse | null;

  // ── UI ────────────────────────────────────────────────────────────────────
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    pages: number;
  };

  // ── Actions : lecture ─────────────────────────────────────────────────────

  /** GET /api/appointments?... — liste paginée avec filtres */
  fetchList: (filters?: AppointmentFiltersDTO) => Promise<void>;

  /** GET /api/appointments/[id] */
  fetchById: (id: string) => Promise<void>;

  /** GET /api/appointments/agenda?doctorId=...&date=... */
  fetchAgenda: (doctorId: string, date: string) => Promise<void>;

  /** GET /api/appointments/stats?doctorId=... */
  fetchStats: (doctorId: string) => Promise<void>;

  // ── Actions : mutations ───────────────────────────────────────────────────

  /** POST /api/appointments */
  create: (dto: CreateAppointmentDTO) => Promise<Appointment>;

  /**
   * PATCH /api/appointments/[id]/cancel
   * ⚠️  cancelledBy requis — le backend vérifie l'autorisation via ce champ.
   */
  cancel: (id: string, cancelledBy: CancelledBy, reason: string) => Promise<void>;

  /** PATCH /api/appointments/[id]/confirm — médecin uniquement */
  confirm: (id: string) => Promise<void>;

  /** PATCH /api/appointments/[id]/start — médecin uniquement */
  start: (id: string) => Promise<void>;

  /**
   * PATCH /api/appointments/[id]/end — médecin uniquement
   * ongoing → completed. Calcule actualDuration côté backend.
   */
  end: (id: string, dto: UpdateConsultationDTO) => Promise<void>;

  /** PATCH /api/appointments/[id]/no-show — médecin uniquement */
  markNoShow: (id: string) => Promise<void>;

  /**
   * POST /api/appointments/[id]/join
   * Enregistre patientJoinedAt ou doctorJoinedAt.
   * ⚠️  Aucune URL de salle retournée — la gestion vidéo est externe.
   */
  join: (id: string, role: "patient" | "doctor") => Promise<void>;

  /** PATCH /api/appointments/[id]/payment */
  updatePayment: (id: string, dto: UpdatePaymentDTO) => Promise<void>;

  // ── Getters côté client (sans appel API) ─────────────────────────────────

  getByStatus: (status: AppointmentStatus) => Appointment[];

  // ── Utils ─────────────────────────────────────────────────────────────────

  clearCurrent: () => void;
  clearError: () => void;
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

/** Remplace un rendez-vous dans la liste par sa version mise à jour */
const replaceInList = (
  list: Appointment[],
  updated: Appointment
): Appointment[] =>
  list.map((a) => (a._id === updated._id ? updated : a));

/** Met à jour currentAppointment si c'est le même _id */
const maybeUpdateCurrent = (
  current: Appointment | null,
  updated: Appointment
): Appointment | null =>
  current?._id === updated._id ? updated : current;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppointmentStore = create<AppointmentState>()(
  devtools(
    (set, get) => ({
      // ── État initial ────────────────────────────────────────────────────────
      appointments: [],
      currentAppointment: null,
      agenda: [],
      stats: null,
      isLoading: false,
      error: null,
      pagination: { total: 0, page: 1, pages: 0 },

      // ── Lecture ─────────────────────────────────────────────────────────────

      fetchList: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const res: PaginatedAppointments =
            await appointmentService.list(filters);
          set({
            appointments: res.appointments,
            pagination: { total: res.total, page: res.page, pages: res.pages },
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur de chargement",
            isLoading: false,
          });
        }
      },

      fetchById: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const appointment = await appointmentService.getById(id);
          set({ currentAppointment: appointment, isLoading: false });
        } catch (err) {
          set({
            error:
              err instanceof Error ? err.message : "Rendez-vous introuvable",
            isLoading: false,
          });
        }
      },

      fetchAgenda: async (doctorId, date) => {
        set({ isLoading: true, error: null });
        try {
          const agenda = await appointmentService.getAgenda(doctorId, date);
          set({ agenda, isLoading: false });
        } catch (err) {
          set({
            error:
              err instanceof Error ? err.message : "Erreur de chargement de l'agenda",
            isLoading: false,
          });
        }
      },

      fetchStats: async (doctorId) => {
        set({ isLoading: true, error: null });
        try {
          const stats = await appointmentService.getStats(doctorId);
          set({ stats, isLoading: false });
        } catch (err) {
          set({
            error:
              err instanceof Error ? err.message : "Erreur de chargement des statistiques",
            isLoading: false,
          });
        }
      },

      // ── Mutations ───────────────────────────────────────────────────────────

      create: async (dto) => {
        set({ isLoading: true, error: null });
        try {
          const created = await appointmentService.create(dto);
          set((state) => ({
            appointments: [created, ...state.appointments],
            isLoading: false,
          }));
          return created;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Erreur de création";
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      cancel: async (id, cancelledBy, reason) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await appointmentService.cancel(id, cancelledBy, reason);
          set((state) => ({
            appointments: replaceInList(state.appointments, updated),
            currentAppointment: maybeUpdateCurrent(
              state.currentAppointment,
              updated
            ),
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur d'annulation",
            isLoading: false,
          });
          throw err;
        }
      },

      confirm: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await appointmentService.confirm(id);
          set((state) => ({
            appointments: replaceInList(state.appointments, updated),
            currentAppointment: maybeUpdateCurrent(
              state.currentAppointment,
              updated
            ),
            isLoading: false,
          }));
        } catch (err) {
          set({
            error:
              err instanceof Error ? err.message : "Erreur de confirmation",
            isLoading: false,
          });
          throw err;
        }
      },

      start: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await appointmentService.start(id);
          set((state) => ({
            appointments: replaceInList(state.appointments, updated),
            currentAppointment: maybeUpdateCurrent(
              state.currentAppointment,
              updated
            ),
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur au démarrage",
            isLoading: false,
          });
          throw err;
        }
      },

      end: async (id, dto) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await appointmentService.end(id, dto);
          set((state) => ({
            appointments: replaceInList(state.appointments, updated),
            currentAppointment: maybeUpdateCurrent(
              state.currentAppointment,
              updated
            ),
            isLoading: false,
          }));
        } catch (err) {
          set({
            error:
              err instanceof Error ? err.message : "Erreur lors de la clôture",
            isLoading: false,
          });
          throw err;
        }
      },

      markNoShow: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await appointmentService.markNoShow(id);
          set((state) => ({
            appointments: replaceInList(state.appointments, updated),
            currentAppointment: maybeUpdateCurrent(
              state.currentAppointment,
              updated
            ),
            isLoading: false,
          }));
        } catch (err) {
          set({
            error:
              err instanceof Error ? err.message : "Erreur lors du marquage absent",
            isLoading: false,
          });
          throw err;
        }
      },

      join: async (id, role) => {
        // Pas de isLoading — appel silencieux en arrière-plan
        try {
          await appointmentService.join(id, role);
        } catch (err) {
          // Non bloquant : on log mais on ne coupe pas l'expérience utilisateur
          console.warn("[AppointmentStore] join échoué :", err);
        }
      },

      updatePayment: async (id, dto) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await appointmentService.updatePayment(id, dto);
          set((state) => ({
            appointments: replaceInList(state.appointments, updated),
            currentAppointment: maybeUpdateCurrent(
              state.currentAppointment,
              updated
            ),
            isLoading: false,
          }));
        } catch (err) {
          set({
            error:
              err instanceof Error
                ? err.message
                : "Erreur de mise à jour du paiement",
            isLoading: false,
          });
          throw err;
        }
      },

      // ── Getters côté client ─────────────────────────────────────────────────

      getByStatus: (status) =>
        get().appointments.filter((a) => a.status.current === status),

      // ── Utils ───────────────────────────────────────────────────────────────

      clearCurrent: () => set({ currentAppointment: null }),
      clearError: () => set({ error: null }),
    }),
    { name: "AppointmentStore" }
  )
);