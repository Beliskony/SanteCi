 /* payment.integration.test.ts
 *
 * Tests d'intégration pour payment.service.ts.
 * On teste notamment :
 *  - La confirmation webhook qui cherche un RDV par transactionId réel en DB
 *  - Les transitions de paymentStatus persistées en DB
 *  - La gestion des abonnements médecin (confirm succès/échec)
 *
 * À placer dans : app/server/__tests__/integration/payment.integration.test.ts
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Types } from 'mongoose';

import { setupTestDB, clearDB, teardownTestDB } from './setup';
import { paymentService } from '../../services/payment.service';
import { Appointment } from '../../models/appointement.model';
import { Doctor } from '../../models/medcin.model';

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
beforeEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createDoctor() {
  return Doctor.create({
    doctorId: `DOC-${Date.now()}`,
    profile:  { firstName: 'Awa', lastName: 'Koffi', title: 'Dr', specialty: 'Cardiologie' },
    professional: { licenseNumber: `LIC-${Date.now()}`, university: 'UFHB', graduationYear: 2015, certifications: [] },
    contact:  { phone: `+22507${Date.now()}`, email: `doc-${Date.now()}@test.ci` },
    location: { city: 'Abidjan' },
    security: { password: 'hashed', isMedcin: true, twoFactorEnabled: false, devices: [] },
    telemedicine: { isAvailable: true },
    status:   { accountStatus: 'active', subscription: 'free' },
    analytics: { patientSatisfaction: 0, reviewCount: 0, totalConsultations: 0,
                 totalPatients: 0, monthlyEarnings: 0, cancellationRate: 0 },
  });
}

async function createAppointment(patientId: string, doctorId: any, paymentStatus = 'pending', currentStatus = 'confirmed') {
  return Appointment.create({
    appointmentId: `APT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    patientId:     new Types.ObjectId(patientId),
    doctorId:      doctorId,
    details: {
      type: 'video',
      scheduledFor: new Date('2026-09-01T10:00:00Z'),
      duration: 30,
      reason: 'Test',
      symptoms: [],
      priority: 'medium',
    },
    status:        { current: currentStatus, paymentStatus },
    payment:       { amount: 5000, currency: 'XOF', method: 'mobile_money' },
    communication: { chatRoomId: `ROOM-${Date.now()}`, recordings: [], sharedDocuments: [] },
    notifications: { remindersSent: 0 },
    metadata:      { createdAt: new Date(), updatedAt: new Date() },
  });
}

const PATIENT_ID = '507f1f77bcf86cd799439011';

// ─── initiate ────────────────────────────────────────────────────────────────

describe('[intégration] paymentService.initiate', () => {
  it('initie le paiement et met à jour le statut en DB', async () => {
    const doc  = await createDoctor();
    const appt = await createAppointment(PATIENT_ID, doc._id);
    const apptId = String(appt._id);

    const result = await paymentService.initiate({
      appointmentId:   apptId,
      patientId:       PATIENT_ID,
      amount:          5000,
      currency:        'XOF',
      channel:         'ORANGE_MONEY',
      referenceNumber: 'REF-TEST-001',
    });

    expect(result.status).toBe('pending');
    expect(result.type).toBe('consultation');

    const inDb = await Appointment.findById(apptId);
    expect(inDb!.status.paymentStatus).toBe('pending');
    expect(inDb!.payment.transactionId).toBe('REF-TEST-001');
    expect(inDb!.payment.amount).toBe(5000);
  });

  it('rejette si le RDV est déjà payé', async () => {
    const doc  = await createDoctor();
    const appt = await createAppointment(PATIENT_ID, doc._id, 'paid');

    await expect(
      paymentService.initiate({
        appointmentId:   String(appt._id),
        patientId:       PATIENT_ID,
        amount:          5000,
        currency:        'XOF',
        channel:         'WAVE',
        referenceNumber: 'REF-TEST-002',
      })
    ).rejects.toThrow('Ce rendez-vous est déjà payé.');
  });

  it('rejette si le RDV est annulé', async () => {
    const doc  = await createDoctor();
    const appt = await createAppointment(PATIENT_ID, doc._id, 'pending', 'cancelled');

    await expect(
      paymentService.initiate({
        appointmentId:   String(appt._id),
        patientId:       PATIENT_ID,
        amount:          5000,
        currency:        'XOF',
        channel:         'WAVE',
        referenceNumber: 'REF-TEST-003',
      })
    ).rejects.toThrow('Impossible de payer un rendez-vous au statut "cancelled".');
  });
});

// ─── confirm (webhook) ────────────────────────────────────────────────────────

describe('[intégration] paymentService.confirm — webhook', () => {
  it('marque le paiement comme "paid" et enregistre paidAt en DB', async () => {
    const doc  = await createDoctor();
    const appt = await createAppointment(PATIENT_ID, doc._id);
    const apptId = String(appt._id);

    // Initier d'abord pour poser le transactionId en DB
    await paymentService.initiate({
      appointmentId:   apptId,
      patientId:       PATIENT_ID,
      amount:          5000,
      currency:        'XOF',
      channel:         'ORANGE_MONEY',
      referenceNumber: 'REF-WEBHOOK-001',
    });

    // Simuler le webhook de succès
    await paymentService.confirm('REF-WEBHOOK-001', 'success');

    const inDb = await Appointment.findById(apptId);
    expect(inDb!.status.paymentStatus).toBe('paid');
    expect(inDb!.payment.paidAt).toBeInstanceOf(Date);
  });

  it('marque le paiement comme "failed" sans paidAt en cas d\'échec', async () => {
    const doc  = await createDoctor();
    const appt = await createAppointment(PATIENT_ID, doc._id);
    const apptId = String(appt._id);

    await paymentService.initiate({
      appointmentId:   apptId,
      patientId:       PATIENT_ID,
      amount:          5000,
      currency:        'XOF',
      channel:         'WAVE',
      referenceNumber: 'REF-WEBHOOK-002',
    });

    await paymentService.confirm('REF-WEBHOOK-002', 'failed');

    const inDb = await Appointment.findById(apptId);
    expect(inDb!.status.paymentStatus).toBe('failed');
    expect(inDb!.payment.paidAt).toBeUndefined();
  });

  it('rejette si la référence ne correspond à aucun RDV', async () => {
    await expect(
      paymentService.confirm('REF-INEXISTANTE', 'success')
    ).rejects.toThrow('Rendez-vous introuvable pour cette référence.');
  });
});

// ─── initiateSubscription + confirmSubscription ───────────────────────────────

describe('[intégration] paymentService — abonnement médecin', () => {
  it('initie l\'abonnement premium et fixe l\'expiration à +1 mois', async () => {
    const doc   = await createDoctor();
    const docId = String(doc._id);

    await paymentService.initiateSubscription({
      doctorId:        docId,
      plan:            'premium',
      amount:          10000,
      currency:        'XOF',
      channel:         'ORANGE_MONEY',
      referenceNumber: 'REF-SUB-001',
    });

    const inDb = await Doctor.findById(docId);
    expect(inDb!.status.subscription).toBe('premium');

    // La date d'expiration doit être dans environ 1 mois
    const expiry = inDb!.status.subscriptionExpiry!;
    expect(expiry).toBeInstanceOf(Date);
    const diffMs = expiry.getTime() - Date.now();
    const diffDays = diffMs / 86400000;
    expect(diffDays).toBeGreaterThan(27); // au moins 27 jours dans le futur
    expect(diffDays).toBeLessThan(33);    // au plus 33 jours
  });

  it('confirmSubscription succès → subscription active en DB', async () => {
    const doc   = await createDoctor();
    const docId = String(doc._id);

    await paymentService.initiateSubscription({
      doctorId:        docId,
      plan:            'elite',
      amount:          20000,
      currency:        'XOF',
      channel:         'WAVE',
      referenceNumber: 'REF-SUB-002',
    });

    await paymentService.confirmSubscription('REF-SUB-002', 'success');

    const inDb = await Doctor.findById(docId);
    expect(inDb!.status.subscriptionStatus).toBe('active');
    expect(inDb!.status.subscriptionExpiry).toBeInstanceOf(Date);
  });

  it('confirmSubscription échec → repasse en "free" en DB', async () => {
    const doc   = await createDoctor();
    const docId = String(doc._id);

    await paymentService.initiateSubscription({
      doctorId:        docId,
      plan:            'premium',
      amount:          10000,
      currency:        'XOF',
      channel:         'MTN',
      referenceNumber: 'REF-SUB-003',
    });

    await paymentService.confirmSubscription('REF-SUB-003', 'failed');

    const inDb = await Doctor.findById(docId);
    expect(inDb!.status.subscription).toBe('free');
    expect(inDb!.status.subscriptionStatus).toBe('failed');
  });
});

// ─── getStatus ────────────────────────────────────────────────────────────────

describe('[intégration] paymentService.getStatus', () => {
  it('retourne le statut de paiement réel depuis la DB', async () => {
    const doc  = await createDoctor();
    const appt = await createAppointment(PATIENT_ID, doc._id, 'paid');
    await Appointment.findByIdAndUpdate(appt._id, {
      'payment.transactionId': 'REF-STATUS-001',
      'payment.paidAt':        new Date('2026-08-01T12:00:00Z'),
    });

    const status = await paymentService.getStatus(String(appt._id));

    expect(status.paymentStatus).toBe('paid');
    expect(status.transactionId).toBe('REF-STATUS-001');
    expect(status.amount).toBe(5000);
    expect(status.currency).toBe('XOF');
  });
});
