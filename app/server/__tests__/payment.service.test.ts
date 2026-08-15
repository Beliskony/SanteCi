/**
 * payment.service.test.ts
 *
 * Tests unitaires purs : Appointment et Doctor sont mockés.
 * Structure : app/server/services/payment.service.ts, app/server/models/*.ts,
 * app/server/__tests__/payment.service.test.ts (ce fichier).
 *
 * payment.service n'utilise que findById/findByIdAndUpdate/findOne — pas de
 * .save() sur document muté — donc les mocks sont des valeurs statiques
 * simples, pas des documents avec méthode .save().
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../models/appointement.model', () => ({
  Appointment: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../models/medcin.model', () => ({
  Doctor: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
  },
}));

import { paymentService } from '../services/payment.service';
import { Appointment } from '../models/appointement.model';
import { Doctor } from '../models/medcin.model';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── initiate (paiement de consultation) ───────────────────────────────────

describe('paymentService.initiate', () => {
  const dto = {
    appointmentId: 'apt1',
    patientId: 'pat1',
    amount: 5000,
    currency: 'XOF' as const,
    channel: 'ORANGE_MONEY',
    referenceNumber: 'REF-001',
  };

  it('rejette si le rendez-vous est introuvable', async () => {
    (Appointment.findById as any).mockResolvedValue(null);

    await expect(paymentService.initiate(dto)).rejects.toThrow('Rendez-vous introuvable.');
  });

  it("rejette si le patientId ne correspond pas au rendez-vous", async () => {
    (Appointment.findById as any).mockResolvedValue({
      patientId: 'pat-autre',
      status: { paymentStatus: 'pending', current: 'pending' },
    });

    await expect(paymentService.initiate(dto)).rejects.toThrow('Action non autorisée.');
  });

  it('rejette si le rendez-vous est déjà payé', async () => {
    (Appointment.findById as any).mockResolvedValue({
      patientId: 'pat1',
      status: { paymentStatus: 'paid', current: 'confirmed' },
    });

    await expect(paymentService.initiate(dto)).rejects.toThrow('Ce rendez-vous est déjà payé.');
  });

  it('rejette si le rendez-vous est annulé ou terminé', async () => {
    (Appointment.findById as any).mockResolvedValue({
      patientId: 'pat1',
      status: { paymentStatus: 'pending', current: 'cancelled' },
    });

    await expect(paymentService.initiate(dto)).rejects.toThrow(
      'Impossible de payer un rendez-vous au statut "cancelled".'
    );
  });

  it('initie le paiement et met à jour le rendez-vous en "pending"', async () => {
    (Appointment.findById as any).mockResolvedValue({
      patientId: 'pat1',
      status: { paymentStatus: 'pending', current: 'confirmed' },
    });
    (Appointment.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await paymentService.initiate(dto);

    expect(result.status).toBe('pending');
    expect(result.type).toBe('consultation');
    expect(Appointment.findByIdAndUpdate).toHaveBeenCalledWith(
      'apt1',
      expect.objectContaining({
        $set: expect.objectContaining({
          'payment.amount': 5000,
          'payment.transactionId': 'REF-001',
          'status.paymentStatus': 'pending',
        }),
      })
    );
  });
});

// ─── initiateSubscription ───────────────────────────────────────────────────

describe('paymentService.initiateSubscription', () => {
  const dto = {
    doctorId: 'doc1',
    plan: 'premium' as const,
    amount: 10000,
    currency: 'XOF' as const,
    channel: 'WAVE',
    referenceNumber: 'REF-SUB-001',
  };

  it('rejette si le médecin est introuvable', async () => {
    (Doctor.findById as any).mockResolvedValue(null);

    await expect(paymentService.initiateSubscription(dto)).rejects.toThrow('Médecin introuvable.');
  });

  it("initie l'abonnement et le passe en 'pending' avec la référence", async () => {
    (Doctor.findById as any).mockResolvedValue({ _id: 'doc1' });
    (Doctor.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await paymentService.initiateSubscription(dto);

    expect(result.status).toBe('pending');
    expect(result.type).toBe('subscription');

    const updateArg = (Doctor.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg.$set['status.subscriptionReference']).toBe('REF-SUB-001');
    expect(updateArg.$set['status.subscriptionStatus']).toBe('pending');
  });
});

// ─── confirm (webhook consultation) ────────────────────────────────────────

describe('paymentService.confirm', () => {
  it('rejette si aucun rendez-vous ne correspond à la référence', async () => {
    (Appointment.findOne as any).mockResolvedValue(null);

    await expect(paymentService.confirm('REF-XXX', 'success')).rejects.toThrow(
      'Rendez-vous introuvable pour cette référence.'
    );
  });

  it('marque le paiement "paid" et fixe paidAt en cas de succès', async () => {
    (Appointment.findOne as any).mockResolvedValue({ _id: 'apt1' });
    (Appointment.findByIdAndUpdate as any).mockResolvedValue(undefined);

    await paymentService.confirm('REF-001', 'success');

    const updateArg = (Appointment.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg.$set['status.paymentStatus']).toBe('paid');
    expect(updateArg.$set['payment.paidAt']).toBeInstanceOf(Date);
  });

  it('marque le paiement "failed" sans paidAt en cas d\'échec', async () => {
    (Appointment.findOne as any).mockResolvedValue({ _id: 'apt1' });
    (Appointment.findByIdAndUpdate as any).mockResolvedValue(undefined);

    await paymentService.confirm('REF-001', 'failed');

    const updateArg = (Appointment.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg.$set['status.paymentStatus']).toBe('failed');
    expect(updateArg.$set['payment.paidAt']).toBeUndefined();
  });
});

// ─── confirmSubscription (webhook abonnement) ──────────────────────────────

describe('paymentService.confirmSubscription', () => {
  it('rejette si aucun médecin ne correspond à la référence', async () => {
    (Doctor.findOne as any).mockResolvedValue(null);

    await expect(paymentService.confirmSubscription('REF-XXX', 'success')).rejects.toThrow(
      'Médecin introuvable pour cette référence.'
    );
  });

  it('rejette si le plan ne peut pas être déduit de la référence', async () => {
    (Doctor.findOne as any).mockResolvedValue({ _id: 'doc1' });

    await expect(
      paymentService.confirmSubscription('REF-SUB-001', 'success')
    ).rejects.toThrow('Impossible de déterminer le plan depuis la référence "REF-SUB-001".');
  });

  it("active l'abonnement et fixe l'expiration à +1 mois en cas de succès", async () => {
    (Doctor.findOne as any).mockResolvedValue({ _id: 'doc1' });
    (Doctor.findByIdAndUpdate as any).mockResolvedValue(undefined);

    await paymentService.confirmSubscription('SUB-doc1-PREMIUM-123456', 'success');

    const updateArg = (Doctor.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg.$set['status.subscription']).toBe('premium');
    expect(updateArg.$set['status.subscriptionStatus']).toBe('active');
    expect(updateArg.$set['status.subscriptionExpiry']).toBeInstanceOf(Date);
  });

  it("laisse 'status.subscription' intact et passe subscriptionStatus à 'failed' en cas d'échec", async () => {
    (Doctor.findOne as any).mockResolvedValue({ _id: 'doc1' });
    (Doctor.findByIdAndUpdate as any).mockResolvedValue(undefined);

    await paymentService.confirmSubscription('SUB-doc1-PREMIUM-123456', 'failed');

    const updateArg = (Doctor.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg.$set['status.subscriptionStatus']).toBe('failed');
    expect(updateArg.$set['status.subscription']).toBeUndefined();
  });
});

// ─── simulateDev ────────────────────────────────────────────────────────────

describe('paymentService.simulateDev', () => {
  it('rejette si le rendez-vous est introuvable', async () => {
    (Appointment.findById as any).mockResolvedValue(null);

    await expect(paymentService.simulateDev('apt1', 'pat1', 'success')).rejects.toThrow(
      'Rendez-vous introuvable.'
    );
  });

  it('rejette si le patientId ne correspond pas', async () => {
    (Appointment.findById as any).mockResolvedValue({ patientId: 'pat-autre' });

    await expect(paymentService.simulateDev('apt1', 'pat1', 'success')).rejects.toThrow(
      'Action non autorisée.'
    );
  });

  it('simule un paiement réussi', async () => {
    (Appointment.findById as any).mockResolvedValue({ patientId: 'pat1' });
    (Appointment.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await paymentService.simulateDev('apt1', 'pat1', 'success');

    expect(result.status).toBe('paid');
  });

  it('simule un échec de paiement', async () => {
    (Appointment.findById as any).mockResolvedValue({ patientId: 'pat1' });
    (Appointment.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await paymentService.simulateDev('apt1', 'pat1', 'failure');

    expect(result.status).toBe('failed');
  });
});

// ─── getStatus ──────────────────────────────────────────────────────────────

describe('paymentService.getStatus', () => {
  it('rejette si le rendez-vous est introuvable', async () => {
    (Appointment.findById as any).mockReturnValue({
      select: jest.fn(async () => null),
    });

    await expect(paymentService.getStatus('apt1')).rejects.toThrow('Rendez-vous introuvable.');
  });

  it('retourne le statut de paiement du rendez-vous', async () => {
    (Appointment.findById as any).mockReturnValue({
      select: jest.fn(async () => ({
        status: { paymentStatus: 'paid' },
        payment: {
          transactionId: 'REF-001',
          amount: 5000,
          currency: 'XOF',
          provider: 'orange_money',
          paidAt: new Date('2026-08-01'),
        },
      })),
    });

    const result = await paymentService.getStatus('apt1');

    expect(result.paymentStatus).toBe('paid');
    expect(result.transactionId).toBe('REF-001');
    expect(result.amount).toBe(5000);
  });
});