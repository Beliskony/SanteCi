// ============================================================
// store/useHospitalStore.ts — État global Hôpitaux & Cliniques
// ============================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { hospitalService } from "@/app/frontend/services/hopitalService";
import type {
  IHospitalClinic,
  HospitalFilters,
  HospitalSearchResponse,
} from "@/app/frontend/types/Etablisement";

interface HospitalState {
  // ── Données ──────────────────────────────────────────────
  facilities: IHospitalClinic[];
  currentFacility: IHospitalClinic | null;
  isLoading: boolean;
  error: string | null;
  pagination: { total: number; page: number; pages: number };
  activeFilters: HospitalFilters;

  // ── Lecture ───────────────────────────────────────────────
  search: (filters?: HospitalFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  fetchByFacilityId: (facilityId: string) => Promise<void>;

  // ── Staff (admin) ─────────────────────────────────────────
  addDoctor: (facilityId: string, doctorId: string) => Promise<void>;
  removeDoctor: (facilityId: string, doctorId: string) => Promise<void>;

  // ── Rating (patient) ──────────────────────────────────────
  submitReview: (id: string, data: { rating: number; comment?: string }) => Promise<void>;

  // ── Filtres ───────────────────────────────────────────────
  setFilters: (filters: HospitalFilters) => void;
  resetFilters: () => void;

  // ── Utilitaires ───────────────────────────────────────────
  clearCurrent: () => void;
  clearError: () => void;
}

const DEFAULT_FILTERS: HospitalFilters = { page: 1, limit: 10 };

export const useHospitalStore = create<HospitalState>()(
  devtools(
    (set, get) => ({
      facilities: [],
      currentFacility: null,
      isLoading: false,
      error: null,
      pagination: { total: 0, page: 1, pages: 0 },
      activeFilters: DEFAULT_FILTERS,

      // ── search — reset la liste ───────────────────────────
      search: async (filters) => {
        const merged = { ...DEFAULT_FILTERS, ...filters, page: 1 };
        set({ isLoading: true, error: null, activeFilters: merged });
        try {
          const res: HospitalSearchResponse = await hospitalService.search(merged);
          set({
            facilities: res.facilities,
            pagination: { total: res.total, page: res.page, pages: res.pages },
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur de recherche",
            isLoading: false,
          });
        }
      },

      // ── loadMore — append page suivante ──────────────────
      loadMore: async () => {
        const { pagination, activeFilters, facilities } = get();
        if (pagination.page >= pagination.pages) return;

        set({ isLoading: true, error: null });
        try {
          const res: HospitalSearchResponse = await hospitalService.search({
            ...activeFilters,
            page: pagination.page + 1,
          });
          set({
            facilities: [...facilities, ...res.facilities],
            pagination: { total: res.total, page: res.page, pages: res.pages },
            activeFilters: { ...activeFilters, page: pagination.page + 1 },
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur de chargement",
            isLoading: false,
          });
        }
      },

      // ── fetchById ────────────────────────────────────────
      fetchById: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const facility = await hospitalService.getById(id);
          set({ currentFacility: facility, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Établissement introuvable",
            isLoading: false,
          });
        }
      },

      // ── fetchByFacilityId ────────────────────────────────
      fetchByFacilityId: async (facilityId) => {
        set({ isLoading: true, error: null });
        try {
          const facility = await hospitalService.getByFacilityId(facilityId);
          set({ currentFacility: facility, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Établissement introuvable",
            isLoading: false,
          });
        }
      },

      // ── addDoctor ────────────────────────────────────────
      addDoctor: async (facilityId, doctorId) => {
        set({ isLoading: true, error: null });
        try {
          await hospitalService.addDoctor(facilityId, doctorId);
          // Rafraîchir le détail si c'est l'établissement courant
          const { currentFacility } = get();
          if (currentFacility?.facilityId === facilityId) {
            await get().fetchByFacilityId(facilityId);
          }
          set({ isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur lors de l'ajout du médecin",
            isLoading: false,
          });
        }
      },

      // ── removeDoctor ─────────────────────────────────────
      removeDoctor: async (facilityId, doctorId) => {
        set({ isLoading: true, error: null });
        try {
          await hospitalService.removeDoctor(facilityId, doctorId);
          const { currentFacility } = get();
          if (currentFacility?.facilityId === facilityId) {
            await get().fetchByFacilityId(facilityId);
          }
          set({ isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur lors du retrait du médecin",
            isLoading: false,
          });
        }
      },

      // ── submitReview ─────────────────────────────────────
      submitReview: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          await hospitalService.submitReview(id, data);
          // Rafraîchir le détail pour mettre à jour le rating affiché
          await get().fetchById(id);
          set({ isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Erreur lors de la soumission de l'avis",
            isLoading: false,
          });
        }
      },

      // ── setFilters ───────────────────────────────────────
      setFilters: (filters) =>
        set((state) => ({ activeFilters: { ...state.activeFilters, ...filters } })),

      resetFilters: () => set({ activeFilters: DEFAULT_FILTERS }),

      // ── Utilitaires ──────────────────────────────────────
      clearCurrent: () => set({ currentFacility: null }),
      clearError: () => set({ error: null }),
    }),
    { name: "HospitalStore" }
  )
);