/**
 * Admin.Service.test.ts
 *
 * Tests unitaires purs : Admin, Doctor, Patient, HospitalClinic, Appointment,
 * Review sont mockés, ainsi que doctorService/patientService/
 * hospitalClinicService/reviewService. Structure identique à
 * appointment.service.test.ts : app/server/services/Admin.Service.ts,
 * app/server/__tests__/Admin.Service.test.ts (ce fichier).
 *
 * Point important : updatePermissions/setAdminStatus font
 * `Admin.findById(...)` puis MUTENT le document retourné et appellent
 * `.save()`. Comme pour appointment.service, on simule ces cas avec un objet
 * mutable portant `.save()`, enveloppé dans mockQuery pour rester cohérent
 * avec le reste des mocks (chaînable ou awaité directement).
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../models/admin.model', () => ({
  Admin: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../models/review.model', () => ({
  Review: { find: jest.fn(), countDocuments: jest.fn() },
}));

jest.mock('../models/medcin.model', () => ({
  Doctor: { find: jest.fn(), findById: jest.fn(), countDocuments: jest.fn(), aggregate: jest.fn() },
}));

jest.mock('../models/patient.model', () => ({
  Patient: { find: jest.fn(), countDocuments: jest.fn() },
}));

jest.mock('../models/hopitalClinic.model', () => ({
  __esModule: true,
  default: { find: jest.fn(), findById: jest.fn(), countDocuments: jest.fn() },
}));

jest.mock('../models/appointement.model', () => ({
  Appointment: { find: jest.fn(), countDocuments: jest.fn(), aggregate: jest.fn() },
}));

jest.mock('bcrypt', () => ({ hash: jest.fn() }));

jest.mock('../services/doctor.service', () => ({
  doctorService: { verify: jest.fn(), updateAccountStatus: jest.fn() },
}));
jest.mock('../services/patient.service', () => ({
  patientService: { updateAccountStatus: jest.fn() },
}));
jest.mock('../services/hopital.service', () => ({
  hospitalClinicService: {
    verify: jest.fn(),
    updateAccountStatus: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('../services/review.service', () => ({
  reviewService: { adminDeleteReview: jest.fn() },
}));

import bcrypt from 'bcrypt';
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

/** Simule un curseur Mongoose chaînable (.select/.sort/.skip/.limit/.populate/.lean)
 *  qui résout toujours vers la même valeur, qu'on l'`await` directement ou
 *  après un ou plusieurs maillons de chaîne. */
function mockQuery<T>(value: T) {
  const query: any = Promise.resolve(value);
  query.select = jest.fn().mockReturnValue(query);
  query.sort = jest.fn().mockReturnValue(query);
  query.skip = jest.fn().mockReturnValue(query);
  query.limit = jest.fn().mockReturnValue(query);
  query.populate = jest.fn().mockReturnValue(query);
  query.lean = jest.fn().mockReturnValue(Promise.resolve(value));
  return query;
}

const ACTIVE_SUPERADMIN = { _id: 'super-1', role: 'superadmin', status: { accountStatus: 'active' }, permissions: [] };
const activeAdminWithPerm = (perm: string) => ({
  _id: 'admin-1',
  role: 'admin',
  status: { accountStatus: 'active' },
  permissions: [perm],
});

const VALID_ACTOR = '507f1f77bcf86cd799439011';
const VALID_TARGET = '507f1f77bcf86cd799439012';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Contrôle d'accès partagé ─────────────────────────────────────────────────

describe('AdminService — contrôle d\'accès partagé', () => {
  it('rejette un ID d\'acteur invalide', async () => {
    await expect(
      adminService.createSubAdmin('not-an-object-id', {
        fullName: 'X', email: 'x@x.com', phone: '+225', password: 'p', permissions: ['view:analytics'],
      })
    ).rejects.toThrow('Identifiant administrateur invalide.');
  });

  it('rejette si l\'acteur est introuvable', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(null));
    await expect(adminService.verifyDoctor(VALID_ACTOR, VALID_TARGET)).rejects.toThrow('Administrateur introuvable.');
  });

  it('rejette si l\'acteur n\'est pas actif', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery({ ...ACTIVE_SUPERADMIN, status: { accountStatus: 'blocked' } }));
    await expect(adminService.verifyDoctor(VALID_ACTOR, VALID_TARGET)).rejects.toThrow('Compte administrateur suspendu ou bloqué.');
  });

  it('rejette un admin sans la permission requise', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:patients')));
    await expect(adminService.verifyDoctor(VALID_ACTOR, VALID_TARGET)).rejects.toThrow('Permission insuffisante.');
  });

  it('autorise un superadmin même sans permission explicite listée', async () => {
    (Admin.findById as any).mockReturnValue(mockQuery(ACTIVE_SUPERADMIN));
    (doctorService.verify as any).mockResolvedValueOnce({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    await expect(adminService.verifyDoctor(VALID_ACTOR, VALID_TARGET)).resolves.toEqual({ message: 'ok' });
  });
});

// ─── Gestion des comptes admin (superadmin only) ───────────────────────────────

describe('AdminService.createSubAdmin', () => {
  const dto = {
    fullName: 'Sous Admin', email: 'sub@sante.ci', phone: '+225070000',
    password: 'pass1234', permissions: ['moderate:doctors' as const],
  };

  it('rejette si l\'acteur n\'est pas superadmin', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:doctors')));
    await expect(adminService.createSubAdmin(VALID_ACTOR, dto)).rejects.toThrow('Réservé au superadmin.');
  });

  it('rejette sans permission assignée', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN));
    await expect(adminService.createSubAdmin(VALID_ACTOR, { ...dto, permissions: [] })).rejects.toThrow(
      'Au moins une permission doit être assignée.'
    );
  });

  it('rejette si l\'email est déjà utilisé', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN));
    (Admin.findOne as any).mockReturnValueOnce(mockQuery({ _id: 'exists' }));
    await expect(adminService.createSubAdmin(VALID_ACTOR, dto)).rejects.toThrow('Cet email est déjà utilisé.');
  });

  it('crée le sous-admin, hash le mot de passe, journalise et retourne un résumé', async () => {
    (Admin.findById as any).mockReturnValue(mockQuery(ACTIVE_SUPERADMIN));
    (Admin.findOne as any).mockReturnValueOnce(mockQuery(null));
    (bcrypt.hash as any).mockResolvedValueOnce('hashed');
    (Admin.create as any).mockResolvedValueOnce({ _id: 'new-admin', adminId: 'ADM-XYZ', contact: { email: dto.email } });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.createSubAdmin(VALID_ACTOR, dto);

    expect(Admin.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin', permissions: dto.permissions }));
    expect(Admin.findByIdAndUpdate).toHaveBeenCalledWith(
      VALID_ACTOR,
      expect.objectContaining({
        $push: expect.objectContaining({
          recentActions: expect.objectContaining({ $each: [expect.objectContaining({ action: 'create_admin', targetType: 'admin' })] }),
        }),
      })
    );
    expect(result).toEqual({ id: 'new-admin', adminId: 'ADM-XYZ', email: dto.email });
  });
});

describe('AdminService.listAdmins / getAdminById', () => {
  it('liste les admins sans exposer le mot de passe (select négatif)', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN));
    const q = mockQuery([{ _id: 'a1' }]);
    (Admin.find as any).mockReturnValueOnce(q);

    const result = await adminService.listAdmins(VALID_ACTOR);

    expect(q.select).toHaveBeenCalledWith('-security.password');
    expect(result).toEqual([{ _id: 'a1' }]);
  });

  it('getAdminById rejette une cible introuvable', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN)).mockReturnValueOnce(mockQuery(null));
    await expect(adminService.getAdminById(VALID_ACTOR, VALID_TARGET)).rejects.toThrow('Administrateur introuvable.');
  });
});

describe('AdminService.updatePermissions', () => {
  it('rejette la modification d\'un superadmin', async () => {
    (Admin.findById as any)
      .mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN))
      .mockReturnValueOnce(mockQuery({ role: 'superadmin' }));

    await expect(adminService.updatePermissions(VALID_ACTOR, VALID_TARGET, ['view:analytics'])).rejects.toThrow(
      'Impossible de modifier les permissions d\'un superadmin.'
    );
  });

  it('met à jour les permissions, journalise et masque le mot de passe', async () => {
    const saveMock = jest.fn(async () => undefined);
    const target: any = {
      role: 'admin',
      permissions: [],
      save: saveMock,
      toObject: () => ({ _id: VALID_TARGET, role: 'admin', permissions: ['view:analytics'], security: { password: 'x' } }),
    };
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN)).mockReturnValueOnce(mockQuery(target));
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.updatePermissions(VALID_ACTOR, VALID_TARGET, ['view:analytics']);

    expect(target.permissions).toEqual(['view:analytics']);
    expect(saveMock).toHaveBeenCalled();
    expect(result).not.toHaveProperty('security');
  });
});

describe('AdminService.setAdminStatus', () => {
  it('rejette la modification de son propre statut', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN));
    await expect(adminService.setAdminStatus(VALID_ACTOR, VALID_ACTOR, 'suspended', 'raison suffisante')).rejects.toThrow(
      'Impossible de modifier votre propre statut.'
    );
  });

  it('exige une raison pour tout statut différent de "active"', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN));
    await expect(adminService.setAdminStatus(VALID_ACTOR, VALID_TARGET, 'suspended')).rejects.toThrow(/raison d'au moins/);
  });

  it('rejette la suspension d\'un superadmin', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN)).mockReturnValueOnce(mockQuery({ role: 'superadmin' }));
    await expect(adminService.setAdminStatus(VALID_ACTOR, VALID_TARGET, 'suspended', 'comportement suspect')).rejects.toThrow(
      'Impossible de suspendre un superadmin.'
    );
  });

  it('met à jour le statut et journalise avec la raison', async () => {
    const saveMock = jest.fn(async () => undefined);
    const target: any = { role: 'admin', status: { accountStatus: 'active' }, save: saveMock };
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN)).mockReturnValueOnce(mockQuery(target));
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.setAdminStatus(VALID_ACTOR, VALID_TARGET, 'blocked', 'fraude confirmée');

    expect(target.status.accountStatus).toBe('blocked');
    expect(saveMock).toHaveBeenCalled();
    expect(result.message).toBe('Statut mis à jour : blocked');
  });
});

describe('AdminService.deleteAdmin', () => {
  it('exige toujours une raison', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN));
    await expect(adminService.deleteAdmin(VALID_ACTOR, VALID_TARGET)).rejects.toThrow(/raison d'au moins/);
  });

  it('rejette la suppression de son propre compte', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN));
    await expect(adminService.deleteAdmin(VALID_ACTOR, VALID_ACTOR, 'nettoyage de compte')).rejects.toThrow(
      'Impossible de supprimer votre propre compte.'
    );
  });

  it('rejette la suppression d\'un superadmin', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN)).mockReturnValueOnce(mockQuery({ role: 'superadmin' }));
    await expect(adminService.deleteAdmin(VALID_ACTOR, VALID_TARGET, 'raison valable ici')).rejects.toThrow(
      'Impossible de supprimer un superadmin.'
    );
  });

  it('supprime le sous-admin et journalise', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(ACTIVE_SUPERADMIN)).mockReturnValueOnce(mockQuery({ role: 'admin' }));
    (Admin.findByIdAndDelete as any).mockResolvedValueOnce({});
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.deleteAdmin(VALID_ACTOR, VALID_TARGET, 'compte compromis');

    expect(Admin.findByIdAndDelete).toHaveBeenCalledWith(VALID_TARGET);
    expect(result.message).toBe('Administrateur supprimé.');
  });
});

// ─── Modération : médecins ──────────────────────────────────────────────────

describe('AdminService.getDoctorVerificationDetails', () => {
  it('rejette si le médecin est introuvable', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:doctors')));
    (Doctor.findById as any).mockReturnValueOnce(mockQuery(null));

    await expect(adminService.getDoctorVerificationDetails(VALID_ACTOR, VALID_TARGET)).rejects.toThrow('Médecin introuvable.');
  });

  it('retourne les champs de vérification sélectionnés', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:doctors')));
    const q = mockQuery({ doctorId: 'DOC-1', status: { isVerified: false } });
    (Doctor.findById as any).mockReturnValueOnce(q);

    const result = await adminService.getDoctorVerificationDetails(VALID_ACTOR, VALID_TARGET);

    expect(q.select).toHaveBeenCalled();
    expect(result).toEqual({ doctorId: 'DOC-1', status: { isVerified: false } });
  });
});

describe('AdminService.setDoctorStatus', () => {
  it('rejette un statut invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:doctors')));
    await expect(adminService.setDoctorStatus(VALID_ACTOR, VALID_TARGET, 'bogus' as any)).rejects.toThrow('Statut invalide.');
  });

  it('exige une raison pour suspended/blocked', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:doctors')));
    await expect(adminService.setDoctorStatus(VALID_ACTOR, VALID_TARGET, 'suspended')).rejects.toThrow(/raison d'au moins/);
  });

  it('n\'exige pas de raison pour réactiver (active)', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:doctors')));
    (doctorService.updateAccountStatus as any).mockResolvedValueOnce({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    await expect(adminService.setDoctorStatus(VALID_ACTOR, VALID_TARGET, 'active')).resolves.toEqual({ message: 'ok' });
    expect(doctorService.updateAccountStatus).toHaveBeenCalledWith(VALID_TARGET, 'active');
  });

  it('journalise "block_doctor" pour un blocage', async () => {
    (Admin.findById as any).mockReturnValue(mockQuery(activeAdminWithPerm('moderate:doctors')));
    (doctorService.updateAccountStatus as any).mockResolvedValue({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockResolvedValue({});

    await adminService.setDoctorStatus(VALID_ACTOR, VALID_TARGET, 'blocked', 'documents falsifiés');

    const pushArg = (Admin.findByIdAndUpdate as any).mock.calls[0][1];
    expect(pushArg.$push.recentActions.$each[0].action).toBe('block_doctor');
  });
});

// ─── Modération : hôpitaux ──────────────────────────────────────────────────

describe('AdminService.verifyHospital', () => {
  it('délègue à hospitalClinicService.verify et journalise', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    (hospitalClinicService.verify as any).mockResolvedValueOnce({ message: 'vérifié' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.verifyHospital(VALID_ACTOR, VALID_TARGET);

    expect(hospitalClinicService.verify).toHaveBeenCalledWith(VALID_TARGET);
    expect(result.message).toBe('vérifié');
  });
});

describe('AdminService.getHospitalVerificationDetails', () => {
  it('rejette si l\'établissement est introuvable', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    (HospitalClinic.findById as any).mockReturnValueOnce(mockQuery(null));

    await expect(adminService.getHospitalVerificationDetails(VALID_ACTOR, VALID_TARGET)).rejects.toThrow(
      'Établissement introuvable.'
    );
  });

  it('retourne les champs sélectionnés', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    const q = mockQuery({ facilityId: 'FAC-1', name: 'Clinique X' });
    (HospitalClinic.findById as any).mockReturnValueOnce(q);

    const result = await adminService.getHospitalVerificationDetails(VALID_ACTOR, VALID_TARGET);
    expect(result).toEqual({ facilityId: 'FAC-1', name: 'Clinique X' });
  });
});

describe('AdminService.setHospitalStatus', () => {
  it('rejette un statut invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    await expect(adminService.setHospitalStatus(VALID_ACTOR, VALID_TARGET, 'bogus' as any)).rejects.toThrow('Statut invalide.');
  });

  it('exige une raison pour un statut différent de "active"', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    await expect(adminService.setHospitalStatus(VALID_ACTOR, VALID_TARGET, 'suspended')).rejects.toThrow(/raison d'au moins/);
  });

  it('journalise "reactivate_hospital" pour une réactivation', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    (hospitalClinicService.updateAccountStatus as any).mockResolvedValueOnce({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    await adminService.setHospitalStatus(VALID_ACTOR, VALID_TARGET, 'active');

    const pushArg = (Admin.findByIdAndUpdate as any).mock.calls[0][1];
    expect(pushArg.$push.recentActions.$each[0].action).toBe('reactivate_hospital');
  });

  it('journalise "suspend_hospital" pour une suspension ou un blocage', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    (hospitalClinicService.updateAccountStatus as any).mockResolvedValueOnce({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    await adminService.setHospitalStatus(VALID_ACTOR, VALID_TARGET, 'blocked', 'documents invalides');

    const pushArg = (Admin.findByIdAndUpdate as any).mock.calls[0][1];
    expect(pushArg.$push.recentActions.$each[0].action).toBe('suspend_hospital');
  });
});

describe('AdminService.createHospital / updateHospital / deleteHospital', () => {
  const dto = { name: 'Clinique X' } as any;

  it('createHospital délègue à hospitalClinicService.create et journalise', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    (hospitalClinicService.create as any).mockResolvedValueOnce({ _id: 'hosp-1' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.createHospital(VALID_ACTOR, dto);

    expect(hospitalClinicService.create).toHaveBeenCalledWith(dto, undefined);
    expect(result).toEqual({ _id: 'hosp-1' });
    const pushArg = (Admin.findByIdAndUpdate as any).mock.calls[0][1];
    expect(pushArg.$push.recentActions.$each[0].action).toBe('create_hospital');
  });

  it('updateHospital rejette un ID cible invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    await expect(adminService.updateHospital(VALID_ACTOR, 'bad-id', dto)).rejects.toThrow(
      'Identifiant établissement invalide.'
    );
  });

  it('updateHospital délègue à hospitalClinicService.update et journalise', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    (hospitalClinicService.update as any).mockResolvedValueOnce({ _id: VALID_TARGET, name: 'Clinique X (MAJ)' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.updateHospital(VALID_ACTOR, VALID_TARGET, dto);

    expect(hospitalClinicService.update).toHaveBeenCalledWith(VALID_TARGET, dto, undefined);
    expect(result).toEqual({ _id: VALID_TARGET, name: 'Clinique X (MAJ)' });
  });

  it('deleteHospital exige une raison puis délègue à hospitalClinicService.delete', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    await expect(adminService.deleteHospital(VALID_ACTOR, VALID_TARGET)).rejects.toThrow(/raison d'au moins/);

    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    (hospitalClinicService.delete as any).mockResolvedValueOnce({ message: 'supprimé' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.deleteHospital(VALID_ACTOR, VALID_TARGET, 'fermeture définitive');
    expect(result.message).toBe('supprimé');
  });
});

// ─── Modération : patients ──────────────────────────────────────────────────

describe('AdminService.setPatientStatus', () => {
  it('rejette un statut invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:patients')));
    await expect(adminService.setPatientStatus(VALID_ACTOR, VALID_TARGET, 'bogus' as any)).rejects.toThrow('Statut invalide.');
  });

  it('exige une raison pour tout statut différent de "active"', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:patients')));
    await expect(adminService.setPatientStatus(VALID_ACTOR, VALID_TARGET, 'blocked')).rejects.toThrow(/raison d'au moins/);
  });

  it('journalise "suspend_patient" pour une suspension', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:patients')));
    (patientService.updateAccountStatus as any).mockResolvedValueOnce({ message: 'ok' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    await adminService.setPatientStatus(VALID_ACTOR, VALID_TARGET, 'suspended', 'signalements répétés');

    const pushArg = (Admin.findByIdAndUpdate as any).mock.calls[0][1];
    expect(pushArg.$push.recentActions.$each[0].action).toBe('suspend_patient');
  });
});

// ─── Modération : avis ──────────────────────────────────────────────────────

describe('AdminService.deleteReview', () => {
  it('exige toujours une raison et journalise après suppression', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:reviews')));
    await expect(adminService.deleteReview(VALID_ACTOR, VALID_TARGET)).rejects.toThrow(/raison d'au moins/);

    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:reviews')));
    (reviewService.adminDeleteReview as any).mockResolvedValueOnce({ message: 'supprimé' });
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminService.deleteReview(VALID_ACTOR, VALID_TARGET, 'contenu injurieux');
    expect(result.message).toBe('supprimé');
  });
});

// ─── Listings paginés ───────────────────────────────────────────────────────

describe('AdminService.listDoctors', () => {
  it('rejette un statut de filtre invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:doctors')));
    await expect(adminService.listDoctors(VALID_ACTOR, { status: 'bogus' })).rejects.toThrow('Statut invalide.');
  });

  it('construit la requête $or à partir de search et pagine correctement', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:doctors')));
    (Doctor.find as any).mockReturnValueOnce(mockQuery([{ doctorId: 'DOC-1' }]));
    (Doctor.countDocuments as any).mockResolvedValueOnce(1);

    const result = await adminService.listDoctors(VALID_ACTOR, { search: 'Kouassi', page: 2, limit: 10 });

    expect(Doctor.find).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.arrayContaining([{ doctorId: { $regex: 'Kouassi', $options: 'i' } }]) })
    );
    expect(result).toEqual({ doctors: [{ doctorId: 'DOC-1' }], total: 1, page: 2, pages: 1 });
  });

  it('plafonne la limite à 100 et le floor de page à 1', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:doctors')));
    const q = mockQuery([]);
    (Doctor.find as any).mockReturnValueOnce(q);
    (Doctor.countDocuments as any).mockResolvedValueOnce(0);

    await adminService.listDoctors(VALID_ACTOR, { page: -5, limit: 9999 });

    expect(q.limit).toHaveBeenCalledWith(100);
    expect(q.skip).toHaveBeenCalledWith(0);
  });
});

describe('AdminService.listHospitals', () => {
  it('filtre correctement sur verified=true/false', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    (HospitalClinic.find as any).mockReturnValueOnce(mockQuery([]));
    (HospitalClinic.countDocuments as any).mockResolvedValueOnce(0);

    await adminService.listHospitals(VALID_ACTOR, { verified: 'true' });

    expect(HospitalClinic.find).toHaveBeenCalledWith(expect.objectContaining({ 'metadata.verified': true }));
  });

  it('rejette un statut de filtre invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:hospitals')));
    await expect(adminService.listHospitals(VALID_ACTOR, { status: 'bogus' })).rejects.toThrow('Statut invalide.');
  });
});

describe('AdminService.listPatients', () => {
  it('vérifie la permission moderate:patients et retourne la pagination', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:patients')));
    (Patient.find as any).mockReturnValueOnce(mockQuery([{ patientId: 'PAT-1' }]));
    (Patient.countDocuments as any).mockResolvedValueOnce(1);

    const result = await adminService.listPatients(VALID_ACTOR, {});
    expect(result.total).toBe(1);
  });

  it('rejette un statut de filtre invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:patients')));
    await expect(adminService.listPatients(VALID_ACTOR, { status: 'bogus' })).rejects.toThrow('Statut invalide.');
  });
});

describe('AdminService.listReviews', () => {
  it('rejette un statut invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:reviews')));
    await expect(adminService.listReviews(VALID_ACTOR, { status: 'nope' })).rejects.toThrow('Statut invalide.');
  });

  it('retourne les avis peuplés docteur/patient', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:reviews')));
    const q = mockQuery([{ rating: 5 }]);
    (Review.find as any).mockReturnValueOnce(q);
    (Review.countDocuments as any).mockResolvedValueOnce(1);

    const result = await adminService.listReviews(VALID_ACTOR, { status: 'flagged' });

    expect(q.populate).toHaveBeenCalledWith('doctorId', 'profile.firstName profile.lastName');
    expect(q.populate).toHaveBeenCalledWith('patientId', 'profile.firstName profile.lastName');
    expect(result.reviews).toEqual([{ rating: 5 }]);
  });
});

describe('AdminService.listSubscriptions', () => {
  it('rejette un plan invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('manage:subscriptions')));
    await expect(adminService.listSubscriptions(VALID_ACTOR, { plan: 'gold' })).rejects.toThrow('Plan invalide.');
  });

  it('filtre par plan et retourne la pagination', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('manage:subscriptions')));
    (Doctor.find as any).mockReturnValueOnce(mockQuery([{ doctorId: 'DOC-1' }]));
    (Doctor.countDocuments as any).mockResolvedValueOnce(1);

    const result = await adminService.listSubscriptions(VALID_ACTOR, { plan: 'premium' });

    expect(Doctor.find).toHaveBeenCalledWith(expect.objectContaining({ 'status.subscription': 'premium' }));
    expect(result.total).toBe(1);
  });
});

describe('AdminService.listPayments', () => {
  it('rejette un statut de paiement invalide', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('manage:payments')));
    await expect(adminService.listPayments(VALID_ACTOR, { status: 'unknown' })).rejects.toThrow('Statut de paiement invalide.');
  });

  it('liste les paiements avec population patient/médecin', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('manage:payments')));
    const q = mockQuery([{ payment: { amount: 5000 } }]);
    (Appointment.find as any).mockReturnValueOnce(q);
    (Appointment.countDocuments as any).mockResolvedValueOnce(1);

    const result = await adminService.listPayments(VALID_ACTOR, { status: 'paid' });

    expect(q.populate).toHaveBeenCalledWith('patientId', 'profile.firstName profile.lastName');
    expect(q.populate).toHaveBeenCalledWith('doctorId', 'profile.firstName profile.lastName');
    expect(result.total).toBe(1);
  });
});

// ─── Supervision / analytics ────────────────────────────────────────────────

describe('AdminService.getDashboardStats', () => {
  it('agrège les compteurs et le CA total', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('view:analytics')));

    (Doctor.countDocuments as any).mockResolvedValueOnce(10).mockResolvedValueOnce(6);
    (Patient.countDocuments as any).mockResolvedValueOnce(50);
    (HospitalClinic.countDocuments as any).mockResolvedValueOnce(4).mockResolvedValueOnce(1);
    (Appointment.countDocuments as any).mockResolvedValueOnce(3).mockResolvedValueOnce(20);
    (Appointment.aggregate as any)
      .mockResolvedValueOnce([{ _id: null, total: 150000 }]) // revenueAgg
      .mockResolvedValueOnce([{ _id: 'completed', count: 20 }]); // appointmentsByStatus
    (Doctor.aggregate as any).mockResolvedValueOnce([{ _id: 'premium', count: 3 }]); // subscriptionBreakdown

    const result = await adminService.getDashboardStats(VALID_ACTOR);

    expect(result.doctors).toEqual({ total: 10, verified: 6, pending: 4 });
    expect(result.patients).toEqual({ total: 50 });
    expect(result.hospitals).toEqual({ total: 4, pendingVerification: 1 });
    expect(result.appointments).toEqual({ active: 3, completed: 20 });
    expect(result.revenue).toEqual({ total: 150000 });
    expect(result.subscriptions).toEqual([{ _id: 'premium', count: 3 }]);
  });

  it('retourne un CA à 0 si aucun paiement n\'existe', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('view:analytics')));
    (Doctor.countDocuments as any).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    (Patient.countDocuments as any).mockResolvedValueOnce(0);
    (HospitalClinic.countDocuments as any).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    (Appointment.countDocuments as any).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    (Appointment.aggregate as any).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    (Doctor.aggregate as any).mockResolvedValueOnce([]);

    const result = await adminService.getDashboardStats(VALID_ACTOR);
    expect(result.revenue).toEqual({ total: 0 });
  });
});

describe('AdminService.getRevenueTimeseries', () => {
  it('remplit les buckets vides sur la période "week" et calcule le grand total', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('view:analytics')));
    (Appointment.aggregate as any).mockResolvedValueOnce([]);

    const result = await adminService.getRevenueTimeseries(VALID_ACTOR, 'week');

    expect(result.data).toHaveLength(7);
    expect(result.grandTotal).toBe(0);
    expect(result.data.every((b: any) => b.total === 0 && b.count === 0)).toBe(true);
  });
});

describe('AdminService.getDoctorPerformance', () => {
  it('rejette si le médecin n\'existe pas', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:doctors')));
    (Doctor.findById as any).mockReturnValueOnce(mockQuery(null));
    (Appointment.aggregate as any).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(adminService.getDoctorPerformance(VALID_ACTOR, VALID_TARGET)).rejects.toThrow('Médecin introuvable.');
  });

  it('regroupe les 6 statuts de rendez-vous dans les 4 catégories métier', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(activeAdminWithPerm('moderate:doctors')));
    (Doctor.findById as any).mockReturnValueOnce(mockQuery({ metadata: { createdAt: new Date('2024-01-01') } }));
    (Appointment.aggregate as any)
      .mockResolvedValueOnce([{ _id: null, total: 30000, count: 3 }]) // revenueAgg
      .mockResolvedValueOnce([
        { _id: 'pending', count: 2 },
        { _id: 'confirmed', count: 1 },
        { _id: 'ongoing', count: 1 },
        { _id: 'completed', count: 3 },
        { _id: 'no_show', count: 1 },
        { _id: 'cancelled', count: 1 },
      ]) // statusCounts
      .mockResolvedValueOnce([]); // timeseries interne

    const result = await adminService.getDoctorPerformance(VALID_ACTOR, VALID_TARGET, 'month');

    expect(result.totalRevenue).toBe(30000);
    expect(result.totalPaidAppointments).toBe(3);
    expect(result.appointments).toEqual({ active: 4, completed: 3, noShow: 1, cancelled: 1 });
  });
});