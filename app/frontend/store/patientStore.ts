// store/usePatientStore.ts — État UI du patient connecté
// Source de vérité des données : useAuthStore
// Ce store gère : loading, errors, prescriptions, stats

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { patientService } from "@/app/frontend/services/patientService";
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore";
import type {
  PatientUser,
  PatientHealth,
  PatientPreferences,
  PatientProfile,
  BaseLocation,
} from "@/app/frontend/store/useAuthStore";
import type {
  Prescription,
  PaginatedResponse,
} from "@/app/frontend/types";
import type {
  EmergencyContactDTO,
  PatientStats,
} from "@/app/frontend/services/patientService";


// ─── État ──────────────────────────────────────────────────────────────────────

interface PatientState {
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  prescriptions: Prescription[];
  prescriptionsMeta: {
    total: number;
    page: number;
    totalPages: number;
  } | null;

  stats: PatientStats | null;

  // ── Profil ────────────────────────────────────────────────────────────────
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<PatientProfile>) => Promise<void>;
  uploadPhoto: (file: File) => Promise<void>;

  // ── Santé ─────────────────────────────────────────────────────────────────
  updateHealth: (data: Partial<PatientHealth>) => Promise<void>;
  fetchHealth: () => Promise<void>;

  // ── Localisation ──────────────────────────────────────────────────────────
  updateLocation: (data: Partial<BaseLocation>) => Promise<void>;

  // ── Préférences ───────────────────────────────────────────────────────────
  updatePreferences: (data: Partial<PatientPreferences>) => Promise<void>;

  // ── Contacts d'urgence ────────────────────────────────────────────────────
  addEmergencyContact: (dto: EmergencyContactDTO) => Promise<void>;
  removeEmergencyContact: (contactId: string) => Promise<void>;

  // ── Stats ─────────────────────────────────────────────────────────────────
  fetchStats: () => Promise<void>;

  // ── Ordonnances ───────────────────────────────────────────────────────────
  fetchPrescriptions: (patientId: string, page?: number, limit?: number) => Promise<void>;

  // ── Compte ────────────────────────────────────────────────────────────────
  deleteAccount: () => Promise<void>;

  // ── Utilitaires ───────────────────────────────────────────────────────────
  clearError: () => void;
  reset: () => void;
}

// ─── État initial ──────────────────────────────────────────────────────────────

const initialState = {
  isLoading: false,
  isSaving: false,
  error: null,
  prescriptions: [],
  prescriptionsMeta: null,
  stats: null,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getPatient(): PatientUser | null {
  const { user } = useAuthStore.getState();
  return user && isPatient(user) ? user : null;
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Une erreur inattendue s'est produite.";
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const usePatientStore = create<PatientState>()(
  devtools(
    (set, get) => ({
      ...initialState,


      // Appelle patientService.getProfile() puis sync useAuthStore
      fetchProfile: async () => {
        set({ isLoading: true, error: null });
        try {
          const patient = await patientService.getProfile();
          if (patient) {
            useAuthStore.getState().updatePatientProfile(patient.profile);
          }
        } catch (err) {
          set({ error: toMessage(err) });
        } finally {
          set({ isLoading: false });
        }
      },

      // ── updateProfile ───────────────────────────────────────────────────────
      updateProfile: async (data) => {
        set({ isSaving: true, error: null });
        try {
          await patientService.updateProfile(data);
          // patientService appelle déjà updatePatientProfile en interne
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── uploadPhoto ─────────────────────────────────────────────────────────
      uploadPhoto: async (file) => {
        set({ isSaving: true, error: null });
        try {
          await patientService.uploadPhoto(file);
          // patientService appelle déjà updateProfilePhoto en interne
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── fetchHealth ───────────────────────────────────────────────────────
      fetchHealth: async () => {
        set({ isLoading: true, error: null });
          try {
            await patientService.getHealth();
            // getHealth sync useAuthStore.updateHealth en interne
          } catch (err) {
            set({ error: toMessage(err) });
          } finally {
            set({ isLoading: false });
          }
      },

      // ── updateHealth ────────────────────────────────────────────────────────
      updateHealth: async (data) => {
        set({ isSaving: true, error: null });
        try {
          await patientService.updateHealth(data);
          // patientService sync avec res.data.health (bmi inclus)
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── updateLocation ──────────────────────────────────────────────────────
      updateLocation: async (data) => {
        set({ isSaving: true, error: null });
        try {
          await patientService.updateLocation(data);
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── updatePreferences ───────────────────────────────────────────────────
      updatePreferences: async (data) => {
        set({ isSaving: true, error: null });
        try {
          await patientService.updatePreferences(data);
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── addEmergencyContact ─────────────────────────────────────────────────
      addEmergencyContact: async (dto) => {
        const patient = getPatient();
        if (!patient) throw new Error("Non authentifié.");
        if (patient?.contact?.emergencyContacts.length >= 3) {
          throw new Error("Maximum 3 contacts d'urgence autorisés.");
        }
        set({ isSaving: true, error: null });
        try {
          await patientService.addEmergencyContact(dto);
          // patientService sync useAuthStore avec le patient retourné
        } catch (err) {
          set({ error: toMessage(err) });
          console.log(err)
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── removeEmergencyContact ──────────────────────────────────────────────
      removeEmergencyContact: async (contactId) => {
        set({ isSaving: true, error: null });
        try {
          await patientService.removeEmergencyContact(contactId);
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── fetchStats ──────────────────────────────────────────────────────────
      fetchStats: async () => {
        set({ isLoading: true, error: null });
        try {
          const stats = await patientService.getStats();
          set({ stats });
        } catch (err) {
          set({ error: toMessage(err) });
        } finally {
          set({ isLoading: false });
        }
      },

      // ── fetchPrescriptions ──────────────────────────────────────────────────
      // page > 1  append (infinite scroll), page === 1 → reset
      fetchPrescriptions: async ( patientId: string, page = 1, limit = 10) => {
        set({ isLoading: true, error: null });
        try {
          const res: PaginatedResponse<Prescription> =
            await patientService.getMyPrescriptions(patientId, { page, limit });
          set({
            prescriptions:
              page === 1 ? res.data : [...get().prescriptions, ...res.data],
            prescriptionsMeta: {
              total: res.total,
              page: res.page,
              totalPages: res.totalPages,
            },
          });
        } catch (err) {
          set({ error: toMessage(err) });
        } finally {
          set({ isLoading: false });
        }
      },

      // ── deleteAccount ───────────────────────────────────────────────────────
      // logout appelé dans patientService après le soft delete
      deleteAccount: async () => {
        set({ isSaving: true, error: null });
        try {
          await patientService.deleteAccount();
          set(initialState);
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── clearError ──────────────────────────────────────────────────────────
      clearError: () => set({ error: null }),

      // ── reset ───────────────────────────────────────────────────────────────
      // À appeler au logout depuis un listener ou un hook dédié
      reset: () => set(initialState),
    }),
    { name: "PatientStore" }
  )
);

// ─── Sélecteurs ────────────────────────────────────────────────────────────────
// Lire les données patient depuis useAuthStore (source de vérité unique)

export const selectPatientProfile    = () => getPatient()?.profile    ?? null;
export const selectPatientHealth     = () => getPatient()?.health     ?? null;
export const selectPatientPreferences= () => getPatient()?.preferences?? null;
export const selectPatientLocation   = () => getPatient()?.location   ?? null;
export const selectPatientStatus     = () => getPatient()?.status     ?? null;
export const selectPatientMetadata   = () => getPatient()?.metadata   ?? null;
export const selectEmergencyContacts = () =>
  getPatient()?.contact?.emergencyContacts ?? [];

// Lire l'état UI depuis usePatientStore
export const selectIsSaving     = (s: PatientState) => s.isSaving;
export const selectIsLoading    = (s: PatientState) => s.isLoading;
export const selectPatientError = (s: PatientState) => s.error;
export const selectStats        = (s: PatientState) => s.stats;
export const selectPrescriptions= (s: PatientState) => s.prescriptions;
export const selectPrescriptionsMeta = (s: PatientState) => s.prescriptionsMeta;