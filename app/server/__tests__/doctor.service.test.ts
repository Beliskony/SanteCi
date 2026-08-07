/**
 * doctor.service.test.ts
 *
 * Tests unitaires purs : Doctor, Prescription, Appointment, Patient sont mockés.
 * Structure : app/server/services/doctor.service.ts, app/server/models/*.ts,
 * app/server/__tests__/doctor.service.test.ts (ce fichier).
 *
 * Doctor.service.ts est très gros (1072 lignes) — cette suite couvre le
 * cœur métier testable en isolation : profil, disponibilités télémédecine
 * (dédup des créneaux), certifications, abonnement, et tout le cycle des
 * ordonnances (création/modification/suppression) + dossier patient.
 * Non couvert ici (nécessitent des mocks d'agrégation Mongo lourds ou trop
 * d'enrichissement) : searchDoctors, getMyPatients, getDoctorPerformance,
 * updatePhoto, getVerificationStatus.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../models/medcin.model', () => ({
  Doctor: {
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('../models/prescription.model', () => ({
  Prescription: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('../models/appointement.model', () => ({
  Appointment: {
    find: jest.fn(),
  },
}));

jest.mock('../models/patient.model', () => ({
  Patient: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('../services/cloudinary.service', () => ({
  cloudinaryService: {
    uploadProfilePhoto: jest.fn(async () => ({ url: 'https://x/photo.png', publicId: 'x' })),
  },
}));

import { doctorService } from '../services/doctor.service';
import { Doctor } from '../models/medcin.model';
import { Prescription } from '../models/prescription.model';
import { Appointment } from '../models/appointement.model';
import { Patient } from '../models/patient.model';

// ─── Helpers ──────────────────────────────────────────────────────────────

function mockQuery<T>(value: T) {
  const query: any = Promise.resolve(value);
  query.select = jest.fn().mockReturnValue(query);
  query.populate = jest.fn().mockReturnValue(query);
  query.sort = jest.fn().mockReturnValue(query);
  query.skip = jest.fn().mockReturnValue(query);
  query.limit = jest.fn().mockReturnValue(query);
  query.lean = jest.fn().mockReturnValue(Promise.resolve(value));
  return query;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── updateProfile ──────────────────────────────────────────────────────────

describe('doctorService.updateProfile', () => {
  it('rejette si le numéro de téléphone est déjà utilisé par un autre compte', async () => {
    (Doctor.findOne as any).mockResolvedValue({ _id: 'doc-autre' });

    await expect(
      doctorService.updateProfile('doc1', { phone: '+2250700000000' })
    ).rejects.toThrow('Ce numéro est déjà utilisé par un autre compte.');
  });

  it('autorise si le numéro appartient déjà au même médecin', async () => {
    (Doctor.findOne as any).mockResolvedValue({ _id: 'doc1' });
    (Doctor.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'doc1' }));

    const result = await doctorService.updateProfile('doc1', { phone: '+2250700000000' });

    expect(result).toEqual({ _id: 'doc1' });
  });

  it('rejette si le médecin est introuvable après mise à jour', async () => {
    (Doctor.findByIdAndUpdate as any).mockReturnValue(mockQuery(null));

    await expect(
      doctorService.updateProfile('doc1', { firstName: 'Awa' })
    ).rejects.toThrow('Médecin introuvable.');
  });

  it('met à jour uniquement les champs fournis', async () => {
    (Doctor.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'doc1' }));

    await doctorService.updateProfile('doc1', { firstName: 'Awa', bio: 'Cardiologue passionnée' });

    expect(Doctor.findByIdAndUpdate).toHaveBeenCalledWith(
      'doc1',
      { $set: { 'profile.firstName': 'Awa', 'profile.bio': 'Cardiologue passionnée' } },
      expect.objectContaining({ new: true })
    );
  });
});

// ─── updateTelemedicine (dédup des créneaux) ────────────────────────────────

describe('doctorService.updateTelemedicine', () => {
  it('déduplique les créneaux ayant le même horaire de départ pour un même jour', async () => {
    (Doctor.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'doc1' }));

    await doctorService.updateTelemedicine('doc1', {
      availability: [
        {
          day: 'lundi',
          slots: [
            { start: '09:00', end: '09:30' },
            { start: '09:00', end: '10:00' }, // doublon sur "start" → doit être filtré
            { start: '10:00', end: '10:30' },
          ],
        },
      ],
    });

    const updateArg = (Doctor.findByIdAndUpdate as any).mock.calls[0][1];
    const slots = updateArg.$set['telemedicine.availability'][0].slots;
    expect(slots).toHaveLength(2);
    expect(slots.map((s: any) => s.start)).toEqual(['09:00', '10:00']);
  });

  it('rejette si le médecin est introuvable', async () => {
    (Doctor.findByIdAndUpdate as any).mockReturnValue(mockQuery(null));

    await expect(
      doctorService.updateTelemedicine('doc1', { isAvailable: true })
    ).rejects.toThrow('Médecin introuvable.');
  });
});

// ─── addCertification / removeCertification ────────────────────────────────

describe('doctorService.addCertification / removeCertification', () => {
  it('ajoute une certification via $push', async () => {
    (Doctor.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'doc1' }));

    await doctorService.addCertification('doc1', {
      name: 'DES Cardiologie',
      year: 2015,
      issuer: 'UFHB',
    });

    expect(Doctor.findByIdAndUpdate).toHaveBeenCalledWith(
      'doc1',
      { $push: { 'professional.certifications': expect.objectContaining({ name: 'DES Cardiologie' }) } },
      expect.objectContaining({ new: true })
    );
  });

  it('retire une certification via $pull', async () => {
    (Doctor.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'doc1' }));

    await doctorService.removeCertification('doc1', '507f1f77bcf86cd799439011');

    expect(Doctor.findByIdAndUpdate).toHaveBeenCalledWith(
      'doc1',
      { $pull: { 'professional.certifications': { _id: expect.anything() } } },
      expect.objectContaining({ new: true })
    );
  });
});

// ─── updateSubscription ─────────────────────────────────────────────────────

describe('doctorService.updateSubscription', () => {
  it("met à jour l'abonnement sans date d'expiration", async () => {
    (Doctor.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await doctorService.updateSubscription('doc1', 'premium');

    expect(result.message).toContain('premium');
    expect(Doctor.findByIdAndUpdate).toHaveBeenCalledWith('doc1', {
      $set: { 'status.subscription': 'premium' },
    });
  });

  it("inclut la date d'expiration si fournie", async () => {
    (Doctor.findByIdAndUpdate as any).mockResolvedValue(undefined);
    const expiry = new Date('2026-12-31');

    await doctorService.updateSubscription('doc1', 'elite', expiry);

    expect(Doctor.findByIdAndUpdate).toHaveBeenCalledWith('doc1', {
      $set: { 'status.subscription': 'elite', 'status.subscriptionExpiry': expiry },
    });
  });
});

// ─── createPrescription ─────────────────────────────────────────────────────

describe('doctorService.createPrescription', () => {
  const dto = {
    patientId: '507f1f77bcf86cd799439011',
    diagnosis: 'Lombalgie chronique',
    medications: [{ name: 'Ibuprofène', dosage: '400mg', frequency: '3x/jour', duration: '5 jours' }],
  };

  it('rejette si le médecin est introuvable', async () => {
    (Doctor.findById as any).mockReturnValue(mockQuery(null));

    await expect(doctorService.createPrescription('507f1f77bcf86cd799439012', dto as any)).rejects.toThrow(
      'Médecin introuvable.'
    );
  });

  it('rejette si le compte médecin est inactif', async () => {
    (Doctor.findById as any).mockReturnValue(mockQuery({ status: { accountStatus: 'suspended' } }));

    await expect(doctorService.createPrescription('507f1f77bcf86cd799439012', dto as any)).rejects.toThrow(
      'Compte médecin inactif.'
    );
  });

  it('rejette si le patient est introuvable', async () => {
    (Doctor.findById as any).mockReturnValue(mockQuery({ status: { accountStatus: 'active' } }));
    (Patient.findById as any).mockReturnValue(mockQuery(null));

    await expect(doctorService.createPrescription('507f1f77bcf86cd799439012', dto as any)).rejects.toThrow(
      'Patient introuvable.'
    );
  });

  it('rejette si le compte patient est inactif', async () => {
    (Doctor.findById as any).mockReturnValue(mockQuery({ status: { accountStatus: 'active' } }));
    (Patient.findById as any).mockReturnValue(mockQuery({ status: { accountStatus: 'suspended' } }));

    await expect(doctorService.createPrescription('507f1f77bcf86cd799439012', dto as any)).rejects.toThrow(
      'Compte patient inactif.'
    );
  });

  it('crée l\'ordonnance et pousse la référence dans le dossier patient', async () => {
    (Doctor.findById as any).mockReturnValue(mockQuery({ status: { accountStatus: 'active' } }));
    (Patient.findById as any).mockReturnValue(mockQuery({ status: { accountStatus: 'active' } }));

    const created = { _id: 'presc1', prescriptionId: 'PRX-ABC123' };
    (Prescription.create as any).mockResolvedValue(created);
    (Patient.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await doctorService.createPrescription('507f1f77bcf86cd799439012', dto as any);

    expect(result).toBe(created);
    expect(Prescription.create).toHaveBeenCalledWith(
      expect.objectContaining({ diagnosis: 'Lombalgie chronique' })
    );
    expect(Patient.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.objectContaining({ $inc: { 'metadata.totalPrescriptions': 1 } })
    );
  });
});

// ─── updatePrescription ─────────────────────────────────────────────────────

describe('doctorService.updatePrescription', () => {
  it("rejette si l'ordonnance est introuvable", async () => {
    (Prescription.findById as any).mockResolvedValue(null);

    await expect(
      doctorService.updatePrescription('presc1', 'doc1', {})
    ).rejects.toThrow('Ordonnance introuvable.');
  });

  it("rejette si le médecin n'est pas l'auteur de l'ordonnance", async () => {
    (Prescription.findById as any).mockResolvedValue({ doctorId: 'doc-autre', status: 'active' });

    await expect(
      doctorService.updatePrescription('presc1', 'doc1', {})
    ).rejects.toThrow('Action non autorisée.');
  });

  it('rejette si l\'ordonnance est déjà annulée ou complétée', async () => {
    (Prescription.findById as any).mockResolvedValue({ doctorId: 'doc1', status: 'completed' });

    await expect(
      doctorService.updatePrescription('presc1', 'doc1', { notes: 'x' })
    ).rejects.toThrow('Impossible de modifier une ordonnance au statut "completed".');
  });

  it('recalcule expiresAt et le statut quand validityDays change', async () => {
    (Prescription.findById as any).mockResolvedValue({
      doctorId: 'doc1',
      status: 'active',
      date: new Date('2020-01-01'), // ancienne → +5 jours reste largement expiré
      patientId: '507f1f77bcf86cd799439011',
      _id: '507f1f77bcf86cd799439010',
    });
    (Patient.findOneAndUpdate as any).mockResolvedValue(undefined);
    (Prescription.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'presc1' }));

    await doctorService.updatePrescription('presc1', 'doc1', { validityDays: 5 });

    const updateArg = (Prescription.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg.$set.status).toBe('expired');
    expect(Patient.findOneAndUpdate).toHaveBeenCalled();
  });
});

// ─── deletePrescription ─────────────────────────────────────────────────────

describe('doctorService.deletePrescription', () => {
  it("rejette si l'ordonnance est introuvable", async () => {
    (Prescription.findById as any).mockResolvedValue(null);

    await expect(doctorService.deletePrescription('presc1', 'doc1')).rejects.toThrow(
      'Ordonnance introuvable.'
    );
  });

  it("rejette si le médecin n'est pas l'auteur", async () => {
    (Prescription.findById as any).mockResolvedValue({
      doctorId: 'doc-autre',
      sharing: { patientAcknowledged: false },
    });

    await expect(doctorService.deletePrescription('presc1', 'doc1')).rejects.toThrow(
      'Action non autorisée.'
    );
  });

  it('rejette si le patient a déjà accusé réception', async () => {
    (Prescription.findById as any).mockResolvedValue({
      doctorId: 'doc1',
      sharing: { patientAcknowledged: true },
    });

    await expect(doctorService.deletePrescription('presc1', 'doc1')).rejects.toThrow(
      'Impossible de supprimer une ordonnance déjà reçue par le patient.'
    );
  });

  it('supprime l\'ordonnance et met à jour le dossier patient', async () => {
    (Prescription.findById as any).mockResolvedValue({
      _id: 'presc1',
      doctorId: 'doc1',
      patientId: '507f1f77bcf86cd799439011',
      sharing: { patientAcknowledged: false },
    });
    (Prescription.findByIdAndDelete as any).mockResolvedValue(undefined);
    (Patient.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await doctorService.deletePrescription('presc1', 'doc1');

    expect(result.message).toMatch(/supprimée/);
    expect(Patient.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.objectContaining({ $inc: { 'metadata.totalPrescriptions': -1 } })
    );
  });
});

// ─── getPatientDossier ───────────────────────────────────────────────────────

describe('doctorService.getPatientDossier', () => {
  it('rejette si le patient est introuvable', async () => {
    (Patient.findById as any).mockReturnValue(mockQuery(null));

    await expect(doctorService.getPatientDossier('507f1f77bcf86cd799439012', '507f1f77bcf86cd799439011')).rejects.toThrow(
      'Patient introuvable.'
    );
  });

  it('assemble le dossier avec consultations et ordonnances', async () => {
    (Patient.findById as any).mockReturnValue(
      mockQuery({
        profile: { firstName: 'Yao', lastName: 'Brou', dateOfBirth: new Date('1995-01-01'), gender: 'male' },
        contact: { phone: '+2250700000000' },
        health: { allergies: ['pollen'] },
        metadata: { createdAt: new Date('2024-01-01') },
      })
    );
    (Appointment.find as any).mockReturnValue(
      mockQuery([
        {
          _id: 'apt1',
          details: { type: 'video', scheduledFor: new Date(), reason: 'Douleur' },
          status: { current: 'completed' },
          consultation: { diagnosis: 'Lombalgie', notes: 'RAS' },
        },
      ])
    );
    (Prescription.find as any).mockReturnValue(
      mockQuery([{ _id: 'presc1', prescriptionId: 'PRX-1', date: new Date(), status: 'active', diagnosis: 'Lombalgie', validityDays: 90 }])
    );

    const dossier = await doctorService.getPatientDossier('507f1f77bcf86cd799439012', '507f1f77bcf86cd799439011');

    expect(dossier.profile.firstName).toBe('Yao');
    expect(dossier.health.allergies).toEqual(['pollen']);
    expect(dossier.consultations).toHaveLength(1);
    expect(dossier.consultations[0].diagnosis).toBe('Lombalgie');
    expect(dossier.prescriptions).toHaveLength(1);
  });
});