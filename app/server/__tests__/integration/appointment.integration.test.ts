/**
 * appointment.integration.test.ts
 *
 * Tests d'intégration pour appointment.service.ts.
 * MongoDB en mémoire réelle — on teste notamment la détection de conflit
 * de créneaux ($expr/$add/$multiply) qui est invisible en tests unitaires.
 *
 * À placer dans : app/server/__tests__/integration/appointment.integration.test.ts
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// ── Mocks des services externes ───────────────────────────────────────────
jest.mock('../../services/notification.service', () => ({
  notificationService: {
    notifySystem: jest.fn(async () => undefined),
    notifyAppointmentConfirmed: jest.fn(async () => undefined),
    notifyAppointmentCancelled: jest.fn(async () => undefined),
    notifyAppointmentReminder: jest.fn(async () => undefined),
    notifyPaymentReceived: jest.fn(async () => undefined),
  },
}));

import { setupTestDB, clearDB, teardownTestDB } from './setup';
import { appointmentService } from '../../services/appointement.service';
import { Appointment } from '../../models/appointement.model';
import { Doctor } from '../../models/medcin.model';
import { Patient } from '../../models/patient.model';

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
beforeEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createActiveDoctor() {
  const doc = await Doctor.create({
    doctorId: 'DOC-TEST-001',
    profile: { firstName: 'Awa', lastName: 'Koffi', title: 'Dr', specialty: 'Cardiologie' },
    professional: { licenseNumber: 'LIC-001', university: 'UFHB', graduationYear: 2015, certifications: [] },
    contact: { phone: '+2250700000001', email: 'awa@test.ci' },
    location: { city: 'Abidjan' },
    security: { password: 'hashed', isMedcin: true, twoFactorEnabled: false, devices: [] },
    telemedicine: { isAvailable: true },
    status: { accountStatus: 'active' },
  });
  return doc;
}

async function createActivePatient() {
  const pat = await Patient.create({
    patientId: 'PAT-TEST-001',
    profile: { firstName: 'Yao', lastName: 'Brou', dateOfBirth: new Date('1995-01-01'), gender: 'male' },
    contact: { phone: '+2250711111111', email: 'yao@test.ci', emergencyContacts: [] },
    location: { city: 'Abidjan' },
    security: { password: 'hashed', isPatient: true, isActive: true, failedAttempts: 0 },
    status: { accountStatus: 'active', isVerified: false },
    health: { allergies: [], chronicDiseases: [], currentMedications: [], disabilities: [] },
  });
  return pat;
}

function makeDto(doctor: any, patient: any, scheduledFor: Date, duration = 30) {
  return {
    patientId:    String(patient._id),
    doctorId:     String(doctor._id),
    type:         'video' as const,
    scheduledFor,
    duration,
    reason:       'Douleur au dos',
    priority:     'medium' as const,
    payment:      { amount: 5000, currency: 'XOF' as const, method: 'mobile_money' as const },
  };
}

// ─── create — détection de conflit réelle ────────────────────────────────────

describe('[intégration] appointmentService.create — conflits de créneaux', () => {
  it('crée le premier rendez-vous sans conflit', async () => {
    const doc = await createActiveDoctor();
    const pat = await createActivePatient();
    const dto = makeDto(doc, pat, new Date('2026-09-01T10:00:00Z'));

    const result = await appointmentService.create(dto);

    expect(result).toBeDefined();
    const count = await Appointment.countDocuments();
    expect(count).toBe(1);
  });

  it('rejette un rendez-vous exactement au même créneau', async () => {
    const doc = await createActiveDoctor();
    const pat = await createActivePatient();
    const slot = new Date('2026-09-01T10:00:00Z');
    const dto  = makeDto(doc, pat, slot);

    await appointmentService.create(dto);

    await expect(appointmentService.create(dto)).rejects.toThrow(
      'Ce créneau est déjà réservé pour ce médecin.'
    );
    const count = await Appointment.countDocuments();
    expect(count).toBe(1);
  });

  it('rejette un rendez-vous qui chevauche partiellement (démarre pendant le premier)', async () => {
    const doc = await createActiveDoctor();
    const pat = await createActivePatient();

    // Premier RDV : 10h00 → 10h30
    await appointmentService.create(makeDto(doc, pat, new Date('2026-09-01T10:00:00Z'), 30));

    // Deuxième RDV démarre à 10h15 (pendant le premier) : 10h15 → 10h45 → conflit
    await expect(
      appointmentService.create(makeDto(doc, pat, new Date('2026-09-01T10:15:00Z'), 30))
    ).rejects.toThrow('Ce créneau est déjà réservé pour ce médecin.');
  });

  it('rejette un rendez-vous qui englobe complètement le premier', async () => {
    const doc = await createActiveDoctor();
    const pat = await createActivePatient();

    // Premier RDV : 10h00 → 10h30
    await appointmentService.create(makeDto(doc, pat, new Date('2026-09-01T10:00:00Z'), 30));

    // Deuxième RDV : 09h45 → 11h00 (englobe le premier) → conflit
    await expect(
      appointmentService.create(makeDto(doc, pat, new Date('2026-09-01T09:45:00Z'), 75))
    ).rejects.toThrow('Ce créneau est déjà réservé pour ce médecin.');
  });

  it('accepte un rendez-vous qui commence exactement à la fin du précédent', async () => {
    const doc = await createActiveDoctor();
    const pat = await createActivePatient();

    // Premier RDV : 10h00 → 10h30
    await appointmentService.create(makeDto(doc, pat, new Date('2026-09-01T10:00:00Z'), 30));

    // Deuxième RDV : 10h30 → 11h00 — doit être accepté (pas de chevauchement)
    const result = await appointmentService.create(
      makeDto(doc, pat, new Date('2026-09-01T10:30:00Z'), 30)
    );

    expect(result).toBeDefined();
    const count = await Appointment.countDocuments();
    expect(count).toBe(2);
  });

  it('accepte un rendez-vous pour un autre médecin au même créneau', async () => {
    const doc1 = await createActiveDoctor();
    const doc2 = await Doctor.create({
      doctorId: 'DOC-TEST-002',
      profile: { firstName: 'Brou', lastName: 'Aya', title: 'Dr', specialty: 'Pédiatrie' },
      professional: { licenseNumber: 'LIC-002', university: 'UFHB', graduationYear: 2018, certifications: [] },
      contact: { phone: '+2250700000002', email: 'brou@test.ci' },
      location: { city: 'Abidjan' },
      security: { password: 'hashed', isMedcin: true, twoFactorEnabled: false, devices: [] },
      telemedicine: { isAvailable: true },
      status: { accountStatus: 'active' },
    });
    const pat = await createActivePatient();
    const slot = new Date('2026-09-01T10:00:00Z');

    await appointmentService.create(makeDto(doc1, pat, slot));
    // Même créneau mais médecin différent → pas de conflit
    const result = await appointmentService.create(makeDto(doc2, pat, slot));

    expect(result).toBeDefined();
    const count = await Appointment.countDocuments();
    expect(count).toBe(2);
  });

  it('ignore les rendez-vous annulés pour la détection de conflit', async () => {
    const doc = await createActiveDoctor();
    const pat = await createActivePatient();
    const slot = new Date('2026-09-01T10:00:00Z');

    // Créer puis annuler un RDV sur ce créneau
    const first = await appointmentService.create(makeDto(doc, pat, slot));
    await appointmentService.cancel(
      String(first._id), 'patient', 'Empêchement', String(pat._id)
    );

    // Le même créneau doit être disponible maintenant
    const result = await appointmentService.create(makeDto(doc, pat, slot));
    expect(result).toBeDefined();
  });
});

// ─── Transitions de statut réelles ───────────────────────────────────────────

describe('[intégration] appointmentService — cycle de vie complet', () => {
  it('confirm → startConsultation → endConsultation persiste les statuts en DB', async () => {
    const doc = await createActiveDoctor();
    const pat = await createActivePatient();
    const appt = await appointmentService.create(
      makeDto(doc, pat, new Date('2026-09-01T10:00:00Z'))
    );
    const apptId = String(appt._id);
    const docId  = String(doc._id);

    // Confirmer
    await appointmentService.confirm(apptId, docId);
    let inDb = await Appointment.findById(apptId);
    expect(inDb!.status.current).toBe('confirmed');

    // Démarrer
    await appointmentService.startConsultation(apptId, docId);
    inDb = await Appointment.findById(apptId);
    expect(inDb!.status.current).toBe('ongoing');
    expect(inDb!.consultation.startedAt).toBeInstanceOf(Date);

    // Terminer
    await appointmentService.endConsultation(apptId, docId, {
      notes: 'RAS',
      diagnosis: 'Lombalgie',
    });
    inDb = await Appointment.findById(apptId);
    expect(inDb!.status.current).toBe('completed');
    expect(inDb!.consultation.actualDuration).toBeGreaterThanOrEqual(0);
    expect(inDb!.consultation.notes).toBe('RAS');
    expect(inDb!.consultation.diagnosis).toBe('Lombalgie');
  });

  it('cancel persiste le remboursement si le RDV était payé', async () => {
    const doc = await createActiveDoctor();
    const pat = await createActivePatient();
    const appt = await appointmentService.create(
      makeDto(doc, pat, new Date('2026-09-01T10:00:00Z'))
    );
    const apptId = String(appt._id);

    // Simuler un paiement direct en DB
    await Appointment.findByIdAndUpdate(apptId, {
      'status.current':       'confirmed',
      'status.paymentStatus': 'paid',
    });

    await appointmentService.cancel(apptId, 'patient', 'Annulation test', String(pat._id));

    const inDb = await Appointment.findById(apptId);
    expect(inDb!.status.current).toBe('cancelled');
    expect(inDb!.status.paymentStatus).toBe('refunded');
    expect(inDb!.status.cancelledBy).toBe('patient');
    expect(inDb!.status.cancellationReason).toBe('Annulation test');
  });
});

// ─── autoMarkMissedAppointments ──────────────────────────────────────────────

describe('[intégration] appointmentService.autoMarkMissedAppointments', () => {
  it('marque en no_show les RDV confirmés dont l\'heure de fin est dépassée', async () => {
    const doc = await createActiveDoctor();
    const pat = await createActivePatient();

    // Insérer directement un RDV "dans le passé" en DB
    await Appointment.create({
      appointmentId: 'APT-PAST-001',
      patientId: pat._id,
      doctorId:  doc._id,
      details: {
        type: 'video',
        scheduledFor: new Date('2026-01-01T10:00:00Z'), // dans le passé
        duration: 30,
        reason: 'Test',
        symptoms: [],
        priority: 'low',
      },
      status: { current: 'confirmed', paymentStatus: 'pending' },
      payment: { amount: 0, currency: 'XOF', method: 'mobile_money' },
      communication: { chatRoomId: 'ROOM-TEST', recordings: [], sharedDocuments: [] },
      notifications: { remindersSent: 0 },
      metadata: { createdAt: new Date(), updatedAt: new Date() },
    });

    const count = await appointmentService.autoMarkMissedAppointments();

    expect(count).toBe(1);
    const inDb = await Appointment.findOne({ appointmentId: 'APT-PAST-001' });
    expect(inDb!.status.current).toBe('no_show');
  });

  it('ne touche pas aux RDV futurs confirmés', async () => {
    const doc = await createActiveDoctor();
    const pat = await createActivePatient();

    await Appointment.create({
      appointmentId: 'APT-FUTURE-001',
      patientId: pat._id,
      doctorId:  doc._id,
      details: {
        type: 'video',
        scheduledFor: new Date('2027-12-31T10:00:00Z'), // dans le futur
        duration: 30,
        reason: 'Test',
        symptoms: [],
        priority: 'low',
      },
      status: { current: 'confirmed', paymentStatus: 'pending' },
      payment: { amount: 0, currency: 'XOF', method: 'mobile_money' },
      communication: { chatRoomId: 'ROOM-FUTURE', recordings: [], sharedDocuments: [] },
      notifications: { remindersSent: 0 },
      metadata: { createdAt: new Date(), updatedAt: new Date() },
    });

    const count = await appointmentService.autoMarkMissedAppointments();

    expect(count).toBe(0);
    const inDb = await Appointment.findOne({ appointmentId: 'APT-FUTURE-001' });
    expect(inDb!.status.current).toBe('confirmed');
  });
});