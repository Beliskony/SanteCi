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