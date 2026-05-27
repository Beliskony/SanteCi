// app/server/services/payment.service.ts
import crypto from 'crypto';
import { Types } from 'mongoose';
import { Appointment } from '../models/appointement.model';
import { IAppointment } from '../interfaces/appointement.interface';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentProvider = 'orange_money' | 'mtn_money' | 'wave';
type PaymentMethod   = 'mobile_money' | 'card' | 'wallet' | 'Assurance';
type Currency        = 'XOF' | 'EUR' | 'USD';

export interface InitiatePaymentDTO {
  appointmentId: string;   // _id Mongo du RDV
  patientId?:     string;
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
  status:         'pending' | 'paid' | 'failed' | 'refunded';
  simulatedAt?:   Date;
  // Prêt pour Wave : on ajoutera wave_launch_url ici
  checkoutUrl?:   string;
}

// ─── Payment Service ──────────────────────────────────────────────────────────

class PaymentService {

  // ── Initier un paiement ────────────────────────────────────────────────────
  // Génère un transactionId simulé et met le RDV en attente de paiement

  async initiate(dto: InitiatePaymentDTO): Promise<PaymentResult> {

    const appointment = await Appointment.findById(dto.appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    // Vérifier que c'est bien le patient du RDV
    if (String(appointment.patientId) !== dto.patientId) {
      throw new Error('Action non autorisée.');
    }

    // Déjà payé
    if (appointment.status.paymentStatus === 'paid') {
      throw new Error('Ce rendez-vous est déjà payé.');
    }

    // Annulé ou terminé
    if (['cancelled', 'completed'].includes(appointment.status.current)) {
      throw new Error(`Impossible de payer un rendez-vous au statut "${appointment.status.current}".`);
    }

    // Générer un transactionId simulé (format Wave-like)
    const transactionId = `SIM-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    // Mettre à jour le RDV avec les infos de paiement
    await Appointment.findByIdAndUpdate(dto.appointmentId, {
      $set: {
        'payment.amount':        dto.amount,
        'payment.currency':      dto.currency,
        'payment.method':        dto.method,
        'payment.provider':      dto.provider,
        'payment.transactionId': transactionId,
        'status.paymentStatus':  'pending',
        'metadata.updatedAt':    new Date(),
      },
    });

    return {
      transactionId,
      appointmentId: dto.appointmentId,
      amount:        dto.amount,
      currency:      dto.currency,
      status:        'pending',
      // Quand Wave sera branché :
      // checkoutUrl: `https://pay.wave.com/c/${sessionId}`
      checkoutUrl:   `/patient/rdv/pay/${dto.appointmentId}?txn=${transactionId}`,
    };
  }

  // ── Simuler un paiement réussi ─────────────────────────────────────────────
  // En prod ce sera remplacé par le webhook Wave

  async simulateSuccess(
    appointmentId: string,
    patientId: string
  ): Promise<PaymentResult> {

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    if (String(appointment.patientId) !== patientId) {
      throw new Error('Action non autorisée.');
    }

    if (appointment.status.paymentStatus === 'paid') {
      throw new Error('Ce rendez-vous est déjà payé.');
    }

    if (appointment.status.paymentStatus !== 'pending') {
      throw new Error('Le paiement n\'a pas été initié.');
    }

    const paidAt = new Date();

    await Appointment.findByIdAndUpdate(appointmentId, {
      $set: {
        'status.paymentStatus': 'paid',
        'payment.paidAt':       paidAt,
        'metadata.updatedAt':   new Date(),
      },
    });

    return {
      transactionId: appointment.payment.transactionId!,
      appointmentId,
      amount:        appointment.payment.amount,
      currency:      appointment.payment.currency as Currency,
      status:        'paid',
      simulatedAt:   paidAt,
    };
  }

  // ── Simuler un échec ───────────────────────────────────────────────────────

  async simulateFailure(
    appointmentId: string,
    patientId: string
  ): Promise<PaymentResult> {

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    if (String(appointment.patientId) !== patientId) {
      throw new Error('Action non autorisée.');
    }

    await Appointment.findByIdAndUpdate(appointmentId, {
      $set: {
        'status.paymentStatus': 'failed',
        'metadata.updatedAt':   new Date(),
      },
    });

    return {
      transactionId: appointment.payment.transactionId ?? 'N/A',
      appointmentId,
      amount:        appointment.payment.amount,
      currency:      appointment.payment.currency as Currency,
      status:        'failed',
    };
  }

  // ── Rembourser ─────────────────────────────────────────────────────────────
  // En prod : appel Wave Payout API ici

  async refund(
    appointmentId: string,
    requesterId:   string,
    requesterRole: 'patient' | 'doctor' | 'system'
  ): Promise<PaymentResult> {

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    // Vérifier autorisation
    if (requesterRole === 'patient' && String(appointment.patientId) !== requesterId) {
      throw new Error('Action non autorisée.');
    }
    if (requesterRole === 'doctor' && String(appointment.doctorId) !== requesterId) {
      throw new Error('Action non autorisée.');
    }

    if (appointment.status.paymentStatus !== 'paid') {
      throw new Error('Seul un paiement effectué peut être remboursé.');
    }

    await Appointment.findByIdAndUpdate(appointmentId, {
      $set: {
        'status.paymentStatus': 'refunded',
        'metadata.updatedAt':   new Date(),
      },
    });

    return {
      transactionId: appointment.payment.transactionId!,
      appointmentId,
      amount:        appointment.payment.amount,
      currency:      appointment.payment.currency as Currency,
      status:        'refunded',
    };
  }

  // ── Récupérer le statut d'un paiement ─────────────────────────────────────

  async getStatus(appointmentId: string): Promise<{
    paymentStatus:  string;
    transactionId?: string;
    amount:         number;
    currency:       string;
    paidAt?:        Date;
  }> {
    const appointment = await Appointment.findById(appointmentId)
      .select('status.paymentStatus payment.transactionId payment.amount payment.currency payment.paidAt');

    if (!appointment) throw new Error('Rendez-vous introuvable.');

    return {
      paymentStatus:  appointment.status.paymentStatus,
      transactionId:  appointment.payment.transactionId,
      amount:         appointment.payment.amount,
      currency:       appointment.payment.currency,
      paidAt:         appointment.payment.paidAt,
    };
  }
}

export const paymentService = new PaymentService();