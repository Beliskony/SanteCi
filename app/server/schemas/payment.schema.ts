// app/server/schemas/payment.schema.ts
import { z } from 'zod';

// ─── Enums partagés ───────────────────────────────────────────────────────────

const CurrencyEnum = z.enum(['XOF', 'EUR', 'USD']);
const MethodEnum   = z.enum(['mobile_money', 'card', 'wallet', 'Assurance']);
const ProviderEnum = z.enum(['orange_money', 'mtn_money', 'wave']);

// ─── Initier un paiement ──────────────────────────────────────────────────────

export const InitiatePaymentSchema = z.object({
  appointmentId: z
    .string()
    .min(1, 'appointmentId requis')
    .regex(/^[a-f\d]{24}$/i, 'appointmentId doit être un ObjectId valide'),

  amount: z
    .number({ error: 'Le montant doit être un nombre' })
    .positive('Le montant doit être positif')
    .int('Le montant doit être un entier (XOF sans décimales)'),

  currency: CurrencyEnum,
  method:   MethodEnum,
  provider: ProviderEnum.optional(),
});

// ─── Simuler un paiement ──────────────────────────────────────────────────────

export const SimulatePaymentSchema = z.object({
  appointmentId: z
    .string()
    .min(1, 'appointmentId requis')
    .regex(/^[a-f\d]{24}$/i, 'appointmentId doit être un ObjectId valide'),

  outcome: z.enum(['success', 'failure'], {
    message: 'outcome doit être "success" ou "failure"',
  }),
});

// ─── Rembourser ───────────────────────────────────────────────────────────────

export const RefundPaymentSchema = z.object({
  reason: z
    .string()
    .min(5, 'Raison du remboursement requise (min 5 caractères)')
    .max(300)
    .optional(),
});

// ─── Webhook Wave (pour plus tard) ────────────────────────────────────────────

export const WaveWebhookSchema = z.object({
  id:   z.string(),
  type: z.enum(['checkout.session.completed', 'checkout.session.expired']),
  data: z.object({
    id:               z.string(),
    amount:           z.string(),
    checkout_status:  z.enum(['complete', 'expired']),
    client_reference: z.string().nullable(),
    currency:         CurrencyEnum,
    payment_status:   z.enum(['succeeded', 'failed']),
    transaction_id:   z.string().optional(),
    when_completed:   z.string().optional(),
    when_created:     z.string(),
    when_expires:     z.string(),
    wave_launch_url:  z.string().url(),
    success_url:      z.string().url(),
    error_url:        z.string().url(),
  }),
});

// ─── Types inférés ────────────────────────────────────────────────────────────

export type InitiatePaymentDTO = z.infer<typeof InitiatePaymentSchema>;
export type SimulatePaymentDTO = z.infer<typeof SimulatePaymentSchema>;
export type RefundPaymentDTO   = z.infer<typeof RefundPaymentSchema>;
export type WaveWebhookDTO     = z.infer<typeof WaveWebhookSchema>;