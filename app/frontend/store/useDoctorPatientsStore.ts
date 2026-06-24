// ============================================================
// store/useDoctorPatientsStore.ts — Annuaire patient du médecin
// ============================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { doctorService } from "@/app/frontend/services/doctorService";

export interface DoctorPatientListItem {
  _id: string;
  profile: { firstName: string; lastName: string; photo?: string; dateOfBirth: string; bloodGroup?: string };
  mainCondition: string;
  followUpStatus: "priority" | "followed" | "recent" | null;
  nextAppointment: { date: string; label: string } | null;
  patientSince: string;
  totalConsultations: number;
  keyInfo?: string[];
  lastConsultation?: {
    title: string;
    notes: string;
  } | null
}

interface DoctorPatientsState {
  patients:   DoctorPatientListItem[];
  total:      number;
  page:       number;
  pages:      number;
  isLoading:  boolean;
  error:      string | null;

  fetchPatients: (filters?: { query?: string; page?: number; limit?: number }) => Promise<void>;
  clearError:    () => void;
}

export interface DoctorPerformance {
  revenueMonth: number;
  revenueDelta: number;
  totalConsultations: number;
  cancellationRate: number;
  patientSatisfaction: number;
  satisfactionCount: number;
  monthlyEvolution: Array<{ label: string; revenue: number; consultations: number }>;
  breakdown: { video: number; inPerson: number; chat: number; audio: number };
}

interface DoctorPerformanceState {
  performance: DoctorPerformance | null;
  isLoading:   boolean;
  error:       string | null;

  fetchPerformance: () => Promise<void>;
  clearError:       () => void;
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Une erreur inattendue s'est produite.";
}

export const useDoctorPatientsStore = create<DoctorPatientsState>()(
  devtools(
    (set) => ({
      patients:  [],
      total:     0,
      page:      1,
      pages:     0,
      isLoading: false,
      error:     null,

      fetchPatients: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const res = await doctorService.getMyPatients(filters);
          set({
            patients: res.patients,
            total:    res.total,
            page:     res.page,
            pages:    res.pages,
          });
        } catch (err) {
          set({ error: toMessage(err) });
        } finally {
          set({ isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    { name: "DoctorPatientsStore" }
  )
);

export const useDoctorPerformanceStore = create<DoctorPerformanceState>()(
  devtools(
    (set) => ({
      performance: null,
      isLoading:   false,
      error:       null,

      fetchPerformance: async () => {
        set({ isLoading: true, error: null });
        try {
          const performance = await doctorService.getPerformance();
          set({ performance });
        } catch (err) {
          set({ error: toMessage(err) });
        } finally {
          set({ isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    { name: "DoctorPerformanceStore" }
  )
);