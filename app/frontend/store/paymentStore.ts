// app/frontend/store/paymentStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { paymentService } from '../services/paymentService';
import type {
  PaymentResult,
  PaymentStatusResult,
  InitiatePaymentDTO,
  InitiateSubscriptionDTO,
  SimulateOutcome,
} from '../services/paymentService';

// ─── State ────────────────────────────────────────────────────────────────────

interface PaymentState {
  // ── Données ───────────────────────────────────────────────────────────────
  currentPayment: PaymentResult | null;
  paymentStatus:  PaymentStatusResult | null;

  // ── UI ────────────────────────────────────────────────────────────────────
  isLoading: boolean;
  error:     string | null;

  // ── Actions ───────────────────────────────────────────────────────────────

  /** POST /api/payments — enregistre la consultation en pending */
  initiate: (dto: InitiatePaymentDTO) => Promise<PaymentResult>;

  /** POST /api/subscriptions — enregistre l'abonnement médecin en pending */
  initiateSubscription: (dto: InitiateSubscriptionDTO) => Promise<PaymentResult>;

  /** GET /api/payments/[id] — statut consultation */
  fetchStatus: (id: string) => Promise<void>;

  /** POST /api/payments/[id]/refund */
  refund: (id: string, reason?: string) => Promise<PaymentResult>;

  /** POST /api/payments/simulate — dev uniquement */
  simulate: (
    appointmentId: string,
    outcome: SimulateOutcome
  ) => Promise<{ appointmentId: string; status: string; simulatedAt: string }>;

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

      // ── initiate ──────────────────────────────────────────────────────────
      // Enregistre le paiement en base (pending).
      // La redirection vers PaiementPro se fait dans PaymentPage
      // après l'appel SDK pp.getUrlPayment() → window.location.href = pp.url
      initiate: async (dto) => {
        set({ isLoading: true, error: null });
        try {
          const result = await paymentService.initiate(dto);
          set({ currentPayment: result, isLoading: false });
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur de paiement.';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      // ── initiateSubscription ──────────────────────────────────────────────
      // Enregistre l'abonnement en base (pending).
      // La redirection vers PaiementPro se fait dans SubscriptionSection
      // après l'appel SDK pp.getUrlPayment() → window.location.href = pp.url
      initiateSubscription: async (dto) => {
        set({ isLoading: true, error: null });
        try {
          const result = await paymentService.initiateSubscription(dto);
          set({ currentPayment: result, isLoading: false });
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur d\'abonnement.';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      // ── fetchStatus ───────────────────────────────────────────────────────
      fetchStatus: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const status = await paymentService.getStatus(id);
          set({ paymentStatus: status, isLoading: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur de chargement.';
          set({ error: message, isLoading: false });
        }
      },

      // ── refund ────────────────────────────────────────────────────────────
      refund: async (id, reason) => {
        set({ isLoading: true, error: null });
        try {
          const result = await paymentService.refund(id, reason);
          set({ currentPayment: result, isLoading: false });
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur de remboursement.';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      // ── simulate (dev uniquement) ─────────────────────────────────────────
      simulate: async (appointmentId, outcome) => {
        set({ isLoading: true, error: null });
        try {
          const result = await paymentService.simulate(appointmentId, outcome);
          set({ isLoading: false });
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur de simulation.';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      // ── Utils ─────────────────────────────────────────────────────────────
      clearPayment: () => set({ currentPayment: null, paymentStatus: null }),
      clearError:   () => set({ error: null }),
    }),
    { name: 'PaymentStore', enabled: process.env.NODE_ENV === "development" }
  )
);