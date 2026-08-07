/**
 * patient.service.test.ts
 *
 * Tests unitaires purs : Patient et Prescription sont mockés.
 * Structure : app/server/services/patient.service.ts, app/server/models/*.ts,
 * app/server/__tests__/patient.service.test.ts (ce fichier).
 *
 * Basé sur une lecture complète et directe du fichier source (via l'outil
 * `view`), pas une hypothèse partielle — devrait coller du premier coup.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../models/patient.model', () => ({
  Patient: {
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('../models/prescription.model', () => ({
  Prescription: {
    findById: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('../services/cloudinary.service', () => ({
  cloudinaryService: {
    uploadProfilePhoto: jest.fn(async () => ({ url: 'https://x/photo.png', publicId: 'x' })),
  },
}));

import { patientService } from '../services/patient.service';
import { Patient } from '../models/patient.model';
import { Prescription } from '../models/prescription.model';

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

describe('patientService.updateProfile', () => {
  it('rejette si le patient est introuvable', async () => {
    (Patient.findByIdAndUpdate as any).mockReturnValue(mockQuery(null));

    await expect(
      patientService.updateProfile('pat1', { firstName: 'Yao' })
    ).rejects.toThrow('Patient introuvable.');
  });

  it('met à jour uniquement les champs fournis, wrappés dans $set', async () => {
    (Patient.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'pat1' }));

    await patientService.updateProfile('pat1', { firstName: 'Yao', city: 'Bouaké' });

    expect(Patient.findByIdAndUpdate).toHaveBeenCalledWith(
      'pat1',
      { $set: expect.objectContaining({ 'profile.firstName': 'Yao', 'location.city': 'Bouaké' }) },
      expect.objectContaining({ new: true })
    );
  });
});

// ─── updateHealthInfo (calcul BMI) ──────────────────────────────────────────

describe('patientService.updateHealthInfo — calcul BMI', () => {
  it('calcule le BMI si height et weight sont fournis ensemble', async () => {
    (Patient.findById as any).mockReturnValue(mockQuery({ health: {} }));
    (Patient.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'pat1' }));

    // BMI = poids / (taille en m)^2 = 70 / (1.75)^2 = 22.86
    await patientService.updateHealthInfo('pat1', { height: 175, weight: 70 });

    const updateArg = (Patient.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg.$set['health.bmi']).toBeCloseTo(22.86, 2);
  });

  it('calcule le BMI en combinant la nouvelle valeur avec celle déjà en base', async () => {
    // On ne fournit que le poids ; la taille vient du document existant
    (Patient.findById as any).mockReturnValue(mockQuery({ health: { height: 180 } }));
    (Patient.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'pat1' }));

    await patientService.updateHealthInfo('pat1', { weight: 80 });

    const updateArg = (Patient.findByIdAndUpdate as any).mock.calls[0][1];
    // BMI = 80 / (1.8)^2 = 24.69
    expect(updateArg.$set['health.bmi']).toBeCloseTo(24.69, 2);
  });

  it('ne calcule pas le BMI si la taille est manquante', async () => {
    (Patient.findById as any).mockReturnValue(mockQuery({ health: {} }));
    (Patient.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'pat1' }));

    await patientService.updateHealthInfo('pat1', { weight: 80 });

    const updateArg = (Patient.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg.$set['health.bmi']).toBeUndefined();
  });

  it('rejette si le patient est introuvable après mise à jour', async () => {
    (Patient.findById as any).mockReturnValue(mockQuery({ health: {} }));
    (Patient.findByIdAndUpdate as any).mockReturnValue(mockQuery(null));

    await expect(
      patientService.updateHealthInfo('pat1', { allergies: ['pollen'] })
    ).rejects.toThrow('Patient introuvable.');
  });
});

// ─── addEmergencyContact / removeEmergencyContact ───────────────────────────

describe('patientService.addEmergencyContact', () => {
  const contact = { name: 'Awa', phone: '+2250700000000', relationship: 'Sœur' };

  it('rejette si le patient est introuvable', async () => {
    (Patient.findById as any).mockResolvedValue(null);

    await expect(patientService.addEmergencyContact('pat1', contact)).rejects.toThrow(
      'Patient introuvable.'
    );
  });

  it('rejette si 3 contacts existent déjà', async () => {
    (Patient.findById as any).mockResolvedValue({
      contact: { emergencyContacts: [{}, {}, {}] },
    });

    await expect(patientService.addEmergencyContact('pat1', contact)).rejects.toThrow(
      "Maximum 3 contacts d'urgence autorisés."
    );
  });

  it('ajoute le contact via $push si moins de 3 existent', async () => {
    (Patient.findById as any).mockResolvedValue({ contact: { emergencyContacts: [{}] } });
    (Patient.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'pat1' }));

    await patientService.addEmergencyContact('pat1', contact);

    expect(Patient.findByIdAndUpdate).toHaveBeenCalledWith(
      'pat1',
      { $push: { 'contact.emergencyContacts': contact } },
      expect.objectContaining({ new: true })
    );
  });
});

describe('patientService.removeEmergencyContact', () => {
  it('rejette si le patient est introuvable', async () => {
    (Patient.findByIdAndUpdate as any).mockReturnValue(mockQuery(null));

    await expect(
      patientService.removeEmergencyContact('pat1', '507f1f77bcf86cd799439011')
    ).rejects.toThrow('Patient introuvable.');
  });

  it('retire le contact via $pull', async () => {
    (Patient.findByIdAndUpdate as any).mockReturnValue(mockQuery({ _id: 'pat1' }));

    await patientService.removeEmergencyContact('pat1', '507f1f77bcf86cd799439011');

    expect(Patient.findByIdAndUpdate).toHaveBeenCalledWith(
      'pat1',
      { $pull: { 'contact.emergencyContacts': { _id: expect.anything() } } },
      expect.objectContaining({ new: true })
    );
  });
});

// ─── setPinCode / verifyPinCode ─────────────────────────────────────────────

describe('patientService.setPinCode', () => {
  it('rejette un PIN qui ne fait pas 4 à 6 chiffres', async () => {
    await expect(patientService.setPinCode('pat1', '123')).rejects.toThrow(
      'Le code PIN doit contenir 4 à 6 chiffres.'
    );
    await expect(patientService.setPinCode('pat1', 'abcd')).rejects.toThrow(
      'Le code PIN doit contenir 4 à 6 chiffres.'
    );
  });

  it('accepte un PIN valide et le hashe avant stockage', async () => {
    (Patient.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await patientService.setPinCode('pat1', '1234');

    expect(result.message).toMatch(/succès/);
    const updateArg = (Patient.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg['security.pinCode']).not.toBe('1234');
  });
});

describe('patientService.verifyPinCode', () => {
  it("rejette si aucun code PIN n'est défini", async () => {
    (Patient.findById as any).mockReturnValue(mockQuery({ security: {} }));

    await expect(patientService.verifyPinCode('pat1', '1234')).rejects.toThrow(
      'Aucun code PIN défini.'
    );
  });

  it('valide un PIN correct', async () => {
    // On fixe un vrai code PIN via setPinCode, puis on le vérifie
    (Patient.findByIdAndUpdate as any).mockResolvedValue(undefined);
    await patientService.setPinCode('pat1', '5678');
    const hashedPin = (Patient.findByIdAndUpdate as any).mock.calls[0][1]['security.pinCode'];

    (Patient.findById as any).mockReturnValue(mockQuery({ security: { pinCode: hashedPin } }));

    const result = await patientService.verifyPinCode('pat1', '5678');

    expect(result.valid).toBe(true);
  });

  it('rejette un PIN incorrect', async () => {
    (Patient.findByIdAndUpdate as any).mockResolvedValue(undefined);
    await patientService.setPinCode('pat1', '5678');
    const hashedPin = (Patient.findByIdAndUpdate as any).mock.calls[0][1]['security.pinCode'];

    (Patient.findById as any).mockReturnValue(mockQuery({ security: { pinCode: hashedPin } }));

    const result = await patientService.verifyPinCode('pat1', '0000');

    expect(result.valid).toBe(false);
  });
});

// ─── updateAccountStatus ─────────────────────────────────────────────────────

describe('patientService.updateAccountStatus', () => {
  it('met à jour le statut du compte', async () => {
    (Patient.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await patientService.updateAccountStatus('pat1', 'suspended');

    expect(result.message).toContain('suspended');
    expect(Patient.findByIdAndUpdate).toHaveBeenCalledWith('pat1', {
      'status.accountStatus': 'suspended',
    });
  });
});

// ─── getStats ────────────────────────────────────────────────────────────────

describe('patientService.getStats', () => {
  it('rejette si le patient est introuvable', async () => {
    (Patient.findById as any).mockReturnValue(mockQuery(null));

    await expect(patientService.getStats('pat1')).rejects.toThrow('Patient introuvable.');
  });

  it('retourne des valeurs par défaut si les champs sont absents', async () => {
    (Patient.findById as any).mockReturnValue(mockQuery({}));

    const result = await patientService.getStats('pat1');

    expect(result).toEqual({
      totalConsultations: 0,
      totalPrescriptions: 0,
      lastMedicalUpdate: null,
      bmi: null,
    });
  });
});

// ─── getPrescriptionById ─────────────────────────────────────────────────────

describe('patientService.getPrescriptionById', () => {
  it("rejette si l'ordonnance est introuvable", async () => {
    (Prescription.findById as any).mockReturnValue(mockQuery(null));

    await expect(
      patientService.getPrescriptionById('presc1', 'pat1', 'patient')
    ).rejects.toThrow('Ordonnance introuvable.');
  });

  it("rejette si le requester n'est ni le patient ni le médecin concerné", async () => {
    (Prescription.findById as any).mockReturnValue(
      mockQuery({ patientId: 'pat-autre', doctorId: 'doc-autre' })
    );

    await expect(
      patientService.getPrescriptionById('presc1', 'pat1', 'patient')
    ).rejects.toThrow('Accès non autorisé.');
  });

  it('autorise le patient propriétaire', async () => {
    const prescription = { patientId: 'pat1', doctorId: 'doc1' };
    (Prescription.findById as any).mockReturnValue(mockQuery(prescription));

    const result = await patientService.getPrescriptionById('presc1', 'pat1', 'patient');

    expect(result).toBe(prescription);
  });

  it('autorise le médecin auteur', async () => {
    const prescription = { patientId: 'pat1', doctorId: 'doc1' };
    (Prescription.findById as any).mockReturnValue(mockQuery(prescription));

    const result = await patientService.getPrescriptionById('presc1', 'doc1', 'doctor');

    expect(result).toBe(prescription);
  });
});