// ============================================================
// store/useDoctorDashStore.ts — État du dashboard médecin
// ============================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { doctorService } from "@/app/frontend/services/doctorService";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";
import type { DoctorUser, DoctorProfile, DoctorTelemedicine } from "@/app/frontend/store/useAuthStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DoctorStats {
  consultationsToday: number;
  consultationsDelta: number;   // +/- par rapport à hier
  revenueMonth: number;         // en FCFA
  revenueDelta: number;         // % vs mois précédent
  newPatients: number;          // 7 derniers jours
}

// ─── State ────────────────────────────────────────────────────────────────────

interface DoctorDashState {
  // ── UI ────────────────────────────────────────────────────
  isLoading:  boolean;
  isSaving:   boolean;
  error:      string | null;

  // ── Données dashboard ─────────────────────────────────────
  stats:      DoctorStats | null;

  // ── Actions profil ────────────────────────────────────────
  fetchMyProfile:      ()                               => Promise<void>;
  updateMyProfile:     (data: Partial<DoctorProfile>)  => Promise<void>;
  uploadPhoto:         (file: File)                     => Promise<void>;
  updateTelemedicine:  (data: Partial<DoctorTelemedicine>) => Promise<void>;
  setOnlineStatus:     (isOnline: boolean)              => Promise<void>;
  addCertification:    (data: { name: string; year: number; issuer: string, document?: File  }) => Promise<void>;
  removeCertification: (certId: string)                 => Promise<void>;
  deleteAccount:       ()                               => Promise<void>;

  // ── Actions stats ─────────────────────────────────────────
  fetchStats: (doctorId: string) => Promise<void>;

  // ── Utilitaires ───────────────────────────────────────────
  clearError: () => void;
  reset:      () => void;
}

// ─── État initial ─────────────────────────────────────────────────────────────

const initialState = {
  isLoading: false,
  isSaving:  false,
  error:     null,
  stats:     null,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Une erreur inattendue s'est produite.";
}

function getDoctorId(): string {
  const user = useAuthStore.getState().user;
  if (!user || !isDoctor(user)) throw new Error("Non authentifié en tant que médecin.");
  const raw = user._id;
  return typeof raw === "string" ? raw : raw;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDoctorDashStore = create<DoctorDashState>()(
  devtools(
    (set) => ({
      ...initialState,

      // ── fetchMyProfile ────────────────────────────────────────────────────
      // Récupère le profil complet et sync useAuthStore
      fetchMyProfile: async () => {
        set({ isLoading: true, error: null });
        try {
          const doctor = await doctorService.getMyProfile();
          useAuthStore.getState().updateDoctorProfile(doctor.profile);
        } catch (err) {
          set({ error: toMessage(err) });
        } finally {
          set({ isLoading: false });
        }
      },

      // ── updateMyProfile ───────────────────────────────────────────────────
      updateMyProfile: async (data) => {
        set({ isSaving: true, error: null });
        try {
          const updated = await doctorService.updateMyProfile(data);
          // doctorService sync useAuthStore.updateDoctorProfile en interne
          useAuthStore.getState().updateDoctorProfile(updated.profile);
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── uploadPhoto ───────────────────────────────────────────────────────
      uploadPhoto: async (file) => {
        set({ isSaving: true, error: null });
        try {
          await doctorService.uploadPhoto(file);
          // doctorService sync updateDoctorProfile({ photo }) en interne
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── updateTelemedicine ────────────────────────────────────────────────
      updateTelemedicine: async (data) => {
        set({ isSaving: true, error: null });
        try {
          await doctorService.updateTelemedicine(data);
          // doctorService sync useAuthStore.updateTelemedicine en interne
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── setOnlineStatus ───────────────────────────────────────────────────
      //setOnlineStatus: async (isOnline) => {
        // Pas de isLoading — action rapide silencieuse
        //try {
          //await doctorService.setOnlineStatus(isOnline);
          // doctorService sync useAuthStore.setOnlineStatus en interne
        //} catch (err) {
          //set({ error: toMessage(err) });
        //}
      //},

    addCertification: async (data) => {
      set({ isSaving: true, error: null });
        try {
          const updated = await doctorService.addCertification(data);
          useAuthStore.getState().updateDoctorProfessional({ certifications: updated.professional.certifications });
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
    },

    removeCertification: async (certId) => {
      set({ isSaving: true, error: null });
        try {
          const updated = await doctorService.removeCertification(certId);
              useAuthStore.getState().updateDoctorProfessional({ certifications: updated.professional.certifications });
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── deleteAccount ─────────────────────────────────────────────────────
      deleteAccount: async () => {
        set({ isSaving: true, error: null });
        try {
          await doctorService.deleteAccount();
          useAuthStore.getState().logout();
          set(initialState);
        } catch (err) {
          set({ error: toMessage(err) });
          throw err;
        } finally {
          set({ isSaving: false });
        }
      },

      // ── fetchStats ────────────────────────────────────────────────────────
      // Utilise les stats appointments du backend + les enrichit
      fetchStats: async (doctorId) => {
        set({ isLoading: true, error: null });
        try {
          // appointmentService.getStats retourne total, completed, cancelled, noShow, pending, totalEarnings
          const { appointmentService } = await import("@/app/frontend/services/consultationService");
          const raw = await appointmentService.getStats(doctorId);

          // On mappe vers DoctorStats — les deltas nécessitent un endpoint dédié
          // Pour l'instant on expose ce qu'on a, à enrichir quand le backend le supporte
          set({
            stats: {
              consultationsToday: raw.consultationsToday,       // à affiner avec un filtre date côté backend
              consultationsDelta: 0,               // delta hier → à implémenter côté backend
              revenueMonth:       raw.totalEarnings,
              revenueDelta:       0,               // delta mois → à implémenter côté backend
              newPatients:        0,               // à implémenter côté backend
            },
          });
        } catch (err) {
          set({ error: toMessage(err) });
        } finally {
          set({ isLoading: false });
        }
      },

      // ── clearError ────────────────────────────────────────────────────────
      clearError: () => set({ error: null }),

      // ── reset ─────────────────────────────────────────────────────────────
      reset: () => set(initialState),
    }),
    { name: "DoctorDashStore" }
  )
);

// ─── Sélecteurs réactifs ──────────────────────────────────────────────────────
// À utiliser dans les composants — réactifs aux changements de useAuthStore

export const useDoctorProfile     = () => useAuthStore((s) => s.user && isDoctor(s.user) ? s.user.profile      : null);
export const useDoctorTelemedicine = () => useAuthStore((s) => s.user && isDoctor(s.user) ? s.user.telemedicine : null);
export const useDoctorLocation    = () => useAuthStore((s) => s.user && isDoctor(s.user) ? s.user.location     : null);
export const useDoctorStatus      = () => useAuthStore((s) => s.user && isDoctor(s.user) ? s.user.status       : null);
export const useDoctorAnalytics   = () => useAuthStore((s) => s.user && isDoctor(s.user) ? s.user.analytics    : null);
export const useDoctorIsOnline    = () => useAuthStore((s) => s.user && isDoctor(s.user) ? (s.user.status as any)?.isOnline ?? false : false);