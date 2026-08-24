/**
 * Admin.Service.integration.test.ts
 *
 * Tests d'intégration pour Admin.Service.ts.
 * MongoDB en mémoire réelle (via ./setup, comme
 * Admin.Auth.Service.integration.test.ts) — le modèle Admin est réel :
 * assertActorPermission/assertSuperAdmin, logAction, save(), et
 * findByIdAndDelete touchent vraiment la base.
 *
 * Les quatre services délégués (doctorService, patientService,
 * hospitalClinicService, reviewService) restent mockés : ce sont des
 * dépendances externes au même titre que mailService dans l'exemple
 * d'auth, et leur schéma interne n'est pas disponible ici.
 *
 * Les méthodes de lecture qui interrogent directement Doctor / Patient /
 * HospitalClinic / Review / Appointment (listDoctors, listPatients,
 * listHospitals, listReviews, listSubscriptions, listPayments,
 * getDashboardStats, getRevenueTimeseries, getDoctorPerformance,
 * get*VerificationDetails) ne sont PAS couvertes ici — leurs schémas
 * réels ne sont pas connus ; elles sont couvertes en unitaire dans
 * Admin.Service.test.ts.
 *
 * À placer dans : app/server/__tests__/integration/Admin.Service.integration.test.ts
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// ── Mocks des services délégués (dépendances externes au modèle Admin) ────
jest.mock('../../services/doctor.service', () => ({
  doctorService: { verify: jest.fn(async () => ({ message: 'Médecin vérifié.' })), updateAccountStatus: jest.fn(async () => ({ message: 'Statut médecin mis à jour.' })) },
}));
jest.mock('../../services/patient.service', () => ({
  patientService: { updateAccountStatus: jest.fn(async () => ({ message: 'Statut patient mis à jour.' })) },
}));
jest.mock('../../services/hopital.service', () => ({
  hospitalClinicService: { verify: jest.fn(async () => ({ message: 'Établissement vérifié.' })), updateAccountStatus: jest.fn(async () => ({ message: 'Statut établissement mis à jour.' })) },
}));
jest.mock('../../services/review.service', () => ({
  reviewService: { adminDeleteReview: jest.fn(async () => ({ message: 'Avis supprimé.' })) },
}));

import { setupTestDB, clearDB, teardownTestDB } from './setup';
import { adminService } from '../../services/Admin.service';
import { Admin } from '../../models/admin.model';
import { doctorService } from '../../services/doctor.service';
import { hospitalClinicService } from '../../services/hopital.service';
import { patientService } from '../../services/patient.service';

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  await setupTestDB();
});
afterAll(async () => {
  await teardownTestDB();
});
beforeEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createSuperAdmin(overrides: any = {}) {
  return Admin.create({
    adminId: `ADM-SUPER-${Date.now()}-${Math.random()}`,
    profile: { fullName: 'Axel Sylvain' },
    contact: {
      email: `super-${Date.now()}-${Math.random()}@sante.ci`,
      phone: `+225070${Math.floor(1000000 + Math.random() * 8999999)}`,
    },
    role: 'superadmin',
    permissions: [],
    security: { password: 'x', isAdmin: true, failedAttempts: 0 },
    status: { accountStatus: 'active' },
    ...overrides,
  });
}

async function createAdmin(overrides: any = {}) {
  return Admin.create({
    adminId: `ADM-${Date.now()}-${Math.random()}`,
    profile: { fullName: 'Jeanne Kouassi' },
    contact: {
      email: `admin-${Date.now()}-${Math.random()}@sante.ci`,
      phone: `+225070${Math.floor(1000000 + Math.random() * 8999999)}`,
    },
    role: 'admin',
    permissions: [],
    security: { password: 'x', isAdmin: true, failedAttempts: 0 },
    status: { accountStatus: 'active' },
    ...overrides,
  });
}

// ─── createSubAdmin — persistance réelle ─────────────────────────────────────

describe('[intégration] adminService.createSubAdmin', () => {
  it('crée réellement un sous-admin en base avec un mot de passe hashé', async () => {
    const superAdmin = await createSuperAdmin();

    const dto = {
      fullName: 'Jeanne Kouassi',
      email: 'jeanne@sante.ci',
      phone: '+2250700000099',
      password: 'S3cur3Pass!',
      permissions: ['moderate:doctors'],
    };
    const result = await adminService.createSubAdmin(String(superAdmin._id), dto as any);

    const stored = await Admin.findOne({ 'contact.email': dto.email }).select('+security.password');
    expect(stored).not.toBeNull();
    expect(stored!.role).toBe('admin');
    expect(stored!.security.password).not.toBe(dto.password);
    expect(result.adminId).toMatch(/^ADM-/);
  });

  it('journalise la création dans recentActions du créateur', async () => {
    const superAdmin = await createSuperAdmin();

    await adminService.createSubAdmin(String(superAdmin._id), {
      fullName: 'Jeanne Kouassi',
      email: 'jeanne2@sante.ci',
      phone: '+2250700000098',
      password: 'S3cur3Pass!',
      permissions: ['moderate:doctors'],
    } as any);

    const updatedCreator = await Admin.findById(superAdmin._id);
    expect(updatedCreator!.recentActions).toHaveLength(1);
    expect(updatedCreator!.recentActions[0]).toMatchObject({ action: 'create_admin', targetType: 'admin' });
  });

  it('rejette la création par un admin non-superadmin', async () => {
    const admin = await createAdmin();

    await expect(
      adminService.createSubAdmin(String(admin._id), {
        fullName: 'X',
        email: 'x@sante.ci',
        phone: '+2250700000097',
        password: 'S3cur3Pass!',
        permissions: ['moderate:doctors'],
      } as any)
    ).rejects.toThrow('Réservé au superadmin.');
  });

  it('rejette un email déjà utilisé', async () => {
    const superAdmin = await createSuperAdmin();
    await createAdmin({ 'contact.email': 'dup@sante.ci' });

    await expect(
      adminService.createSubAdmin(String(superAdmin._id), {
        fullName: 'X',
        email: 'dup@sante.ci',
        phone: '+2250700000096',
        password: 'S3cur3Pass!',
        permissions: ['moderate:doctors'],
      } as any)
    ).rejects.toThrow('Cet email est déjà utilisé.');
  });
});

// ─── listAdmins / getAdminById ────────────────────────────────────────────────

describe('[intégration] adminService.listAdmins / getAdminById', () => {
  it('liste les admins réellement présents en base, sans le mot de passe', async () => {
    const superAdmin = await createSuperAdmin();
    await createAdmin();
    await createAdmin();

    const admins = await adminService.listAdmins(String(superAdmin._id));

    expect(admins).toHaveLength(3);
    expect((admins[0] as any).security?.password).toBeUndefined();
  });

  it('récupère un admin précis par id', async () => {
    const superAdmin = await createSuperAdmin();
    const target = await createAdmin();

    const result = await adminService.getAdminById(String(superAdmin._id), String(target._id));
    expect(String((result as any)._id)).toBe(String(target._id));
  });
});

// ─── updatePermissions — persistance réelle ──────────────────────────────────

describe('[intégration] adminService.updatePermissions', () => {
  it('persiste les nouvelles permissions en base', async () => {
    const superAdmin = await createSuperAdmin();
    const target = await createAdmin({ permissions: [] });

    await adminService.updatePermissions(String(superAdmin._id), String(target._id), [
      'moderate:doctors',
      'moderate:hospitals',
    ] as any);

    const stored = await Admin.findById(target._id);
    expect(stored!.permissions).toEqual(['moderate:doctors', 'moderate:hospitals']);
  });

  it('refuse de modifier les permissions d\'un superadmin', async () => {
    const superAdmin = await createSuperAdmin();
    const otherSuperAdmin = await createSuperAdmin();

    await expect(
      adminService.updatePermissions(String(superAdmin._id), String(otherSuperAdmin._id), [
        'moderate:doctors',
      ] as any)
    ).rejects.toThrow("Impossible de modifier les permissions d'un superadmin.");
  });
});

// ─── setAdminStatus — verrouillage / suspension réels ────────────────────────

describe('[intégration] adminService.setAdminStatus', () => {
  it('suspend réellement le compte cible en base', async () => {
    const superAdmin = await createSuperAdmin();
    const target = await createAdmin();

    const result = await adminService.setAdminStatus(
      String(superAdmin._id),
      String(target._id),
      'suspended',
      'comportement suspect'
    );

    const stored = await Admin.findById(target._id);
    expect(stored!.status.accountStatus).toBe('suspended');
    expect(result.message).toBe('Statut mis à jour : suspended');
  });

  it('empêche un admin de modifier son propre statut', async () => {
    const superAdmin = await createSuperAdmin();

    await expect(
      adminService.setAdminStatus(String(superAdmin._id), String(superAdmin._id), 'suspended', 'raison valide')
    ).rejects.toThrow('Impossible de modifier votre propre statut.');
  });

  it('empêche de suspendre un superadmin', async () => {
    const superAdmin = await createSuperAdmin();
    const otherSuperAdmin = await createSuperAdmin();

    await expect(
      adminService.setAdminStatus(String(superAdmin._id), String(otherSuperAdmin._id), 'suspended', 'raison valide')
    ).rejects.toThrow('Impossible de suspendre un superadmin.');
  });
});

// ─── deleteAdmin — suppression réelle ─────────────────────────────────────────

describe('[intégration] adminService.deleteAdmin', () => {
  it('supprime réellement le document en base', async () => {
    const superAdmin = await createSuperAdmin();
    const target = await createAdmin();

    await adminService.deleteAdmin(String(superAdmin._id), String(target._id), 'départ de l\'équipe');

    const stored = await Admin.findById(target._id);
    expect(stored).toBeNull();
  });

  it('journalise la suppression dans recentActions du superadmin', async () => {
    const superAdmin = await createSuperAdmin();
    const target = await createAdmin();

    await adminService.deleteAdmin(String(superAdmin._id), String(target._id), 'départ de l\'équipe');

    const updatedActor = await Admin.findById(superAdmin._id);
    expect(updatedActor!.recentActions[0]).toMatchObject({ action: 'delete_admin', targetType: 'admin' });
  });
});

// ─── Modération déléguée : permission réelle + délégation + journalisation ───

describe('[intégration] adminService — modération déléguée (médecins, hôpitaux, patients, avis)', () => {
  it('verifyDoctor : rejette si l\'admin n\'a pas la permission moderate:doctors', async () => {
    const admin = await createAdmin({ permissions: [] });

    await expect(adminService.verifyDoctor(String(admin._id), String(admin._id))).rejects.toThrow(
      'Permission insuffisante.'
    );
    expect(doctorService.verify).not.toHaveBeenCalled();
  });

  it('verifyDoctor : délègue au service et journalise en base pour un admin habilité', async () => {
    const admin = await createAdmin({ permissions: ['moderate:doctors'] });
    const doctorId = String(admin._id); // simple id valide pour ce test, pas un vrai document Doctor

    const result = await adminService.verifyDoctor(String(admin._id), doctorId);

    expect(doctorService.verify).toHaveBeenCalledWith(doctorId);
    expect(result).toEqual({ message: 'Médecin vérifié.' });

    const stored = await Admin.findById(admin._id);
    expect(stored!.recentActions[0]).toMatchObject({ action: 'verify_doctor', targetType: 'doctor' });
  });

  it('setHospitalStatus : exige une raison en base réelle pour une suspension', async () => {
    const admin = await createAdmin({ permissions: ['moderate:hospitals'] });

    await expect(
      adminService.setHospitalStatus(String(admin._id), String(admin._id), 'suspended')
    ).rejects.toThrow(/raison d'au moins 5 caractères/);
    expect(hospitalClinicService.updateAccountStatus).not.toHaveBeenCalled();
  });

  it('setPatientStatus : délègue et journalise pour un admin habilité', async () => {
    const admin = await createAdmin({ permissions: ['moderate:patients'] });
    const patientId = String(admin._id);

    await adminService.setPatientStatus(String(admin._id), patientId, 'blocked', 'fraude avérée');

    expect(patientService.updateAccountStatus).toHaveBeenCalledWith(patientId, 'blocked');
    const stored = await Admin.findById(admin._id);
    expect(stored!.recentActions[0]).toMatchObject({ action: 'block_patient', targetType: 'patient' });
  });

  it('deleteReview : rejette si le compte administrateur est suspendu', async () => {
    const admin = await createAdmin({ permissions: ['moderate:reviews'], status: { accountStatus: 'suspended' } });

    await expect(
      adminService.deleteReview(String(admin._id), String(admin._id), 'contenu inapproprié')
    ).rejects.toThrow('Compte administrateur suspendu ou bloqué.');
  });
});