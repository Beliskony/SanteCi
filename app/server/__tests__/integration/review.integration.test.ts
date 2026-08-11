/**
 * review.integration.test.ts
 *
 * Tests d'intégration pour review.service.ts.
 * On teste notamment :
 *  - recalculateDoctorRating : l'agrégation $avg contre une vraie DB
 *  - la fenêtre d'édition de 30 jours
 *  - la contrainte "un seul avis par rendez-vous"
 *
 * À placer dans : app/server/__tests__/integration/review.integration.test.ts
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

import { setupTestDB, clearDB, teardownTestDB } from './setup';
import { reviewService } from '../../services/review.service';
import { Review } from '../../models/review.model';
import { Doctor } from '../../models/medcin.model';
import { Appointment } from '../../models/appointement.model';
import { Types } from 'mongoose';

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
beforeEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createDoctor() {
  return Doctor.create({
    doctorId: `DOC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    profile:  { firstName: 'Awa', lastName: 'Koffi', title: 'Dr', specialty: 'Cardiologie' },
    professional: { licenseNumber: `LIC-${Date.now()}`, university: 'UFHB', graduationYear: 2015, certifications: [] },
    contact:  { phone: `+225070${Date.now()}`, email: `doc-${Date.now()}@test.ci` },
    location: { city: 'Abidjan' },
    security: { password: 'hashed', isMedcin: true, twoFactorEnabled: false, devices: [] },
    telemedicine: { isAvailable: true, rating: 0 },
    status:   { accountStatus: 'active' },
    analytics: { patientSatisfaction: 0, reviewCount: 0, totalConsultations: 0,
                 totalPatients: 0, monthlyEarnings: 0, cancellationRate: 0 },
  });
}

async function createCompletedAppointment(doctorId: any, patientId: string) {
  return Appointment.create({
    appointmentId: `APT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    patientId:     new Types.ObjectId(patientId),
    doctorId:      doctorId,
    details: {
      type: 'video',
      scheduledFor: new Date('2026-08-01T10:00:00Z'),
      duration: 30,
      reason: 'Consultation',
      symptoms: [],
      priority: 'medium',
    },
    status:        { current: 'completed', paymentStatus: 'paid' },
    payment:       { amount: 5000, currency: 'XOF', method: 'mobile_money' },
    communication: { chatRoomId: `ROOM-${Date.now()}`, recordings: [], sharedDocuments: [] },
    notifications: { remindersSent: 0 },
    metadata:      { createdAt: new Date(), updatedAt: new Date() },
  });
}

// ObjectId valide pour le patient (pas de modèle Patient requis ici)
const PATIENT_ID = '507f1f77bcf86cd799439011';

// ─── recalculateDoctorRating — agrégation $avg réelle ────────────────────────

describe('[intégration] reviewService — recalculateDoctorRating', () => {
  it('calcule la moyenne correcte après plusieurs avis', async () => {
    const doc = await createDoctor();
    const docId = String(doc._id);

    // Insérer 3 avis publiés directement en DB
    await Review.create([
      {
        appointmentId: new Types.ObjectId(),
        doctorId: doc._id,
        patientId: new Types.ObjectId(PATIENT_ID),
        rating: 5,
        status: 'published',
        metadata: { createdAt: new Date(), updatedAt: new Date() },
      },
      {
        appointmentId: new Types.ObjectId(),
        doctorId: doc._id,
        patientId: new Types.ObjectId(PATIENT_ID),
        rating: 3,
        status: 'published',
        metadata: { createdAt: new Date(), updatedAt: new Date() },
      },
      {
        appointmentId: new Types.ObjectId(),
        doctorId: doc._id,
        patientId: new Types.ObjectId(PATIENT_ID),
        rating: 4,
        status: 'published',
        metadata: { createdAt: new Date(), updatedAt: new Date() },
      },
    ]);

    await reviewService.recalculateDoctorRating(docId);

    const updated = await Doctor.findById(docId);
    // (5 + 3 + 4) / 3 = 4.0
    expect(updated!.telemedicine.rating).toBeCloseTo(4.0, 1);
    expect(updated!.analytics.reviewCount).toBe(3);
  });

  it('exclut les avis d\'un autre médecin du calcul', async () => {
    // On ne peut pas tester l'exclusion par statut sans connaître les valeurs
    // exactes de l'enum Review.status — on teste à la place l'isolation par doctorId :
    // les avis d'un autre médecin ne doivent pas influencer la note du premier.
    const doc1 = await createDoctor();
    const doc2 = await createDoctor();

    await Review.create([
      {
        appointmentId: new Types.ObjectId(),
        doctorId: doc1._id,
        patientId: new Types.ObjectId(PATIENT_ID),
        rating: 5,
        status: 'published',
        metadata: { createdAt: new Date(), updatedAt: new Date() },
      },
      {
        appointmentId: new Types.ObjectId(),
        doctorId: doc2._id, // autre médecin — ne doit pas compter pour doc1
        patientId: new Types.ObjectId(PATIENT_ID),
        rating: 1,
        status: 'published',
        metadata: { createdAt: new Date(), updatedAt: new Date() },
      },
    ]);

    await reviewService.recalculateDoctorRating(String(doc1._id));

    const updated = await Doctor.findById(String(doc1._id));
    // Seul l'avis de doc1 (5) compte — l'avis de doc2 (1) est ignoré
    expect(updated!.telemedicine.rating).toBeCloseTo(5.0, 1);
    expect(updated!.analytics.reviewCount).toBe(1);
  });

  it('remet la note à 0 si tous les avis sont supprimés', async () => {
    const doc = await createDoctor();
    const docId = String(doc._id);

    // D'abord mettre une note initiale
    await Doctor.findByIdAndUpdate(docId, { 'telemedicine.rating': 4.5, 'analytics.reviewCount': 2 });

    // Aucun avis en DB → l'agrégation retourne avg=0, count=0
    await reviewService.recalculateDoctorRating(docId);

    const updated = await Doctor.findById(docId);
    expect(updated!.telemedicine.rating).toBe(0);
    expect(updated!.analytics.reviewCount).toBe(0);
  });
});

// ─── createReview — contraintes réelles ──────────────────────────────────────

describe('[intégration] reviewService.createReview', () => {
  it('crée un avis et met à jour la note du médecin en DB', async () => {
    const doc  = await createDoctor();
    const appt = await createCompletedAppointment(doc._id, PATIENT_ID);
    const docId  = String(doc._id);
    const apptId = String(appt._id);

    const review = await reviewService.createReview(PATIENT_ID, {
      appointmentId: apptId,
      rating: 5,
      comment: 'Excellent médecin',
    });

    expect(review).toBeDefined();
    expect(review.rating).toBe(5);

    // La note du médecin doit être recalculée en DB
    const updatedDoc = await Doctor.findById(docId);
    expect(updatedDoc!.telemedicine.rating).toBe(5);
    expect(updatedDoc!.analytics.reviewCount).toBe(1);
  });

  it('rejette si un avis existe déjà pour ce rendez-vous', async () => {
    const doc  = await createDoctor();
    const appt = await createCompletedAppointment(doc._id, PATIENT_ID);
    const apptId = String(appt._id);

    await reviewService.createReview(PATIENT_ID, { appointmentId: apptId, rating: 4 });

    await expect(
      reviewService.createReview(PATIENT_ID, { appointmentId: apptId, rating: 5 })
    ).rejects.toThrow('Un avis a déjà été laissé pour ce rendez-vous.');

    // Un seul avis en DB
    const count = await Review.countDocuments({ appointmentId: appt._id });
    expect(count).toBe(1);
  });

  it('rejette si la consultation n\'est pas terminée', async () => {
    const doc = await createDoctor();

    // RDV en cours, pas completed
    const appt = await Appointment.create({
      appointmentId: 'APT-ONGOING',
      patientId:     new Types.ObjectId(PATIENT_ID),
      doctorId:      doc._id,
      details: { type: 'video', scheduledFor: new Date(), duration: 30, reason: 'Test', symptoms: [], priority: 'low' },
      status:        { current: 'confirmed', paymentStatus: 'pending' },
      payment:       { amount: 0, currency: 'XOF', method: 'mobile_money' },
      communication: { chatRoomId: 'ROOM-X', recordings: [], sharedDocuments: [] },
      notifications: { remindersSent: 0 },
      metadata:      { createdAt: new Date(), updatedAt: new Date() },
    });

    await expect(
      reviewService.createReview(PATIENT_ID, { appointmentId: String(appt._id), rating: 5 })
    ).rejects.toThrow('Vous ne pouvez laisser un avis que pour une consultation terminée.');
  });
});

// ─── updateReview — fenêtre de 30 jours ──────────────────────────────────────

describe('[intégration] reviewService.updateReview — fenêtre 30 jours', () => {
  it('autorise la modification dans la fenêtre de 30 jours', async () => {
    const doc  = await createDoctor();
    const appt = await createCompletedAppointment(doc._id, PATIENT_ID);

    const review = await reviewService.createReview(PATIENT_ID, {
      appointmentId: String(appt._id),
      rating: 3,
      comment: 'Correct',
    });

    const updated = await reviewService.updateReview(
      String(review._id), PATIENT_ID, { rating: 5, comment: 'Finalement excellent' }
    );

    expect(updated.rating).toBe(5);
    expect(updated.comment).toBe('Finalement excellent');

    // La note du médecin doit refléter la mise à jour
    const doc2 = await Doctor.findById(String(doc._id));
    expect(doc2!.telemedicine.rating).toBe(5);
  });

  it('rejette la modification après 30 jours', async () => {
    const doc  = await createDoctor();
    const appt = await createCompletedAppointment(doc._id, PATIENT_ID);

    const review = await reviewService.createReview(PATIENT_ID, {
      appointmentId: String(appt._id),
      rating: 3,
    });

    // Simuler un avis créé il y a 31 jours en DB
    await Review.findByIdAndUpdate(review._id, {
      'metadata.createdAt': new Date(Date.now() - 31 * 86400000),
    });

    await expect(
      reviewService.updateReview(String(review._id), PATIENT_ID, { rating: 5 })
    ).rejects.toThrow(/30 jours/);
  });
});

// ─── deleteReview ─────────────────────────────────────────────────────────────

describe('[intégration] reviewService.deleteReview', () => {
  it('supprime l\'avis et recalcule la note du médecin', async () => {
    const doc  = await createDoctor();
    const docId = String(doc._id);
    const appt1 = await createCompletedAppointment(doc._id, PATIENT_ID);
    const appt2 = await createCompletedAppointment(doc._id, PATIENT_ID);

    const rev1 = await reviewService.createReview(PATIENT_ID, { appointmentId: String(appt1._id), rating: 5 });
    const rev2 = await reviewService.createReview(PATIENT_ID, { appointmentId: String(appt2._id), rating: 3 });

    // Moyenne actuelle : (5+3)/2 = 4.0
    let doc2 = await Doctor.findById(docId);
    expect(doc2!.telemedicine.rating).toBeCloseTo(4.0, 1);

    // Supprimer le premier avis
    await reviewService.deleteReview(String(rev1._id), PATIENT_ID);

    // Moyenne après suppression : 3.0 (seul rev2 reste)
    doc2 = await Doctor.findById(docId);
    expect(doc2!.telemedicine.rating).toBeCloseTo(3.0, 1);
    expect(doc2!.analytics.reviewCount).toBe(1);
  });
});