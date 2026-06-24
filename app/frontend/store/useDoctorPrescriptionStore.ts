// ============================================================
// store/useDoctorPrescriptionStore.ts — Création d'ordonnances
// ============================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { prescriptionService } from "@/app/frontend/services/prescriptionService";
import type { CreatePrescriptionPayload, Prescription } from "@/app/frontend/services/prescriptionService";

interface DoctorPrescriptionState {
  isSaving: boolean;
  error:    string | null;

  createPrescription: (payload: CreatePrescriptionPayload) => Promise<Prescription>;
  clearError:         () => void;
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Une erreur inattendue s'est produite.";
}

export const useDoctorPrescriptionStore = create<DoctorPrescriptionState>()(
  devtools(
    (set) => ({
      isSaving: false,
      error:    null,

      createPrescription: async (payload) => {
        set({ isSaving: true, error: null });
        try {
          const result = await prescriptionService.create(payload);
          return result;
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    { name: "DoctorPrescriptionStore" }
  )
);