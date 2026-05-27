// app/frontend/store/paymentStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { paymentService } from '../services/paymentService';
import type {
  PaymentResult,
  PaymentStatusResult,
  InitiatePaymentDTO,
  SimulateOutcome,
} from '../services/paymentService';

// ─── State ────────────────────────────────────────────────────────────────────

interface PaymentState {
  // ── Données ──────────────────────────────────────────────────────────────
  currentPayment:  PaymentResult | null;
  paymentStatus:   PaymentStatusResult | null;

  // ── UI ────────────────────────────────────────────────────────────────────
  isLoading: boolean;
  error:     string | null;

  // ── Actions ───────────────────────────────────────────────────────────────

  /** POST /api/payments — initier un paiement */
  initiate: (dto: InitiatePaymentDTO) => Promise<PaymentResult>;

  /**
   * POST /api/payments/simulate
   * En dev uniquement — simule succès ou échec Wave
   */
  simulate: (id: string, outcome: SimulateOutcome) => Promise<PaymentResult>;

  /** GET /api/payments/[id] — statut */
  fetchStatus: (id: string) => Promise<void>;

  /** POST /api/payments/[id]/refund */
  refund: (id: string, reason?: string) => Promise<PaymentResult>;

  // ── Utils ─────────────────────────────────────────────────────────────────
  clearPayment: () => void;
  clearError:   () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePaymentStore = create<PaymentState>()(
  devtools(
    (set) => ({
      // ── État initial ──────────────────────────────────────────────────────
      currentPayment: null,
      paymentStatus:  null,
      isLoading:      false,
      error:          null,

      // ── Initier ───────────────────────────────────────────────────────────
      initiate: async (dto) => {
        set({ isLoading: true, error: null });
        try {
          const result = await paymentService.initiate(dto);
          set({ currentPayment: result, isLoading: false });
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur de paiement';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      // ── Simuler ───────────────────────────────────────────────────────────
      simulate: async (id, outcome) => {
        set({ isLoading: true, error: null });
        try {
          const result = await paymentService.simulate(id, outcome);
          set({ currentPayment: result, isLoading: false });
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur de simulation';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      // ── Statut ────────────────────────────────────────────────────────────
      fetchStatus: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const status = await paymentService.getStatus(id);
          set({ paymentStatus: status, isLoading: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur de chargement';
          set({ error: message, isLoading: false });
        }
      },

      // ── Rembourser ────────────────────────────────────────────────────────
      refund: async (id, reason) => {
        set({ isLoading: true, error: null });
        try {
          const result = await paymentService.refund(id, reason);
          set({ currentPayment: result, isLoading: false });
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur de remboursement';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      // ── Utils ─────────────────────────────────────────────────────────────
      clearPayment: () => set({ currentPayment: null, paymentStatus: null }),
      clearError:   () => set({ error: null }),
    }),
    { name: 'PaymentStore' }
  )
);