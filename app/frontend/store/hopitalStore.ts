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
  CreateHospitalPayload,
  UpdateHospitalPayload,
} from "@/app/frontend/types/Etablisement";

interface HospitalState {
  // ── Données ───────────────────────────────────────────────
  facilities:      IHospitalClinic[];
  currentFacility: IHospitalClinic | null;
  isLoading:       boolean;
  error:           string | null;
  pagination:      { total: number; page: number; pages: number };
  activeFilters:   HospitalFilters;

  // ── Lecture ───────────────────────────────────────────────
  search:    (filters?: HospitalFilters) => Promise<void>;
  initializeDefaultData: () => Promise<void>;
  loadMore:  () => Promise<void>;
  fetchById: (id: string) => Promise<void>;

  // ── CRUD (admin) ──────────────────────────────────────────
  create:    (payload: CreateHospitalPayload, image?: File) => Promise<void>;
  update:    (id: string, payload: UpdateHospitalPayload, image?: File) => Promise<void>;
  delete:    (id: string) => Promise<void>;
  verify:    (id: string) => Promise<void>;

  // ── Cover (admin) ─────────────────────────────────────────
  updateCoverImage: (id: string, image: File) => Promise<void>;
  deleteCoverImage: (id: string) => Promise<void>;

  // ── Staff (admin) ─────────────────────────────────────────
  addDoctor:    (facilityId: string, doctorId: string) => Promise<void>;
  removeDoctor: (facilityId: string, doctorId: string) => Promise<void>;

  // ── Rating (patient) ──────────────────────────────────────
  submitReview: (id: string, data: { rating: number; comment?: string }) => Promise<void>;

  // ── Filtres ───────────────────────────────────────────────
  setFilters:   (filters: HospitalFilters) => void;
  resetFilters: () => void;

  // ── Utilitaires ───────────────────────────────────────────
  clearCurrent: () => void;
  clearError:   () => void;
}

const DEFAULT_FILTERS: HospitalFilters = { page: 1, limit: 10 };

export const useHospitalStore = create<HospitalState>()(
  devtools(
    (set, get) => ({
      facilities:      [],
      currentFacility: null,
      isLoading:       false,
      error:           null,
      pagination:      { total: 0, page: 1, pages: 0 },
      activeFilters:   DEFAULT_FILTERS,

      // ── search — reset la liste ───────────────────────────
      search: async (filters) => {
        const merged = { ...DEFAULT_FILTERS, ...filters, page: 1 };
        set({ isLoading: true, error: null, activeFilters: merged });
        try {
          const res: HospitalSearchResponse = await hospitalService.search(merged);
          set({
            facilities: res.facilities,
            pagination: { total: res.total, page: res.page, pages: res.pages },
            isLoading:  false,
          });
        } catch (err) {
          set({
            error:     err instanceof Error ? err.message : "Erreur de recherche",
            isLoading: false,
          });
        }
      },

      
      // ── initializeDefaultData — charge Abidjan par défaut ──────
      initializeDefaultData: async () => {
        const { facilities, isLoading, search } = get();
  
      // Ne charger que si aucune donnée n'est présente
        if (facilities.length > 0 || isLoading) return;{
          await search({
            city: "Abidjan",
            limit: 12,
          });
        }
      },
      

      // ── loadMore — append page suivante ───────────────────
      loadMore: async () => {
        const { pagination, activeFilters, facilities, isLoading } = get();
        if (pagination.page >= pagination.pages) return;

        set({ isLoading: true, error: null });
        try {
          const res: HospitalSearchResponse = await hospitalService.search({
            ...activeFilters,
            page: pagination.page + 1,
          });
          set({
            facilities:    [...facilities, ...res.facilities],
            pagination:    { total: res.total, page: res.page, pages: res.pages },
            activeFilters: { ...activeFilters, page: pagination.page + 1 },
            isLoading:     false,
          });
        } catch (err) {
          set({
            error:     err instanceof Error ? err.message : "Erreur de chargement",
            isLoading: false,
          });
        }
      },

      // ── fetchById ─────────────────────────────────────────
      fetchById: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const facility = await hospitalService.getById(id);
          set({ currentFacility: facility, isLoading: false });
        } catch (err) {
          set({
            error:     err instanceof Error ? err.message : "Établissement introuvable",
            isLoading: false,
          });
        }
      },

      // ── create ────────────────────────────────────────────
      create: async (payload, image) => {
        set({ isLoading: true, error: null });
        try {
          const facility = await hospitalService.create(payload, image);
          set((state) => ({
            facilities: [facility, ...state.facilities],
            isLoading:  false,
          }));
        } catch (err) {
          set({
            error:     err instanceof Error ? err.message : "Erreur lors de la création",
            isLoading: false,
          });
        }
      },

      // ── update ────────────────────────────────────────────
      update: async (id, payload, image) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await hospitalService.update(id, payload, image);
          set((state) => ({
            facilities:      state.facilities.map((f) => f._id.toString() === id ? updated : f),
            currentFacility: state.currentFacility?._id.toString() === id ? updated : state.currentFacility,
            isLoading:       false,
          }));
        } catch (err) {
          set({
            error:     err instanceof Error ? err.message : "Erreur lors de la mise à jour",
            isLoading: false,
          });
        }
      },

      // ── delete ────────────────────────────────────────────
      delete: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await hospitalService.delete(id);
          set((state) => ({
            facilities:      state.facilities.filter((f) => f._id.toString() !== id),
            currentFacility: state.currentFacility?._id.toString() === id ? null : state.currentFacility,
            isLoading:       false,
          }));
        } catch (err) {
          set({
            error:     err instanceof Error ? err.message : "Erreur lors de la suppression",
            isLoading: false,
          });
        }
      },

      // ── verify ────────────────────────────────────────────
      verify: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await hospitalService.verify(id);
          // Rafraîchir pour refléter metadata.verified
          await get().fetchById(id);
        } catch (err) {
          set({
            error:     err instanceof Error ? err.message : "Erreur lors de la vérification",
            isLoading: false,
          });
        }
      },

      // ── updateCoverImage ──────────────────────────────────
      updateCoverImage: async (id, image) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await hospitalService.updateCoverImage(id, image);
          set((state) => ({
            facilities:      state.facilities.map((f) => f._id.toString() === id ? updated : f),
            currentFacility: state.currentFacility?._id.toString() === id ? updated : state.currentFacility,
            isLoading:       false,
          }));
        } catch (err) {
          set({
            error:     err instanceof Error ? err.message : "Erreur lors du changement d'image",
            isLoading: false,
          });
        }
      },

      // ── deleteCoverImage ──────────────────────────────────
      deleteCoverImage: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await hospitalService.deleteCoverImage(id);
          // Rafraîchir pour refléter la suppression
          await get().fetchById(id);
        } catch (err) {
          set({
            error:     err instanceof Error ? err.message : "Erreur lors de la suppression de l'image",
            isLoading: false,
          });
        }
      },

      // ── addDoctor ─────────────────────────────────────────
      addDoctor: async (facilityId, doctorId) => {
        set({ isLoading: true, error: null });
        try {
          await hospitalService.addDoctor(facilityId, doctorId);
          const { currentFacility } = get();
          if (currentFacility?._id.toString() === facilityId) {
            await get().fetchById(facilityId); // fetchById gère isLoading: false
          } else {
            // Si on n'a pas rafraîchi via fetchById, on remet isLoading manuellement
            set({ isLoading: false });
          }
        } catch (err) {
          set({
            error:     err instanceof Error ? err.message : "Erreur lors de l'ajout du médecin",
            isLoading: false,
          });
        }
      },

      // ── removeDoctor ──────────────────────────────────────
      removeDoctor: async (facilityId, doctorId) => {
        set({ isLoading: true, error: null });
        try {
          await hospitalService.removeDoctor(facilityId, doctorId);
          const { currentFacility } = get();
          if (currentFacility?._id.toString() === facilityId) {
            await get().fetchById(facilityId); // fetchById gère isLoading: false
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          set({
            error:     err instanceof Error ? err.message : "Erreur lors du retrait du médecin",
            isLoading: false,
          });
        }
      },

      // ── submitReview ──────────────────────────────────────
      submitReview: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          await hospitalService.submitReview(id, data);
          await get().fetchById(id);
        } catch (err) {
          set({
            error:     err instanceof Error ? err.message : "Erreur lors de la soumission de l'avis",
            isLoading: false,
          });
        }
      },

      // ── setFilters ────────────────────────────────────────
      setFilters: (filters) =>
        set((state) => ({ activeFilters: { ...state.activeFilters, ...filters } })),

      resetFilters: () => set({ activeFilters: DEFAULT_FILTERS }),

      // ── Utilitaires ───────────────────────────────────────
      clearCurrent: () => set({ currentFacility: null }),
      clearError:   () => set({ error: null }),
    }),
    { name: "HospitalStore" }
  )
);