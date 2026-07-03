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
  // ── Données ───────────────────────────────────────────────────────────────
  currentPayment: PaymentResult | null;
  paymentStatus:  PaymentStatusResult | null;

  // ── UI ────────────────────────────────────────────────────────────────────
  isLoading: boolean;
  error:     string | null;

  // ── Actions ───────────────────────────────────────────────────────────────

  /** POST /api/payments — crée la session Wave/Stripe et redirige */
  initiate: (dto: InitiatePaymentDTO) => Promise<PaymentResult>;

  /**
   * POST /api/payments/verify
   * Appelé au retour sur success_url — confirme le paiement auprès du backend
   */
  verify: (appointmentId: string) => Promise<PaymentResult>;

  /**
   * POST /api/payments/simulate — dev uniquement
   * Simule un succès ou échec sans passer par Wave/Stripe
   */
  simulate: (
    appointmentId: string,
    outcome: SimulateOutcome
  ) => Promise<{ appointmentId: string; status: string; simulatedAt: string }>;

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
      // Crée la session côté backend puis redirige vers Wave ou Stripe.
      // La page ne reprend pas après cette action — le patient reviendra
      // sur success_url où verify() sera appelé.
      initiate: async (dto) => {
        set({ isLoading: true, error: null });
        try {
          const result = await paymentService.initiate(dto);
          set({ currentPayment: result, isLoading: false });

          // Rediriger vers Wave ou Stripe (même onglet, obligatoire pour Wave)
          if (result.checkoutUrl) {
            window.location.href = result.checkoutUrl;
          }

          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur de paiement.';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      // ── Vérifier ──────────────────────────────────────────────────────────
      // Appelé depuis la page success_url après redirect Wave/Stripe.
      // Interroge le backend qui vérifie auprès de Wave/Stripe et confirme.
      verify: async (appointmentId) => {
        set({ isLoading: true, error: null });
        try {
          const result = await paymentService.verify(appointmentId);
          set({ currentPayment: result, isLoading: false });
          return result;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erreur de vérification.';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      // ── Simuler (dev uniquement) ──────────────────────────────────────────
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

      // ── Statut ────────────────────────────────────────────────────────────
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

      // ── Rembourser ────────────────────────────────────────────────────────
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

      // ── Utils ─────────────────────────────────────────────────────────────
      clearPayment: () => set({ currentPayment: null, paymentStatus: null }),
      clearError:   () => set({ error: null }),
    }),
    { name: 'PaymentStore' }
  )
);