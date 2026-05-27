// app/frontend/services/paymentService.ts
import * as api from '@/app/frontend/lib/apiClient';
import type { ApiResponse } from '@/app/frontend/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Currency      = 'XOF' | 'EUR' | 'USD';
export type PaymentMethod = 'mobile_money' | 'card' | 'wallet' | 'Assurance';
export type PaymentProvider = 'orange_money' | 'mtn_money' | 'wave';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type SimulateOutcome = 'success' | 'failure';

export interface InitiatePaymentDTO {
  appointmentId: string;
  amount:        number;
  currency:      Currency;
  method:        PaymentMethod;
  provider?:     PaymentProvider;
}

export interface PaymentResult {
  transactionId:  string;
  appointmentId:  string;
  amount:         number;
  currency:       Currency;
  status:         PaymentStatus;
  simulatedAt?:   string;
  checkoutUrl?:   string;
}

export interface PaymentStatusResult {
  paymentStatus:  PaymentStatus;
  transactionId?: string;
  amount:         number;
  currency:       string;
  paidAt?:        string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const paymentService = {

  // POST /api/payments
  async initiate(dto: InitiatePaymentDTO): Promise<PaymentResult> {
    const res = await api.post<ApiResponse<PaymentResult>>(
      '/payments',
      dto
    );
    return res.data;
  },

  // POST /api/payments/simulate
  async simulate(
    id: string,
    outcome: SimulateOutcome
  ): Promise<PaymentResult> {
    const res = await api.post<ApiResponse<PaymentResult>>(
      '/payments/simulate',
      { appointmentId: id, outcome }
    );
    return res.data;
  },

  // GET /api/payments/[appointmentId]
  async getStatus(id: string): Promise<PaymentStatusResult> {
    const res = await api.get<ApiResponse<PaymentStatusResult>>(
      `/payments/${id}`
    );
    return res.data;
  },

  // POST /api/payments/[appointmentId]/refund
  async refund(
    id: string,
    reason?: string
  ): Promise<PaymentResult> {
    const res = await api.post<ApiResponse<PaymentResult>>(
      `/payments/${id}/refund`,
      { reason }
    );
    return res.data;
  },
};