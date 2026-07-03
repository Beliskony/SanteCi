// app/server/services/payment.service.ts
import crypto from 'crypto';
import Stripe  from 'stripe';
import { Appointment } from '../models/appointement.model';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentProvider = 'wave' | 'stripe';
type PaymentMethod   = 'mobile_money' | 'card' | 'wallet' | 'Assurance';
type Currency        = 'XOF' | 'EUR' | 'USD';

export interface InitiatePaymentDTO {
  appointmentId:  string;
  patientId?:     string;
  amount:         number;
  currency:       Currency;
  method:         PaymentMethod;
  provider:       PaymentProvider;  // obligatoire maintenant
  patientPhone?:  string;           // Wave uniquement : restrict_payer_mobile
  patientEmail?:  string;           // Stripe uniquement : customer_email
}

export interface PaymentResult {
  transactionId:  string;
  appointmentId:  string;
  amount:         number;
  currency:       Currency;
  status:         'pending' | 'paid' | 'failed' | 'refunded';
  provider:       PaymentProvider;
  checkoutUrl?:   string;   // wave_launch_url OU Stripe hosted URL
  sessionId?:     string;   // cos-XXXX (Wave) OU cs_XXXX (Stripe)
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL!;

// Wave
const WAVE_API_URL        = 'https://api.wave.com';
const WAVE_API_KEY        = process.env.WAVE_API_KEY!;
const WAVE_SIGNING_SECRET = process.env.WAVE_SIGNING_SECRET;

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ─── Wave helpers ─────────────────────────────────────────────────────────────

interface WaveSession {
  id:              string;
  wave_launch_url: string;
  checkout_status: 'open' | 'complete' | 'expired';
  payment_status:  'processing' | 'cancelled' | 'succeeded';
  transaction_id:  string;
  amount:          string;
  currency:        string;
  when_completed?: string;
}

async function waveRequest<T>(
  method: 'GET' | 'POST',
  path:   string,
  body?:  object
): Promise<T> {
  const url  = `${WAVE_API_URL}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${WAVE_API_KEY}`,
    'Content-Type':  'application/json',
  };

  if (WAVE_SIGNING_SECRET) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const rawBody   = body ? JSON.stringify(body) : '';
    const signature = crypto
      .createHmac('sha256', WAVE_SIGNING_SECRET)
      .update(timestamp + rawBody)
      .digest('hex');
    headers['Wave-Signature'] = `t=${timestamp},v1=${signature}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Wave ${method} ${path} → ${res.status}: ${err?.error?.code ?? 'unknown'}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ─── Payment Service ──────────────────────────────────────────────────────────

class PaymentService {

  // ── Guard commun ──────────────────────────────────────────────────────────

  private async getValidAppointment(appointmentId: string, patientId?: string) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    if (patientId && String(appointment.patientId) !== patientId) {
      throw new Error('Action non autorisée.');
    }
    if (appointment.status.paymentStatus === 'paid') {
      throw new Error('Ce rendez-vous est déjà payé.');
    }
    if (['cancelled', 'completed'].includes(appointment.status.current)) {
      throw new Error(`Impossible de payer un rendez-vous au statut "${appointment.status.current}".`);
    }
    return appointment;
  }

  // ── Initier — router vers Wave ou Stripe ──────────────────────────────────

  async initiate(dto: InitiatePaymentDTO): Promise<PaymentResult> {
    await this.getValidAppointment(dto.appointmentId, dto.patientId);

    return dto.provider === 'stripe'
      ? this.initiateStripe(dto)
      : this.initiateWave(dto);
  }

  // ── Wave ──────────────────────────────────────────────────────────────────

  private async initiateWave(dto: InitiatePaymentDTO): Promise<PaymentResult> {
    const payload: Record<string, string> = {
      amount:           String(dto.amount),    // XOF → pas de décimales
      currency:         dto.currency,
      success_url:      `${APP_BASE_URL}/patient/rdv/pay/${dto.appointmentId}?status=success&provider=wave`,
      error_url:        `${APP_BASE_URL}/patient/rdv/pay/${dto.appointmentId}?status=error&provider=wave`,
      client_reference: dto.appointmentId,
    };

    if (dto.patientPhone) {
      payload.restrict_payer_mobile = dto.patientPhone.startsWith('+')
        ? dto.patientPhone
        : `+225${dto.patientPhone.replace(/\s/g, '')}`;
    }

    const session = await waveRequest<WaveSession>(
      'POST',
      '/v1/checkout/sessions',
      payload
    );

    await Appointment.findByIdAndUpdate(dto.appointmentId, {
      $set: {
        'payment.amount':        dto.amount,
        'payment.currency':      dto.currency,
        'payment.method':        dto.method,
        'payment.provider':      'wave',
        'payment.transactionId': session.id,   // cos-XXXX
        'status.paymentStatus':  'pending',
        'metadata.updatedAt':    new Date(),
      },
    });

    return {
      transactionId: session.id,
      appointmentId: dto.appointmentId,
      amount:        dto.amount,
      currency:      dto.currency,
      status:        'pending',
      provider:      'wave',
      checkoutUrl:   session.wave_launch_url,
      sessionId:     session.id,
    };
  }

  // ── Stripe ────────────────────────────────────────────────────────────────

  private async initiateStripe(dto: InitiatePaymentDTO): Promise<PaymentResult> {
    // Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode:               'payment',
      payment_method_types: ['card'],
      customer_email:     dto.patientEmail,
      client_reference_id: dto.appointmentId,
      line_items: [{
        price_data: {
          currency:     dto.currency.toLowerCase(), // 'xof' | 'eur' | 'usd'
          unit_amount:  dto.currency === 'XOF'
            ? dto.amount          // XOF : pas de centimes
            : dto.amount * 100,   // EUR/USD : Stripe attend les centimes
          product_data: { name: 'Consultation médicale — SantéCI' },
        },
        quantity: 1,
      }],
      metadata: { appointmentId: dto.appointmentId },
      success_url: `${APP_BASE_URL}/patient/rdv/pay/${dto.appointmentId}?status=success&provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_BASE_URL}/patient/rdv/pay/${dto.appointmentId}?status=error&provider=stripe`,
    });

    await Appointment.findByIdAndUpdate(dto.appointmentId, {
      $set: {
        'payment.amount':        dto.amount,
        'payment.currency':      dto.currency,
        'payment.method':        'card',
        'payment.provider':      'stripe',
        'payment.transactionId': session.id,   // cs_XXXX
        'status.paymentStatus':  'pending',
        'metadata.updatedAt':    new Date(),
      },
    });

    return {
      transactionId: session.id,
      appointmentId: dto.appointmentId,
      amount:        dto.amount,
      currency:      dto.currency,
      status:        'pending',
      provider:      'stripe',
      checkoutUrl:   session.url!,             // URL hosted Stripe
      sessionId:     session.id,
    };
  }

  // ── Vérifier et confirmer — router selon le provider ──────────────────────

  async verifyAndConfirm(appointmentId: string): Promise<PaymentResult> {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    const provider = appointment.payment.provider as PaymentProvider;

    return provider === 'stripe'
      ? this.verifyStripe(appointment)
      : this.verifyWave(appointment);
  }

  private async verifyWave(appointment: any): Promise<PaymentResult> {
    const session = await waveRequest<WaveSession>(
      'GET',
      `/v1/checkout/sessions/${appointment.payment.transactionId}`
    );

    if (session.checkout_status === 'complete' && session.payment_status === 'succeeded') {
      if (appointment.status.paymentStatus !== 'paid') {
        await Appointment.findByIdAndUpdate(String(appointment._id), {
          $set: {
            'status.paymentStatus': 'paid',
            'payment.paidAt':       new Date(session.when_completed!),
            'metadata.updatedAt':   new Date(),
          },
        });
      }
      return {
        transactionId: session.transaction_id,
        appointmentId: String(appointment._id),
        amount:        parseInt(session.amount),
        currency:      session.currency as Currency,
        status:        'paid',
        provider:      'wave',
      };
    }

    if (session.checkout_status === 'expired' || session.payment_status === 'cancelled') {
      await Appointment.findByIdAndUpdate(String(appointment._id), {
        $set: { 'status.paymentStatus': 'failed', 'metadata.updatedAt': new Date() },
      });
      return {
        transactionId: session.id,
        appointmentId: String(appointment._id),
        amount:        parseInt(session.amount),
        currency:      session.currency as Currency,
        status:        'failed',
        provider:      'wave',
      };
    }

    return {
      transactionId: session.id,
      appointmentId: String(appointment._id),
      amount:        parseInt(session.amount),
      currency:      session.currency as Currency,
      status:        'pending',
      provider:      'wave',
      checkoutUrl:   session.wave_launch_url,
    };
  }

  private async verifyStripe(appointment: any): Promise<PaymentResult> {
    const session = await stripe.checkout.sessions.retrieve(
      appointment.payment.transactionId
    );

    if (session.payment_status === 'paid') {
      if (appointment.status.paymentStatus !== 'paid') {
        await Appointment.findByIdAndUpdate(String(appointment._id), {
          $set: {
            'status.paymentStatus': 'paid',
            'payment.paidAt':       new Date(),
            'metadata.updatedAt':   new Date(),
          },
        });
      }
      return {
        transactionId: session.payment_intent as string,
        appointmentId: String(appointment._id),
        amount:        appointment.payment.amount,
        currency:      appointment.payment.currency,
        status:        'paid',
        provider:      'stripe',
      };
    }

    if (session.status === 'expired') {
      await Appointment.findByIdAndUpdate(String(appointment._id), {
        $set: { 'status.paymentStatus': 'failed', 'metadata.updatedAt': new Date() },
      });
      return {
        transactionId: session.id,
        appointmentId: String(appointment._id),
        amount:        appointment.payment.amount,
        currency:      appointment.payment.currency,
        status:        'failed',
        provider:      'stripe',
      };
    }

    return {
      transactionId: session.id,
      appointmentId: String(appointment._id),
      amount:        appointment.payment.amount,
      currency:      appointment.payment.currency,
      status:        'pending',
      provider:      'stripe',
      checkoutUrl:   session.url ?? undefined,
    };
  }

  // ── Rembourser — router selon le provider ─────────────────────────────────

  async refund(
    appointmentId: string,
    requesterId:   string,
    requesterRole: 'patient' | 'doctor' | 'system'
  ): Promise<PaymentResult> {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    if (requesterRole === 'patient' && String(appointment.patientId) !== requesterId) {
      throw new Error('Action non autorisée.');
    }
    if (requesterRole === 'doctor' && String(appointment.doctorId) !== requesterId) {
      throw new Error('Action non autorisée.');
    }
    if (appointment.status.paymentStatus !== 'paid') {
      throw new Error('Seul un paiement effectué peut être remboursé.');
    }

    const provider = appointment.payment.provider as PaymentProvider;

    if (provider === 'stripe') {
      // Récupérer le payment_intent depuis la session Stripe
      const session = await stripe.checkout.sessions.retrieve(
        appointment.payment.transactionId
      );
      await stripe.refunds.create({
        payment_intent: session.payment_intent as string,
      });
    } else {
      await waveRequest('POST',
        `/v1/checkout/sessions/${appointment.payment.transactionId}/refund`
      );
    }

    await Appointment.findByIdAndUpdate(appointmentId, {
      $set: { 'status.paymentStatus': 'refunded', 'metadata.updatedAt': new Date() },
    });

    return {
      transactionId: appointment.payment.transactionId!,
      appointmentId,
      amount:        appointment.payment.amount,
      currency:      appointment.payment.currency as Currency,
      status:        'refunded',
      provider,
    };
  }

  // ── Statut ────────────────────────────────────────────────────────────────

  async getStatus(appointmentId: string) {
    const appointment = await Appointment.findById(appointmentId)
      .select('status.paymentStatus payment');
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    return {
      paymentStatus:  appointment.status.paymentStatus,
      transactionId:  appointment.payment.transactionId,
      amount:         appointment.payment.amount,
      currency:       appointment.payment.currency,
      provider:       appointment.payment.provider,
      paidAt:         appointment.payment.paidAt,
    };
  }
}

export const paymentService = new PaymentService();