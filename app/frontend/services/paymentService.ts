// app/frontend/services/paymentService.ts
import * as api from '@/app/frontend/lib/apiClient';
import type { ApiResponse } from '@/app/frontend/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Currency        = 'XOF' | 'EUR' | 'USD';
export type PaymentMethod   = 'mobile_money' | 'card' | 'wallet' | 'Assurance';
export type PaymentProvider = 'wave' | 'stripe';
export type PaymentStatus   = 'pending' | 'paid' | 'failed' | 'refunded';
export type SimulateOutcome = 'success' | 'failure';

export interface InitiatePaymentDTO {
  appointmentId:  string;
  amount:         number;
  currency:       Currency;
  method:         PaymentMethod;
  provider:       PaymentProvider;  // obligatoire
  patientPhone?:  string;           // Wave uniquement
  patientEmail?:  string;           // Stripe uniquement
}

export interface PaymentResult {
  transactionId:  string;
  appointmentId:  string;
  amount:         number;
  currency:       Currency;
  status:         PaymentStatus;
  provider:       PaymentProvider;
  checkoutUrl?:   string;   // wave_launch_url ou Stripe hosted URL
  sessionId?:     string;   // cos-XXXX (Wave) ou cs_XXXX (Stripe)
  simulatedAt?:   string;   // dev uniquement
}

export interface PaymentStatusResult {
  paymentStatus:  PaymentStatus;
  transactionId?: string;
  amount:         number;
  currency:       string;
  provider?:      PaymentProvider;
  paidAt?:        string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const paymentService = {

  // ── POST /api/payments ────────────────────────────────────────────────────
  async initiate(dto: InitiatePaymentDTO): Promise<PaymentResult> {
    const res = await api.post<ApiResponse<PaymentResult>>('/payments', dto);
    return res.data;
  },

  // ── POST /api/payments/verify ─────────────────────────────────────────────
  // Appelé après redirect Wave/Stripe sur success_url
  async verify(appointmentId: string): Promise<PaymentResult> {
    const res = await api.post<ApiResponse<PaymentResult>>(
      '/payments/verify',
      { appointmentId }
    );
    return res.data;
  },

  // ── POST /api/payments/simulate (dev uniquement) ──────────────────────────
  async simulate(
    appointmentId: string,
    outcome:       SimulateOutcome
  ): Promise<{ appointmentId: string; status: PaymentStatus; simulatedAt: string }> {
    const res = await api.post<ApiResponse<{
      appointmentId: string;
      status:        PaymentStatus;
      simulatedAt:   string;
    }>>('/payments/simulate', { appointmentId, outcome });
    return res.data;
  },

  // ── GET /api/payments/[id] ────────────────────────────────────────────────
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
};