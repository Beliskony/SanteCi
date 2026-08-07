/**
 * auth.service.test.ts
 *
 * Tests unitaires purs : Doctor, Patient et mailService sont mockés.
 * bcrypt et jsonwebtoken sont RÉELS (comportement de sécurité critique
 * à vérifier pour de vrai, pas seulement mocké).
 *
 * Structure supposée : app/server/services/auth.service.ts, app/server/models/*.ts,
 * app/server/__tests__/auth.service.test.ts (ce fichier).
 */

import bcrypt from 'bcrypt';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ─── Mocks des modèles et du mailService (AVANT l'import du service) ─────────
jest.mock('../models/medcin.model', () => ({
  Doctor: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../models/patient.model', () => ({
  Patient: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../services/mail.service', () => ({
  mailService: {
    sendOtp: jest.fn(async () => undefined),
    sendWelcome: jest.fn(async () => undefined),
  },
}));

import { authService } from '../services/auth.service';
import { Doctor } from '../models/medcin.model';
import { Patient } from '../models/patient.model';
import { mailService } from '../services/mail.service';

// ─── Env de test (le service retombe sur ces valeurs par défaut si absentes) ─
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** select('+security.password') retourne un objet mongoose-like chainable */
function chainable<T>(resolvedValue: T) {
  return {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    then: (resolve: (v: T) => void) => resolve(resolvedValue),
    // Permet aussi `await Model.findOne(...).select(...)`
    [Symbol.toPrimitive]: undefined,
  } as any;
}

// Simplifie : on fait retourner directement la valeur résolue par le mock,
// et on s'assure que .select()/.populate() renvoient bien une Promise résolue.
function mockQuery<T>(value: T) {
  const query: any = Promise.resolve(value);
  query.select = jest.fn().mockReturnValue(Promise.resolve(value));
  query.populate = jest.fn().mockReturnValue(Promise.resolve(value));
  return query;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── registerDoctor ─────────────────────────────────────────────────────────

describe('authService.registerDoctor', () => {
  const dto = {
    firstName: 'Awa',
    lastName: 'Koffi',
    title: 'Dr' as const,
    specialty: 'Cardiologie',
    email: 'awa.koffi@example.com',
    phone: '+2250700000000',
    password: 'motDePasse123!',
    licenseNumber: 'LIC-12345',
    university: 'UFHB',
    graduationYear: 2015,
    city: 'Abidjan',
  };

  it("rejette si un médecin existe déjà avec cet email", async () => {
    (Doctor.findOne as any).mockReturnValue(mockQuery({ _id: 'existing' }));

    await expect(authService.registerDoctor(dto)).rejects.toThrow(
      'Un compte médecin existe déjà avec cet email.'
    );
    expect(Doctor.create).not.toHaveBeenCalled();
  });

  it('crée le médecin avec un mot de passe hashé et retourne des tokens', async () => {
    (Doctor.findOne as any).mockReturnValue(mockQuery(null));

    const createdDoctor = {
      _id: 'doc123',
      doctorId: 'DOC-ABCD1234',
      profile: { firstName: dto.firstName, lastName: dto.lastName },
      contact: { email: dto.email },
      location: { city: dto.city },
      professional: {},
      telemedicine: {},
      status: { accountStatus: 'pending' },
      analytics: {},
    };
    (Doctor.create as any).mockResolvedValue(createdDoctor);

    const result = await authService.registerDoctor(dto);

    // Le mot de passe transmis à Doctor.create doit être hashé, jamais en clair
    const createArg = (Doctor.create as any).mock.calls[0][0];
    expect(createArg.security.password).not.toBe(dto.password);
    expect(await bcrypt.compare(dto.password, createArg.security.password)).toBe(true);

    // Un OTP a bien été généré et stocké (même si l'envoi mail est commenté dans le service)
    expect(createArg.status.verificationCode).toMatch(/^\d{6}$/);

    // Le user retourné ne doit jamais exposer le mot de passe
    expect(result.user).not.toHaveProperty('security');
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
  });
});

// ─── registerPatient ────────────────────────────────────────────────────────

describe('authService.registerPatient', () => {
  const dto = {
    firstName: 'Yao',
    lastName: 'Brou',
    dateOfBirth: new Date('1995-05-01'),
    gender: 'male' as const,
    email: 'yao.brou@example.com',
    phone: '+2250711111111',
    password: 'motDePasse123!',
    city: 'Bouaké',
  };

  it("rejette si l'email est déjà utilisé", async () => {
    (Patient.findOne as any).mockReturnValueOnce(mockQuery({ _id: 'x' }));

    await expect(authService.registerPatient(dto)).rejects.toThrow(
      'Un compte patient existe déjà avec cet email.'
    );
  });

  it('rejette si le téléphone est déjà utilisé', async () => {
    (Patient.findOne as any)
      .mockReturnValueOnce(mockQuery(null))   // check email → libre
      .mockReturnValueOnce(mockQuery({ _id: 'x' })); // check phone → pris

    await expect(authService.registerPatient(dto)).rejects.toThrow(
      'Ce numéro de téléphone est déjà utilisé.'
    );
  });

  it('crée le patient et envoie un OTP si un email est fourni', async () => {
    (Patient.findOne as any).mockReturnValue(mockQuery(null));
    (Patient.create as any).mockResolvedValue({ _id: 'pat123' });

    const result = await authService.registerPatient(dto);

    expect(mailService.sendOtp).toHaveBeenCalledWith(
      dto.email,
      expect.stringMatching(/^\d{6}$/),
      'patient'
    );
    expect(result.message).toMatch(/créé/);
  });

  it("n'envoie pas d'OTP si aucun email n'est fourni", async () => {
    (Patient.findOne as any).mockReturnValue(mockQuery(null));
    (Patient.create as any).mockResolvedValue({ _id: 'pat123' });

    await authService.registerPatient({ ...dto, email: undefined });

    expect(mailService.sendOtp).not.toHaveBeenCalled();
  });
});

// ─── login (médecin) ────────────────────────────────────────────────────────

describe('authService.login — médecin', () => {
  it("rejette si aucun compte ne correspond à l'identifiant", async () => {
    (Doctor.findOne as any).mockReturnValue(mockQuery(null));

    await expect(
      authService.login({ identifiantLogin: 'inconnu@x.com', password: 'x', role: 'doctor' })
    ).rejects.toThrow('Email ou mot de passe incorrect.');
  });

  it('rejette si le compte est suspendu ou bloqué', async () => {
    (Doctor.findOne as any).mockReturnValue(
      mockQuery({ status: { accountStatus: 'suspended' } })
    );

    await expect(
      authService.login({ identifiantLogin: 'x@x.com', password: 'x', role: 'doctor' })
    ).rejects.toThrow('Votre compte est suspendu ou bloqué.');
  });

  it('rejette si le mot de passe est incorrect', async () => {
    const hashed = await bcrypt.hash('bonMotDePasse', 12);
    (Doctor.findOne as any).mockReturnValue(
      mockQuery({ status: { accountStatus: 'active' }, security: { password: hashed } })
    );

    await expect(
      authService.login({ identifiantLogin: 'x@x.com', password: 'mauvais', role: 'doctor' })
    ).rejects.toThrow('Email ou mot de passe incorrect.');
  });

  it('connecte le médecin, retourne des tokens et marque isOnline=true', async () => {
    const hashed = await bcrypt.hash('bonMotDePasse', 12);
    const doctor = {
      _id: 'doc1',
      doctorId: 'DOC-1',
      status: { accountStatus: 'active' },
      security: { password: hashed },
      contact: { email: 'x@x.com' },
      profile: {},
      location: {},
      professional: {},
      telemedicine: {},
      analytics: {},
    };
    (Doctor.findOne as any).mockReturnValue(mockQuery(doctor));
    (Doctor.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await authService.login({
      identifiantLogin: 'x@x.com',
      password: 'bonMotDePasse',
      role: 'doctor',
    });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(Doctor.findByIdAndUpdate).toHaveBeenCalledWith(
      'doc1',
      expect.objectContaining({ 'status.isOnline': true })
    );
  });
});

// ─── login (patient) — verrouillage de compte ──────────────────────────────

describe('authService.login — patient (verrouillage)', () => {
  it('rejette immédiatement si le compte est verrouillé (lockUntil futur)', async () => {
    const patient = {
      security: { lockUntil: new Date(Date.now() + 10 * 60 * 1000) },
      status: { accountStatus: 'active' },
    };
    (Patient.findOne as any).mockReturnValue(mockQuery(patient));

    await expect(
      authService.login({ identifiantLogin: 'p@p.com', password: 'x', role: 'patient' })
    ).rejects.toThrow(/verrouillé/);
  });

  it('incrémente failedAttempts sur un mauvais mot de passe', async () => {
    const hashed = await bcrypt.hash('bonMdp', 12);
    const patient = {
      _id: 'pat1',
      security: { password: hashed, failedAttempts: 2, lockUntil: null },
      status: { accountStatus: 'active' },
    };
    (Patient.findOne as any).mockReturnValue(mockQuery(patient));
    (Patient.findByIdAndUpdate as any).mockResolvedValue(undefined);

    await expect(
      authService.login({ identifiantLogin: 'p@p.com', password: 'faux', role: 'patient' })
    ).rejects.toThrow('Email ou mot de passe incorrect.');

    expect(Patient.findByIdAndUpdate).toHaveBeenCalledWith(
      'pat1',
      expect.objectContaining({ 'security.failedAttempts': 3 })
    );
  });

  it('verrouille le compte au 5e échec consécutif', async () => {
    const hashed = await bcrypt.hash('bonMdp', 12);
    const patient = {
      _id: 'pat1',
      security: { password: hashed, failedAttempts: 4, lockUntil: null },
      status: { accountStatus: 'active' },
    };
    (Patient.findOne as any).mockReturnValue(mockQuery(patient));
    (Patient.findByIdAndUpdate as any).mockResolvedValue(undefined);

    await expect(
      authService.login({ identifiantLogin: 'p@p.com', password: 'faux', role: 'patient' })
    ).rejects.toThrow();

    const updateArg = (Patient.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg['security.failedAttempts']).toBe(5);
    expect(updateArg['security.lockUntil']).toBeInstanceOf(Date);
  });

  it('réinitialise failedAttempts après une connexion réussie', async () => {
    const hashed = await bcrypt.hash('bonMdp', 12);
    const patient = {
      _id: 'pat1',
      security: { password: hashed, failedAttempts: 3, lockUntil: null },
      status: { accountStatus: 'active', isVerified: true },
      profile: { firstName: 'Yao', lastName: 'Brou', bloodGroup: undefined, gender: 'male', photo: undefined },
      contact: { email: 'p@p.com' },
      health: {
        allergies: [],
        chronicDiseases: [],
        currentMedications: [],
        disabilities: [],
      },
      location: { city: 'Bouaké', district: undefined, address: undefined, coordinates: undefined },
    };
    (Patient.findOne as any).mockReturnValue(mockQuery(patient));
    (Patient.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await authService.login({
      identifiantLogin: 'p@p.com',
      password: 'bonMdp',
      role: 'patient',
    });

    expect(Patient.findByIdAndUpdate).toHaveBeenCalledWith(
      'pat1',
      expect.objectContaining({ 'security.failedAttempts': 0, 'security.lockUntil': null })
    );
    expect(result.accessToken).toEqual(expect.any(String));
  });
});

// ─── refreshToken ───────────────────────────────────────────────────────────

describe('authService.refreshToken', () => {
  it('rejette un token invalide', async () => {
    await expect(authService.refreshToken('token-invalide')).rejects.toThrow(
      'Refresh token invalide ou expiré.'
    );
  });

  it('rejette si le médecin associé au token est bloqué', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: 'doc1', role: 'doctor', email: 'x@x.com' },
      process.env.JWT_REFRESH_SECRET
    );
    (Doctor.findById as any).mockReturnValue(mockQuery({ status: { accountStatus: 'blocked' } }));

    await expect(authService.refreshToken(token)).rejects.toThrow('Compte introuvable ou bloqué.');
  });

  it('retourne de nouveaux tokens pour un patient actif', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: 'pat1', role: 'patient', email: 'p@p.com' },
      process.env.JWT_REFRESH_SECRET
    );
    (Patient.findById as any).mockReturnValue(mockQuery({ security: { isActive: true } }));

    const result = await authService.refreshToken(token);
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
  });
});

// ─── verifyOtp ──────────────────────────────────────────────────────────────

describe('authService.verifyOtp', () => {
  it("rejette un code OTP incorrect", async () => {
    (Patient.findOne as any).mockReturnValue(
      mockQuery({ status: { verificationCode: '123456', verificationExpires: new Date(Date.now() + 60000) } })
    );

    await expect(authService.verifyOtp('p@p.com', '000000', 'patient')).rejects.toThrow(
      'Code OTP invalide.'
    );
  });

  it('rejette un code OTP expiré', async () => {
    (Patient.findOne as any).mockReturnValue(
      mockQuery({ status: { verificationCode: '123456', verificationExpires: new Date(Date.now() - 1000) } })
    );

    await expect(authService.verifyOtp('p@p.com', '123456', 'patient')).rejects.toThrow(
      'Code OTP expiré. Demandez-en un nouveau.'
    );
  });

  it('valide un OTP correct et envoie l\'email de bienvenue', async () => {
    (Patient.findOne as any).mockReturnValue(
      mockQuery({
        _id: 'pat1',
        profile: { firstName: 'Yao' },
        status: { verificationCode: '123456', verificationExpires: new Date(Date.now() + 60000) },
      })
    );
    (Patient.findByIdAndUpdate as any).mockResolvedValue(undefined);

    const result = await authService.verifyOtp('p@p.com', '123456', 'patient');

    expect(Patient.findByIdAndUpdate).toHaveBeenCalledWith(
      'pat1',
      expect.objectContaining({ 'status.isVerified': true })
    );
    expect(mailService.sendWelcome).toHaveBeenCalledWith('p@p.com', 'Yao', 'patient');
    expect(result.message).toMatch(/vérifié/);
  });
});

// ─── changePassword ─────────────────────────────────────────────────────────

describe('authService.changePassword', () => {
  it("rejette si le mot de passe actuel est incorrect", async () => {
    const hashed = await bcrypt.hash('ancienMdp', 12);
    (Patient.findById as any).mockReturnValue(mockQuery({ security: { password: hashed } }));

    await expect(
      authService.changePassword('pat1', 'patient', 'mauvaisMdp', 'nouveauMdp')
    ).rejects.toThrow('Mot de passe actuel incorrect.');
  });

  it('met à jour le mot de passe avec un nouveau hash valide', async () => {
    const hashed = await bcrypt.hash('ancienMdp', 12);
    (Patient.findById as any).mockReturnValue(mockQuery({ security: { password: hashed } }));
    (Patient.findByIdAndUpdate as any).mockResolvedValue(undefined);

    await authService.changePassword('pat1', 'patient', 'ancienMdp', 'nouveauMdp');

    const updateArg = (Patient.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg['security.password']).not.toBe('nouveauMdp');
    expect(await bcrypt.compare('nouveauMdp', updateArg['security.password'])).toBe(true);
  });
});