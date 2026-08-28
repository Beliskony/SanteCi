/**
 * auth.integration.test.ts
 *
 * Tests d'intégration pour auth.service.ts.
 * MongoDB en mémoire réelle — pas de mocks de modèles.
 * mailService reste mocké (pas de vrai SMTP).
 *
 * À placer dans : app/server/__tests__/integration/auth.integration.test.ts
 *
 * Lancer avec : npx jest --config jest.integration.config.js
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import bcrypt from 'bcrypt';

// ── mailService mocké — pas de vrai SMTP en test ──────────────────────────
jest.mock('../../services/mail.service', () => ({
  mailService: {
    sendOtp:    jest.fn(async () => undefined),
    sendWelcome: jest.fn(async () => undefined),
    sendPasswordReset: jest.fn(async () => undefined),
  },
}));

import { setupTestDB, clearDB, teardownTestDB } from './setup';
import { authService } from '../../services/auth.service';
import { Doctor } from '../../models/medcin.model';
import { Patient } from '../../models/patient.model';
import { mailService } from '../../services/mail.service';

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

// ─── DTOs de base ────────────────────────────────────────────────────────────

const doctorDto = {
  firstName:      'Awa',
  lastName:       'Koffi',
  title:          'Dr' as const,
  specialty:      'Cardiologie',
  email:          'awa.koffi@test.ci',
  phone:          '+2250700000001',
  password:       'MotDePasse123!',
  licenseNumber:  'LIC-TEST-001',
  university:     'UFHB',
  graduationYear: 2015,
  city:           'Abidjan',
};

const patientDto = {
  firstName:   'Yao',
  lastName:    'Brou',
  dateOfBirth: new Date('1995-05-01'),
  gender:      'male' as const,
  email:       'yao.brou@test.ci',
  phone:       '+2250711111111',
  password:    'MotDePasse123!',
  city:        'Bouaké',
};

// ─── registerDoctor ──────────────────────────────────────────────────────────

describe('[intégration] authService.registerDoctor', () => {
  it('crée un médecin avec un mot de passe hashé en DB', async () => {
    await authService.registerDoctor(doctorDto);

    const doctor = await Doctor.findOne({ 'contact.email': doctorDto.email })
      .select('+security.password');

    expect(doctor).not.toBeNull();
    expect(doctor!.contact.email).toBe(doctorDto.email);

    // Le mot de passe en DB ne doit jamais être en clair
    expect(doctor!.security.password).not.toBe(doctorDto.password);
    const isHashed = await bcrypt.compare(doctorDto.password, doctor!.security.password);
    expect(isHashed).toBe(true);
  });

  it('rejette réellement si l\'email existe déjà en DB', async () => {
    // Premier enregistrement
    await authService.registerDoctor(doctorDto);

    // Deuxième tentative avec le même email
    await expect(authService.registerDoctor(doctorDto)).rejects.toThrow(
      'Un compte médecin existe déjà avec cet email.'
    );

    // Vérifier qu'il n'y a bien qu'un seul document en DB
    const count = await Doctor.countDocuments({ 'contact.email': doctorDto.email });
    expect(count).toBe(1);
  });

  it('génère un OTP 6 chiffres stocké en DB', async () => {
    await authService.registerDoctor(doctorDto);

    const doctor = await Doctor.findOne({ 'contact.email': doctorDto.email });
    expect(doctor!.status.verificationCode).toMatch(/^\d{6}$/);
    expect(doctor!.status.verificationExpires).toBeInstanceOf(Date);
    expect(doctor!.status.verificationExpires! > new Date()).toBe(true);
  });

  it('retourne des tokens JWT valides', async () => {
    const result = await authService.registerDoctor(doctorDto);

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));

    // Décoder sans vérifier la signature pour confirmer le payload
    const jwt = require('jsonwebtoken');
    const payload = jwt.decode(result.accessToken) as any;
    expect(payload.role).toBe('doctor');
    expect(payload.email).toBe(doctorDto.email);
  });
});

// ─── registerPatient ─────────────────────────────────────────────────────────

describe('[intégration] authService.registerPatient', () => {
  it('crée un patient et envoie un OTP par email', async () => {
    await authService.registerPatient(patientDto);

    const patient = await Patient.findOne({ 'contact.email': patientDto.email });
    expect(patient).not.toBeNull();
    expect(mailService.sendOtp).toHaveBeenCalledWith(
      patientDto.email,
      expect.stringMatching(/^\d{6}$/),
      'patient'
    );
  });

  it('rejette réellement si l\'email est déjà pris', async () => {
    await authService.registerPatient(patientDto);

    await expect(authService.registerPatient(patientDto)).rejects.toThrow(
      'Un compte patient existe déjà avec cet email.'
    );

    const count = await Patient.countDocuments({ 'contact.email': patientDto.email });
    expect(count).toBe(1);
  });

  it('rejette si le numéro de téléphone est déjà utilisé', async () => {
    await authService.registerPatient(patientDto);

    await expect(
      authService.registerPatient({ ...patientDto, email: 'autre@test.ci' })
    ).rejects.toThrow('Ce numéro de téléphone est déjà utilisé.');
  });
});

// ─── login ───────────────────────────────────────────────────────────────────

describe('[intégration] authService.login — médecin', () => {
  beforeEach(async () => {
    // Créer un médecin actif avant chaque test de login
    await authService.registerDoctor(doctorDto);
    // Passer en status "active" pour permettre le login
    await Doctor.findOneAndUpdate(
      { 'contact.email': doctorDto.email },
      { 'status.accountStatus': 'active' }
    );
  });

  it('connecte le médecin et retourne des tokens valides', async () => {
    const result = await authService.login({
      identifiantLogin: doctorDto.email,
      password:         doctorDto.password,
      role:             'doctor',
    });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.user).toMatchObject({ role: 'doctor' });
  });

  it('marque le médecin comme isOnline=true en DB après login', async () => {
    await authService.login({
      identifiantLogin: doctorDto.email,
      password:         doctorDto.password,
      role:             'doctor',
    });

    const doctor = await Doctor.findOne({ 'contact.email': doctorDto.email });
    expect(doctor!.status.isOnline).toBe(true);
  });

  it('rejette avec un mauvais mot de passe', async () => {
    await expect(
      authService.login({
        identifiantLogin: doctorDto.email,
        password:         'mauvaisMotDePasse',
        role:             'doctor',
      })
    ).rejects.toThrow('Email ou mot de passe incorrect.');
  });
});

describe('[intégration] authService.login — patient (verrouillage)', () => {
  beforeEach(async () => {
    await authService.registerPatient(patientDto);
  });

  it('verrouille le compte après 5 échecs consécutifs', async () => {
    for (let i = 0; i < 5; i++) {
      await authService.login({
        identifiantLogin: patientDto.email,
        password:         'mauvaisMdp',
        role:             'patient',
      }).catch(() => {});
    }

    const patient = await Patient.findOne({ 'contact.email': patientDto.email });
    expect(patient!.security.failedAttempts).toBe(5);
    expect(patient!.security.lockUntil).toBeInstanceOf(Date);
    expect(patient!.security.lockUntil! > new Date()).toBe(true);
  });

  it('réinitialise failedAttempts après un login réussi', async () => {
    // 3 échecs d'abord
    for (let i = 0; i < 3; i++) {
      await authService.login({
        identifiantLogin: patientDto.email,
        password:         'mauvaisMdp',
        role:             'patient',
      }).catch(() => {});
    }

    // Login réussi
    await authService.login({
      identifiantLogin: patientDto.email,
      password:         patientDto.password,
      role:             'patient',
    });

    const patient = await Patient.findOne({ 'contact.email': patientDto.email });
    expect(patient!.security.failedAttempts).toBe(0);
    expect(patient!.security.lockUntil).toBeNull();
  });
});

// ─── verifyOtp ───────────────────────────────────────────────────────────────

describe('[intégration] authService.verifyOtp', () => {
it("valide l'OTP sans modifier la DB (l'OTP reste actif pour resetPassword)", async () => {
  await authService.registerPatient(patientDto);

  const patient = await Patient.findOne({ 'contact.email': patientDto.email });
  const otp = patient!.status.verificationCode!;

  const result = await authService.verifyOtp(patientDto.email, otp, 'patient');
  expect(result.message).toBe('OTP valide.');

  const updated = await Patient.findOne({ 'contact.email': patientDto.email });
  // ✅ Nouveau comportement : rien n'est modifié en DB par verifyOtp seul
  expect(updated!.status.isVerified).toBe(false);
  expect(updated!.contact.emailVerified).toBe(false);
  expect(updated!.status.verificationCode).toBe(otp);
});

it("n'envoie pas d'email de bienvenue lors d'un simple verifyOtp", async () => {
  await authService.registerPatient(patientDto);
  const patient = await Patient.findOne({ 'contact.email': patientDto.email });
  const otp = patient!.status.verificationCode!;

  await authService.verifyOtp(patientDto.email, otp, 'patient');

  expect(mailService.sendWelcome).not.toHaveBeenCalled();
});
});

// ─── changePassword ───────────────────────────────────────────────────────────

describe('[intégration] authService.changePassword', () => {
  it('met à jour le hash du mot de passe en DB', async () => {
    await authService.registerPatient(patientDto);
    const patient = await Patient.findOne({ 'contact.email': patientDto.email });

    await authService.changePassword(
      String(patient!._id),
      'patient',
      patientDto.password,
      'NouveauMdp456!'
    );

    const updated = await Patient.findOne({ 'contact.email': patientDto.email })
      .select('+security.password');

    // L'ancien mot de passe ne doit plus fonctionner
    const oldWorks = await bcrypt.compare(patientDto.password, updated!.security.password);
    expect(oldWorks).toBe(false);

    // Le nouveau doit fonctionner
    const newWorks = await bcrypt.compare('NouveauMdp456!', updated!.security.password);
    expect(newWorks).toBe(true);
  });
});