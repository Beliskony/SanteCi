// app/server/services/payment.service.ts
import { Appointment } from '../models/appointement.model';
import { Doctor }      from '../models/medcin.model';

type Currency     = 'XOF' | 'EUR' | 'USD';
type SubscriptionPlan = 'premium' | 'elite';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InitiatePaymentDTO {
  appointmentId:   string;
  patientId?:      string;
  amount:          number;
  currency:        Currency;
  channel:         string;
  referenceNumber: string;
}

export interface InitiateSubscriptionDTO {
  doctorId:        string;
  plan:            SubscriptionPlan;
  amount:          number;
  currency:        Currency;
  channel:         string;
  referenceNumber: string;
}

export interface PaymentResult {
  transactionId:   string;
  appointmentId?:  string;
  doctorId?:       string;
  amount:          number;
  currency:        Currency;
  status:          'pending' | 'paid' | 'failed' | 'refunded';
  referenceNumber: string;
  type:            'consultation' | 'subscription';
}

// ─── Payment Service ──────────────────────────────────────────────────────────

class PaymentService {

  // ── Initier un paiement de consultation ───────────────────────────────────

  async initiate(dto: InitiatePaymentDTO): Promise<PaymentResult> {
    const appointment = await Appointment.findById(dto.appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    if (dto.patientId && String(appointment.patientId) !== dto.patientId) {
      throw new Error('Action non autorisée.');
    }
    if (appointment.status.paymentStatus === 'paid') {
      throw new Error('Ce rendez-vous est déjà payé.');
    }
    if (['cancelled', 'completed'].includes(appointment.status.current)) {
      throw new Error(`Impossible de payer un rendez-vous au statut "${appointment.status.current}".`);
    }

    await Appointment.findByIdAndUpdate(dto.appointmentId, {
      $set: {
        'payment.amount':        dto.amount,
        'payment.currency':      dto.currency,
        'payment.method':        dto.channel === 'CARD' ? 'card' : 'mobile_money',
        'payment.provider':      dto.channel.toLowerCase(),
        'payment.transactionId': dto.referenceNumber,
        'status.paymentStatus':  'pending',
        'metadata.updatedAt':    new Date(),
      },
    });

    return {
      transactionId:   dto.referenceNumber,
      appointmentId:   dto.appointmentId,
      amount:          dto.amount,
      currency:        dto.currency,
      status:          'pending',
      referenceNumber: dto.referenceNumber,
      type:            'consultation',
    };
  }

  // ── Initier un abonnement médecin ─────────────────────────────────────────

async initiateSubscription(dto: InitiateSubscriptionDTO): Promise<PaymentResult> {
  const doctor = await Doctor.findById(dto.doctorId);
  if (!doctor) throw new Error('Médecin introuvable.');

  // On n'active RIEN ici — on note juste qu'un paiement est en cours.
  // status.subscription ne change qu'à la confirmation du webhook.
  await Doctor.findByIdAndUpdate(dto.doctorId, {
    $set: {
      'status.subscriptionReference': dto.referenceNumber,
      'status.subscriptionStatus':    'pending',
      'metadata.updatedAt':           new Date(),
    },
  });

  return {
    transactionId:   dto.referenceNumber,
    doctorId:        dto.doctorId,
    amount:          dto.amount,
    currency:        dto.currency,
    status:          'pending',
    referenceNumber: dto.referenceNumber,
    type:            'subscription',
  };
}

  // ── Confirmer consultation (webhook) ──────────────────────────────────────

  async confirm(referenceNumber: string, status: 'success' | 'failed'): Promise<void> {
    const appointment = await Appointment.findOne({
      'payment.transactionId': referenceNumber,
    });
    if (!appointment) throw new Error('Rendez-vous introuvable pour cette référence.');

    await Appointment.findByIdAndUpdate(String(appointment._id), {
      $set: {
        'status.paymentStatus': status === 'success' ? 'paid' : 'failed',
        ...(status === 'success' ? { 'payment.paidAt': new Date() } : {}),
        'metadata.updatedAt': new Date(),
      },
    });
  }

// ── Confirmer abonnement (webhook) ────────────────────────────────────────

async confirmSubscription(referenceNumber: string, status: 'success' | 'failed'): Promise<void> {
  const doctor = await Doctor.findOne({
    'status.subscriptionReference': referenceNumber,
  });
  if (!doctor) throw new Error('Médecin introuvable pour cette référence.');

  if (status === 'success') {
    // Le plan ciblé n'est pas stocké côté médecin avant confirmation —
    // on le retrouve depuis la référence, ex: "SUB-<doctorId>-PREMIUM-<ts>"
    const planMatch = referenceNumber.match(/-(PREMIUM|ELITE)-/i);
    const plan = planMatch ? (planMatch[1].toLowerCase() as 'premium' | 'elite') : null;

    if (!plan) {
      throw new Error(`Impossible de déterminer le plan depuis la référence "${referenceNumber}".`);
    }

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);

    await Doctor.findByIdAndUpdate(String(doctor._id), {
      $set: {
        'status.subscription':       plan,      // ← activé seulement ici, au succès confirmé
        'status.subscriptionStatus': 'active',
        'status.subscriptionExpiry': expiry,
        'metadata.updatedAt':        new Date(),
      },
    });
  } else {
    // Échec → rien n'a jamais été activé, on nettoie juste la référence en attente
    await Doctor.findByIdAndUpdate(String(doctor._id), {
      $set: {
        'status.subscriptionStatus': 'failed',
        'metadata.updatedAt':        new Date(),
      },
    });
  }
}

  // ── Simuler (dev uniquement) ───────────────────────────────────────────────

  async simulateDev(
    appointmentId: string,
    patientId:     string,
    outcome:       'success' | 'failure'
  ): Promise<{ appointmentId: string; status: string; simulatedAt: Date }> {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');
    if (String(appointment.patientId) !== patientId) throw new Error('Action non autorisée.');

    const newStatus = outcome === 'success' ? 'paid' : 'failed';
    await Appointment.findByIdAndUpdate(appointmentId, {
      $set: {
        'status.paymentStatus': newStatus,
        ...(outcome === 'success' ? { 'payment.paidAt': new Date() } : {}),
        'metadata.updatedAt': new Date(),
      },
    });

    return { appointmentId, status: newStatus, simulatedAt: new Date() };
  }

  // ── Statut consultation ───────────────────────────────────────────────────

  async getStatus(appointmentId: string) {
    const appointment = await Appointment.findById(appointmentId)
      .select('status.paymentStatus payment');
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    return {
      paymentStatus:   appointment.status.paymentStatus,
      transactionId:   appointment.payment.transactionId,
      amount:          appointment.payment.amount,
      currency:        appointment.payment.currency,
      provider:        appointment.payment.provider,
      paidAt:          appointment.payment.paidAt,
    };
  }
}

export const paymentService = new PaymentService();