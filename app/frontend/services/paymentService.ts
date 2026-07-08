// app/frontend/services/paymentService.ts
import * as api from '@/app/frontend/lib/apiClient';
import type { ApiResponse } from '@/app/frontend/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Currency         = 'XOF' | 'EUR' | 'USD';
export type PaymentStatus    = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentChannel   = 'WAVE' | 'ORANGE_MONEY' | 'MTN_MONEY' | 'CARD';
export type SubscriptionPlan = 'premium' | 'elite';
export type SimulateOutcome  = 'success' | 'failure';
export type PaymentType      = 'consultation' | 'subscription';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface InitiatePaymentDTO {
  appointmentId:   string;
  amount:          number;
  currency:        Currency;
  channel:         PaymentChannel;
  referenceNumber: string;
}

export interface InitiateSubscriptionDTO {
  plan:            SubscriptionPlan;
  amount:          number;
  currency:        Currency;
  channel:         PaymentChannel;
  referenceNumber: string;
}

// ─── Résultats ────────────────────────────────────────────────────────────────

export interface PaymentResult {
  transactionId:   string;
  appointmentId?:  string;
  doctorId?:       string;
  amount:          number;
  currency:        Currency;
  status:          PaymentStatus;
  referenceNumber: string;
  type:            PaymentType;
}

export interface PaymentStatusResult {
  paymentStatus:  PaymentStatus;
  transactionId?: string;
  amount:         number;
  currency:       string;
  provider?:      string;
  paidAt?:        string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const paymentService = {

  // ── POST /api/payments — consultation ─────────────────────────────────────
  async initiate(dto: InitiatePaymentDTO): Promise<PaymentResult> {
    const res = await api.post<ApiResponse<PaymentResult>>('/payments', dto);
    return res.data;
  },

  // ── POST /api/subscriptions — abonnement médecin ──────────────────────────
  async initiateSubscription(dto: InitiateSubscriptionDTO): Promise<PaymentResult> {
    const res = await api.post<ApiResponse<PaymentResult>>('/subscriptions', dto);
    return res.data;
  },

  // ── GET /api/payments/[id] — statut consultation ──────────────────────────
  async getStatus(id: string): Promise<PaymentStatusResult> {
    const res = await api.get<ApiResponse<PaymentStatusResult>>(`/payments/${id}`);
    return res.data;
  },

  // ── POST /api/payments/[id]/refund ────────────────────────────────────────
  async refund(id: string, reason?: string): Promise<PaymentResult> {
    const res = await api.post<ApiResponse<PaymentResult>>(
      `/payments/${id}/refund`,
      { reason }
    );
    return res.data;
  },

  // ── POST /api/payments/simulate — dev uniquement ──────────────────────────
  async simulate(appointmentId: string, outcome: SimulateOutcome) {
    const res = await api.post<ApiResponse<{
      appointmentId: string;
      status:        PaymentStatus;
      simulatedAt:   string;
    }>>('/payments/simulate', { appointmentId, outcome });
    return res.data;
  },
};