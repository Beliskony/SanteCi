/**
 * Admin.Service.test.ts
 *
 * Tests unitaires purs : Admin, Review, Doctor, Patient, HospitalClinic,
 * Appointment ainsi que les services délégués (doctorService, patientService,
 * hospitalClinicService, reviewService) sont mockés. bcrypt et crypto sont
 * mockés également. mongoose n'est PAS mocké : on utilise son
 * `isValidObjectId` réel (utile pour tester les ids invalides) et
 * `Types.ObjectId` réel pour générer des ids valides.
 *
 * Structure identique à Admin.Auth.Service.test.ts :
 * app/server/services/Admin.Service.ts, app/server/models/*.ts,
 * app/server/__tests__/Admin.Service.test.ts (ce fichier).
 *
 * Point important : la plupart des méthodes de lecture enchaînent
 * `.select()/.sort()/.skip()/.limit()/.populate()/.lean()` sur le résultat
 * d'un `Model.find(...)`. Le mock `mockQuery` ci-dessous simule un curseur
 * Mongoose chaînable et "thenable" : quel que soit le nombre de maillons
 * appelés avant l'`await`, il résout toujours vers la même valeur.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── Mocks des modèles ──────────────────────────────────────────────────────
jest.mock('../models/admin.model', () => ({
  Admin: {
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../models/review.model', () => ({
  Review: { find: jest.fn(), countDocuments: jest.fn() },
}));

jest.mock('../models/medcin.model', () => ({
  Doctor: { findById: jest.fn(), find: jest.fn(), countDocuments: jest.fn(), aggregate: jest.fn() },
}));

jest.mock('../models/patient.model', () => ({
  Patient: { find: jest.fn(), countDocuments: jest.fn() },
}));

jest.mock('../models/hopitalClinic.model', () => ({
  __esModule: true,
  default: { findById: jest.fn(), find: jest.fn(), countDocuments: jest.fn() },
}));

jest.mock('../models/appointement.model', () => ({
  Appointment: { aggregate: jest.fn(), countDocuments: jest.fn(), find: jest.fn() },
}));

// ── Mocks des services délégués ────────────────────────────────────────────
jest.mock('../services/doctor.service', () => ({
  doctorService: { verify: jest.fn(), updateAccountStatus: jest.fn() },
}));
jest.mock('../services/patient.service', () => ({
  patientService: { updateAccountStatus: jest.fn() },
}));
jest.mock('../services/hopital.service', () => ({
  hospitalClinicService: { verify: jest.fn(), updateAccountStatus: jest.fn() },
}));
jest.mock('../services/review.service', () => ({
  reviewService: { adminDeleteReview: jest.fn() },
}));

jest.mock('bcrypt', () => ({ hash: jest.fn() }));
jest.mock('crypto', () => ({ randomBytes: jest.fn() }));

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { adminService } from '../services/Admin.service';
import { Admin } from '../models/admin.model';
import { Review } from '../models/review.model';
import { Doctor } from '../models/medcin.model';
import { Patient } from '../models/patient.model';
import HospitalClinic from '../models/hopitalClinic.model';
import { Appointment } from '../models/appointement.model';
import { doctorService } from '../services/doctor.service';
import { patientService } from '../services/patient.service';
import { hospitalClinicService } from '../services/hopital.service';
import { reviewService } from '../services/review.service';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Simule un curseur Mongoose chaînable et thenable : `.select().sort()...`
 *  peuvent être enchaînés dans n'importe quel ordre, le résultat final
 *  résolu par `await` est toujours `value`. */
function mockQuery<T>(value: T) {
  const query: any = {};
  ['select', 'sort', 'skip', 'limit', 'populate', 'lean'].forEach((m) => {
    query[m] = jest.fn(() => query);
  });
  query.then = (resolve: any, reject: any) => Promise.resolve(value).then(resolve, reject);
  query.catch = (reject: any) => Promise.resolve(value).catch(reject);
  return query;
}

const validId = () => new mongoose.Types.ObjectId().toString();

function baseAdminDoc(overrides: any = {}) {
  const doc: any = {
    _id: 'actor-1',
    role: 'admin',
    adminId: 'ADM-1',
    profile: { fullName: 'Axel' },
    contact: { email: 'axel@sante.ci', phone: '+225000' },
    permissions: [],
    status: { accountStatus: 'active' },
    security: { password: 'hashed' },
    ...overrides,
  };
  doc.save = jest.fn(async () => doc);
  doc.toObject = jest.fn(() => ({ ...doc }));
  return doc;
}

beforeEach(() => {
  // resetAllMocks (et non clearAllMocks) : clearAllMocks ne vide PAS la file
  // des valeurs mockReturnValueOnce/mockResolvedValueOnce non consommées par
  // un test précédent (ex. un test qui lève une erreur avant d'avoir
  // consommé toutes ses valeurs en file). Sans reset complet, une valeur
  // orpheline se décale sur le test suivant et fausse ses assertions.
  jest.resetAllMocks();
});

// ─── Helpers internes de sécurité (via des méthodes publiques) ──────────────

describe('adminService — vérification des permissions (assertActorPermission)', () => {
  it('rejette un id acteur invalide', async () => {
    await expect(adminService.verifyDoctor('invalid-id', validId())).rejects.toThrow(
      'Identifiant administrateur invalide.'
    );
  });

  it('rejette si l\'acteur est introuvable', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(null));
    await expect(adminService.verifyDoctor(validId(), validId())).rejects.toThrow('Administrateur introuvable.');
  });

  it('rejette si le compte acteur n\'est pas actif', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ status: { accountStatus: 'suspended' } }))
    );
    await expect(adminService.verifyDoctor(validId(), validId())).rejects.toThrow(
      'Compte administrateur suspendu ou bloqué.'
    );
  });

  it('rejette si l\'acteur n\'a pas la permission requise', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ permissions: [] })));
    await expect(adminService.verifyDoctor(validId(), validId())).rejects.toThrow('Permission insuffisante.');
  });

  it('laisse passer un superadmin même sans la permission listée', async () => {
    const doctorId = validId();
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin', permissions: [] })));
    (doctorService.verify as any).mockResolvedValueOnce({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    await expect(adminService.verifyDoctor(validId(), doctorId)).resolves.toEqual({ message: 'ok' });
  });
});

// ─── createSubAdmin ───────────────────────────────────────────────────────

describe('adminService.createSubAdmin', () => {
  const dto = {
    fullName: 'Jeanne Kouassi',
    email: 'jeanne@sante.ci',
    phone: '+2250700000002',
    password: 'S3cur3Pass!',
    permissions: ['moderate:doctors'] as any,
  };

  it('rejette si l\'acteur n\'est pas superadmin', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'admin' })));
    await expect(adminService.createSubAdmin(validId(), dto)).rejects.toThrow('Réservé au superadmin.');
  });

  it('rejette si aucune permission n\'est fournie', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })));
    await expect(adminService.createSubAdmin(validId(), { ...dto, permissions: [] })).rejects.toThrow(
      'Au moins une permission doit être assignée.'
    );
  });

  it('rejette si l\'email est déjà utilisé', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })));
    (Admin.findOne as any).mockResolvedValueOnce({ _id: 'someone' });
    await expect(adminService.createSubAdmin(validId(), dto)).rejects.toThrow('Cet email est déjà utilisé.');
  });

  it('hash le mot de passe, crée l\'admin et journalise l\'action', async () => {
    const creatorId = validId();
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })));
    (Admin.findOne as any).mockResolvedValueOnce(null);
    (bcrypt.hash as any).mockResolvedValueOnce('hashed-pwd');
    (crypto.randomBytes as any).mockReturnValueOnce({ toString: () => 'abcd1234' });
    (Admin.create as any).mockResolvedValueOnce({
      _id: 'new-admin-1',
      adminId: 'ADM-ABCD1234',
      contact: { email: dto.email },
    });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.createSubAdmin(creatorId, dto);

    expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
    expect(Admin.create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'ADM-ABCD1234',
        role: 'admin',
        permissions: dto.permissions,
        security: expect.objectContaining({ password: 'hashed-pwd', isAdmin: true, failedAttempts: 0 }),
        metadata: { createdBy: creatorId },
      })
    );
    expect(Admin.findByIdAndUpdate).toHaveBeenCalledWith(
      creatorId,
      expect.objectContaining({ $push: expect.objectContaining({ recentActions: expect.anything() }) })
    );
    expect(result).toEqual({ id: 'new-admin-1', adminId: 'ADM-ABCD1234', email: dto.email });
  });
});

// ─── listAdmins ───────────────────────────────────────────────────────────

describe('adminService.listAdmins', () => {
  it('rejette si l\'acteur n\'est pas superadmin', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'admin' })));
    await expect(adminService.listAdmins(validId())).rejects.toThrow('Réservé au superadmin.');
  });

  it('retourne la liste sans le mot de passe', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })));
    const query = mockQuery([{ _id: 'a1' }, { _id: 'a2' }]);
    (Admin.find as any).mockReturnValueOnce(query);

    const result = await adminService.listAdmins(validId());

    expect(query.select).toHaveBeenCalledWith('-security.password');
    expect(result).toHaveLength(2);
  });
});

// ─── getAdminById ─────────────────────────────────────────────────────────

describe('adminService.getAdminById', () => {
  it('rejette un id cible invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })));
    await expect(adminService.getAdminById(validId(), 'not-an-id')).rejects.toThrow(
      'Identifiant administrateur cible invalide.'
    );
  });

  it('rejette si l\'admin cible est introuvable', async () => {
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })))
      .mockReturnValueOnce(mockQuery(null));

    await expect(adminService.getAdminById(validId(), validId())).rejects.toThrow('Administrateur introuvable.');
  });

  it('retourne l\'admin cible sans le mot de passe', async () => {
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })))
      .mockReturnValueOnce(mockQuery({ _id: 'target-1' }));

    const result = await adminService.getAdminById(validId(), validId());
    expect(result).toEqual({ _id: 'target-1' });
  });
});

// ─── updatePermissions ────────────────────────────────────────────────────

describe('adminService.updatePermissions', () => {
  it('rejette si aucune permission n\'est fournie', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })));
    await expect(adminService.updatePermissions(validId(), validId(), [])).rejects.toThrow(
      'Au moins une permission doit être assignée.'
    );
  });

  it('rejette si l\'admin cible est introuvable', async () => {
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })))
      .mockReturnValueOnce(mockQuery(null));

    await expect(
      adminService.updatePermissions(validId(), validId(), ['moderate:doctors'] as any)
    ).rejects.toThrow('Administrateur introuvable.');
  });

  it('rejette si la cible est un superadmin', async () => {
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })))
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })));

    await expect(
      adminService.updatePermissions(validId(), validId(), ['moderate:doctors'] as any)
    ).rejects.toThrow("Impossible de modifier les permissions d'un superadmin.");
  });

  it('met à jour les permissions, sauvegarde et journalise', async () => {
    const superAdminId = validId();
    const targetDoc = baseAdminDoc({ role: 'admin', permissions: [] });
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })))
      .mockReturnValueOnce(mockQuery(targetDoc));
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.updatePermissions(superAdminId, validId(), ['moderate:doctors'] as any);

    expect(targetDoc.permissions).toEqual(['moderate:doctors']);
    expect(targetDoc.save).toHaveBeenCalled();
    expect(Admin.findByIdAndUpdate).toHaveBeenCalledWith(
      superAdminId,
      expect.objectContaining({ $push: expect.anything() })
    );
    expect(result).not.toHaveProperty('security');
  });
});

// ─── setAdminStatus ───────────────────────────────────────────────────────

describe('adminService.setAdminStatus', () => {
  it('rejette un statut invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })));
    await expect(
      adminService.setAdminStatus(validId(), validId(), 'bogus' as any)
    ).rejects.toThrow('Statut invalide.');
  });

  it('rejette si une raison valide est absente pour un statut non actif', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })));
    await expect(
      adminService.setAdminStatus(validId(), validId(), 'suspended', 'no')
    ).rejects.toThrow(/raison d'au moins 5 caractères/);
  });

  it('rejette la modification de son propre statut', async () => {
    const actorId = validId();
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin', _id: actorId })));
    await expect(
      adminService.setAdminStatus(actorId, actorId, 'suspended', 'raison valide')
    ).rejects.toThrow('Impossible de modifier votre propre statut.');
  });

  it('rejette si la cible est introuvable', async () => {
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })))
      .mockReturnValueOnce(mockQuery(null));

    await expect(
      adminService.setAdminStatus(validId(), validId(), 'suspended', 'raison valide')
    ).rejects.toThrow('Administrateur introuvable.');
  });

  it('rejette la suspension d\'un superadmin', async () => {
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })))
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })));

    await expect(
      adminService.setAdminStatus(validId(), validId(), 'suspended', 'raison valide')
    ).rejects.toThrow('Impossible de suspendre un superadmin.');
  });

  it('met à jour le statut, sauvegarde et journalise', async () => {
    const targetDoc = baseAdminDoc({ role: 'admin' });
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })))
      .mockReturnValueOnce(mockQuery(targetDoc));
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.setAdminStatus(validId(), validId(), 'suspended', 'raison valide');

    expect(targetDoc.status.accountStatus).toBe('suspended');
    expect(targetDoc.save).toHaveBeenCalled();
    expect(result.message).toBe('Statut mis à jour : suspended');
  });

  it('n\'exige pas de raison pour repasser un compte à actif', async () => {
    const targetDoc = baseAdminDoc({ role: 'admin' });
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })))
      .mockReturnValueOnce(mockQuery(targetDoc));
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    await expect(adminService.setAdminStatus(validId(), validId(), 'active')).resolves.toMatchObject({
      message: 'Statut mis à jour : active',
    });
  });
});

// ─── deleteAdmin ──────────────────────────────────────────────────────────

describe('adminService.deleteAdmin', () => {
  it('rejette si la raison est absente ou trop courte', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })));
    await expect(adminService.deleteAdmin(validId(), validId(), 'no')).rejects.toThrow(
      /raison d'au moins 5 caractères/
    );
  });

  it('rejette la suppression de son propre compte', async () => {
    const actorId = validId();
    (Admin.findById as any).mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin', _id: actorId })));
    await expect(adminService.deleteAdmin(actorId, actorId, 'raison valide')).rejects.toThrow(
      'Impossible de supprimer votre propre compte.'
    );
  });

  it('rejette si la cible est introuvable', async () => {
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })))
      .mockReturnValueOnce(mockQuery(null));

    await expect(adminService.deleteAdmin(validId(), validId(), 'raison valide')).rejects.toThrow(
      'Administrateur introuvable.'
    );
  });

  it('rejette la suppression d\'un superadmin', async () => {
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })))
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })));

    await expect(adminService.deleteAdmin(validId(), validId(), 'raison valide')).rejects.toThrow(
      'Impossible de supprimer un superadmin.'
    );
  });

  it('supprime la cible et journalise l\'action', async () => {
    const targetId = validId();
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'superadmin' })))
      .mockReturnValueOnce(mockQuery(baseAdminDoc({ role: 'admin' })));
    (Admin.findByIdAndDelete as any).mockResolvedValueOnce({});
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.deleteAdmin(validId(), targetId, 'raison valide');

    expect(Admin.findByIdAndDelete).toHaveBeenCalledWith(targetId);
    expect(result.message).toBe('Administrateur supprimé.');
  });
});

// ─── Modération : médecins ────────────────────────────────────────────────

describe('adminService.verifyDoctor', () => {
  it('vérifie le médecin et journalise', async () => {
    const doctorId = validId();
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:doctors'] }))
    );
    (doctorService.verify as any).mockResolvedValueOnce({ message: 'Médecin vérifié.' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.verifyDoctor(validId(), doctorId);

    expect(doctorService.verify).toHaveBeenCalledWith(doctorId);
    expect(result).toEqual({ message: 'Médecin vérifié.' });
  });
});

describe('adminService.getDoctorVerificationDetails', () => {
  it('rejette si le médecin est introuvable', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:doctors'] }))
    );
    (Doctor.findById as any).mockReturnValueOnce(mockQuery(null));

    await expect(adminService.getDoctorVerificationDetails(validId(), validId())).rejects.toThrow(
      'Médecin introuvable.'
    );
  });

  it('retourne les détails de vérification', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:doctors'] }))
    );
    (Doctor.findById as any).mockReturnValueOnce(mockQuery({ doctorId: 'DOC-1' }));

    const result = await adminService.getDoctorVerificationDetails(validId(), validId());
    expect(result).toEqual({ doctorId: 'DOC-1' });
  });
});

describe('adminService.setDoctorStatus', () => {
  it('rejette un statut invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:doctors'] }))
    );
    await expect(adminService.setDoctorStatus(validId(), validId(), 'bogus' as any)).rejects.toThrow(
      'Statut invalide.'
    );
  });

  it('exige une raison pour suspendre ou bloquer', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:doctors'] }))
    );
    await expect(adminService.setDoctorStatus(validId(), validId(), 'blocked')).rejects.toThrow(
      /raison d'au moins 5 caractères/
    );
  });

  it('journalise "block_doctor" pour un blocage', async () => {
    const doctorId = validId();
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:doctors'] }))
    );
    (doctorService.updateAccountStatus as any).mockResolvedValueOnce({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockImplementationOnce((_id: any, update: any) => {
      expect(update.$push.recentActions.$each[0].action).toBe('block_doctor');
      return Promise.resolve({});
    });

    await adminService.setDoctorStatus(validId(), doctorId, 'blocked', 'raison valide');
    expect(doctorService.updateAccountStatus).toHaveBeenCalledWith(doctorId, 'blocked');
  });

  it('journalise "reactivate_doctor" pour une réactivation', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:doctors'] }))
    );
    (doctorService.updateAccountStatus as any).mockResolvedValueOnce({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockImplementationOnce((_id: any, update: any) => {
      expect(update.$push.recentActions.$each[0].action).toBe('reactivate_doctor');
      return Promise.resolve({});
    });

    await adminService.setDoctorStatus(validId(), validId(), 'active');
  });
});

// ─── Modération : hôpitaux ────────────────────────────────────────────────

describe('adminService.verifyHospital', () => {
  it('vérifie l\'établissement et journalise', async () => {
    const hospitalId = validId();
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:hospitals'] }))
    );
    (hospitalClinicService.verify as any).mockResolvedValueOnce({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.verifyHospital(validId(), hospitalId);
    expect(hospitalClinicService.verify).toHaveBeenCalledWith(hospitalId);
    expect(result).toEqual({ message: 'ok' });
  });
});

describe('adminService.getHospitalVerificationDetails', () => {
  it('rejette si l\'établissement est introuvable', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:hospitals'] }))
    );
    (HospitalClinic.findById as any).mockReturnValueOnce(mockQuery(null));

    await expect(adminService.getHospitalVerificationDetails(validId(), validId())).rejects.toThrow(
      'Établissement introuvable.'
    );
  });
});

describe('adminService.setHospitalStatus', () => {
  it('journalise "reactivate_hospital" quand le statut redevient actif', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:hospitals'] }))
    );
    (hospitalClinicService.updateAccountStatus as any).mockResolvedValueOnce({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockImplementationOnce((_id: any, update: any) => {
      expect(update.$push.recentActions.$each[0].action).toBe('reactivate_hospital');
      return Promise.resolve({});
    });

    await adminService.setHospitalStatus(validId(), validId(), 'active');
  });

  it('journalise "suspend_hospital" pour tout statut non actif', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:hospitals'] }))
    );
    (hospitalClinicService.updateAccountStatus as any).mockResolvedValueOnce({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockImplementationOnce((_id: any, update: any) => {
      expect(update.$push.recentActions.$each[0].action).toBe('suspend_hospital');
      return Promise.resolve({});
    });

    await adminService.setHospitalStatus(validId(), validId(), 'blocked', 'raison valide');
  });
});

// ─── Modération : patients ────────────────────────────────────────────────

describe('adminService.setPatientStatus', () => {
  it('exige une raison pour suspendre ou bloquer', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:patients'] }))
    );
    await expect(adminService.setPatientStatus(validId(), validId(), 'suspended')).rejects.toThrow(
      /raison d'au moins 5 caractères/
    );
  });

  it('journalise "suspend_patient" et délègue à patientService', async () => {
    const patientId = validId();
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:patients'] }))
    );
    (patientService.updateAccountStatus as any).mockResolvedValueOnce({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockImplementationOnce((_id: any, update: any) => {
      expect(update.$push.recentActions.$each[0].action).toBe('suspend_patient');
      return Promise.resolve({});
    });

    await adminService.setPatientStatus(validId(), patientId, 'suspended', 'raison valide');
    expect(patientService.updateAccountStatus).toHaveBeenCalledWith(patientId, 'suspended');
  });
});

// ─── Modération : avis ────────────────────────────────────────────────────

describe('adminService.deleteReview', () => {
  it('exige une raison', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:reviews'] }))
    );
    await expect(adminService.deleteReview(validId(), validId())).rejects.toThrow(
      /raison d'au moins 5 caractères/
    );
  });

  it('supprime l\'avis et journalise', async () => {
    const reviewId = validId();
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:reviews'] }))
    );
    (reviewService.adminDeleteReview as any).mockResolvedValueOnce({ message: 'Avis supprimé.' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.deleteReview(validId(), reviewId, 'contenu inapproprié');
    expect(reviewService.adminDeleteReview).toHaveBeenCalledWith(reviewId);
    expect(result).toEqual({ message: 'Avis supprimé.' });
  });
});

// ─── Supervision : dashboard ──────────────────────────────────────────────

describe('adminService.getDashboardStats', () => {
  it('agrège les compteurs de la plateforme', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['view:analytics'] }))
    );
    (Doctor.countDocuments as any)
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(6); // vérifiés
    (Patient.countDocuments as any).mockResolvedValueOnce(50);
    (HospitalClinic.countDocuments as any)
      .mockResolvedValueOnce(4) // total
      .mockResolvedValueOnce(1); // en attente de vérification
    (Appointment.countDocuments as any)
      .mockResolvedValueOnce(3) // actifs
      .mockResolvedValueOnce(20); // terminés
    (Appointment.aggregate as any)
      .mockResolvedValueOnce([{ _id: null, total: 150000 }]) // revenu
      .mockResolvedValueOnce([{ _id: 'confirmed', count: 3 }]); // par statut
    (Doctor.aggregate as any).mockResolvedValueOnce([{ _id: 'premium', count: 2 }]);

    const result = await adminService.getDashboardStats(validId());

    expect(result.doctors).toEqual({ total: 10, verified: 6, pending: 4 });
    expect(result.patients).toEqual({ total: 50 });
    expect(result.hospitals).toEqual({ total: 4, pendingVerification: 1 });
    expect(result.appointments).toEqual({ active: 3, completed: 20 });
    expect(result.revenue).toEqual({ total: 150000 });
  });

  it('retourne un revenu à 0 si aucun paiement', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['view:analytics'] }))
    );
    (Doctor.countDocuments as any).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    (Patient.countDocuments as any).mockResolvedValueOnce(0);
    (HospitalClinic.countDocuments as any).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    (Appointment.countDocuments as any).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    (Appointment.aggregate as any).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    (Doctor.aggregate as any).mockResolvedValueOnce([]);

    const result = await adminService.getDashboardStats(validId());
    expect(result.revenue).toEqual({ total: 0 });
  });
});

// ─── Supervision : revenu dans le temps ───────────────────────────────────

describe('adminService.getRevenueTimeseries', () => {
  it('remplit les buckets vides et calcule le grandTotal', async () => {
    const todayLabel = new Date().toISOString().slice(0, 10);
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['view:analytics'] }))
    );
    (Appointment.aggregate as any).mockResolvedValueOnce([{ _id: todayLabel, total: 500, count: 2 }]);

    const result = await adminService.getRevenueTimeseries(validId(), 'week');

    expect(result.data).toHaveLength(7);
    const todayBucket = result.data.find((b: any) => b.label === todayLabel);
    expect(todayBucket).toMatchObject({ total: 500, count: 2 });
    expect(result.grandTotal).toBe(500);
  });
});

// ─── Performance d'un médecin ─────────────────────────────────────────────

describe('adminService.getDoctorPerformance', () => {
  it('rejette si le médecin est introuvable', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:doctors'] }))
    );
    (Doctor.findById as any).mockReturnValueOnce(mockQuery(null));
    (Appointment.aggregate as any).mockResolvedValue([]);

    await expect(adminService.getDoctorPerformance(validId(), validId())).rejects.toThrow('Médecin introuvable.');
  });

  it('regroupe les statuts de rendez-vous en catégories métier', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:doctors'] }))
    );
    (Doctor.findById as any).mockReturnValueOnce(mockQuery({ metadata: { createdAt: '2024-01-01' } }));
    (Appointment.aggregate as any)
      .mockResolvedValueOnce([{ _id: null, total: 90000, count: 9 }]) // revenuAgg
      .mockResolvedValueOnce([
        { _id: 'pending', count: 1 },
        { _id: 'confirmed', count: 2 },
        { _id: 'ongoing', count: 1 },
        { _id: 'completed', count: 9 },
        { _id: 'no_show', count: 2 },
        { _id: 'cancelled', count: 3 },
      ]) // statusCounts
      .mockResolvedValueOnce([]); // timeseries (interne à aggregateRevenueTimeseries)

    const result = await adminService.getDoctorPerformance(validId(), validId(), 'month');

    expect(result.totalRevenue).toBe(90000);
    expect(result.totalPaidAppointments).toBe(9);
    expect(result.appointments).toEqual({ active: 4, completed: 9, noShow: 2, cancelled: 3 });
    expect(result.memberSince).toBe('2024-01-01');
  });
});

// ─── Listing : médecins ────────────────────────────────────────────────────

describe('adminService.listDoctors', () => {
  it('rejette un statut invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:doctors'] }))
    );
    await expect(
      adminService.listDoctors(validId(), { status: 'bogus' })
    ).rejects.toThrow('Statut invalide.');
  });

  it('construit la requête de recherche et pagine correctement', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:doctors'] }))
    );
    const query = mockQuery([{ doctorId: 'DOC-1' }]);
    (Doctor.find as any).mockReturnValueOnce(query);
    (Doctor.countDocuments as any).mockResolvedValueOnce(1);

    const result = await adminService.listDoctors(validId(), {
      status: 'active',
      search: 'kouassi',
      page: 0, // doit être ramené à 1
      limit: 500, // doit être plafonné à 100
    });

    expect(Doctor.find).toHaveBeenCalledWith(
      expect.objectContaining({ 'status.accountStatus': 'active', $or: expect.any(Array) })
    );
    expect(query.skip).toHaveBeenCalledWith(0);
    expect(query.limit).toHaveBeenCalledWith(100);
    expect(result).toEqual({ doctors: [{ doctorId: 'DOC-1' }], total: 1, page: 1, pages: 1 });
  });
});

// ─── Listing : hôpitaux ────────────────────────────────────────────────────

describe('adminService.listHospitals', () => {
  it('rejette un statut invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:hospitals'] }))
    );
    await expect(adminService.listHospitals(validId(), { status: 'bogus' })).rejects.toThrow('Statut invalide.');
  });

  it('filtre sur le champ verified quand fourni', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:hospitals'] }))
    );
    (HospitalClinic.find as any).mockReturnValueOnce(mockQuery([]));
    (HospitalClinic.countDocuments as any).mockResolvedValueOnce(0);

    await adminService.listHospitals(validId(), { verified: 'true' });

    expect(HospitalClinic.find).toHaveBeenCalledWith(
      expect.objectContaining({ 'metadata.verified': true })
    );
  });
});

// ─── Listing : patients ────────────────────────────────────────────────────

describe('adminService.listPatients', () => {
  it('rejette un statut invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:patients'] }))
    );
    await expect(adminService.listPatients(validId(), { status: 'bogus' })).rejects.toThrow('Statut invalide.');
  });

  it('retourne les patients paginés', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:patients'] }))
    );
    (Patient.find as any).mockReturnValueOnce(mockQuery([{ patientId: 'PAT-1' }]));
    (Patient.countDocuments as any).mockResolvedValueOnce(1);

    const result = await adminService.listPatients(validId(), {});
    expect(result.patients).toEqual([{ patientId: 'PAT-1' }]);
  });
});

// ─── Listing : avis ────────────────────────────────────────────────────────

describe('adminService.listReviews', () => {
  it('rejette un statut invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:reviews'] }))
    );
    await expect(adminService.listReviews(validId(), { status: 'bogus' })).rejects.toThrow('Statut invalide.');
  });

  it('récupère les avis avec population médecin/patient', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['moderate:reviews'] }))
    );
    const query = mockQuery([{ rating: 5 }]);
    (Review.find as any).mockReturnValueOnce(query);
    (Review.countDocuments as any).mockResolvedValueOnce(1);

    await adminService.listReviews(validId(), { status: 'flagged' });

    expect(Review.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'flagged' }));
    expect(query.populate).toHaveBeenCalledWith('doctorId', 'profile.firstName profile.lastName');
    expect(query.populate).toHaveBeenCalledWith('patientId', 'profile.firstName profile.lastName');
  });
});

// ─── Listing : abonnements ──────────────────────────────────────────────────

describe('adminService.listSubscriptions', () => {
  it('rejette un plan invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['manage:subscriptions'] }))
    );
    await expect(adminService.listSubscriptions(validId(), { plan: 'bogus' })).rejects.toThrow('Plan invalide.');
  });

  it('filtre par plan valide', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['manage:subscriptions'] }))
    );
    (Doctor.find as any).mockReturnValueOnce(mockQuery([]));
    (Doctor.countDocuments as any).mockResolvedValueOnce(0);

    await adminService.listSubscriptions(validId(), { plan: 'premium' });

    expect(Doctor.find).toHaveBeenCalledWith(expect.objectContaining({ 'status.subscription': 'premium' }));
  });
});

// ─── Paiements ─────────────────────────────────────────────────────────────

describe('adminService.listPayments', () => {
  it('rejette un statut de paiement invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['manage:payments'] }))
    );
    await expect(adminService.listPayments(validId(), { status: 'bogus' })).rejects.toThrow(
      'Statut de paiement invalide.'
    );
  });

  it('retourne les paiements paginés avec population', async () => {
    (Admin.findById as any).mockReturnValueOnce(
      mockQuery(baseAdminDoc({ permissions: ['manage:payments'] }))
    );
    const query = mockQuery([{ payment: { amount: 5000 } }]);
    (Appointment.find as any).mockReturnValueOnce(query);
    (Appointment.countDocuments as any).mockResolvedValueOnce(1);

    const result = await adminService.listPayments(validId(), { status: 'paid' });

    expect(Appointment.find).toHaveBeenCalledWith(expect.objectContaining({ 'status.paymentStatus': 'paid' }));
    expect(result.payments).toEqual([{ payment: { amount: 5000 } }]);
  });
});