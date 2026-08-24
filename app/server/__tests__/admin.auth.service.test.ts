/**
 * Admin.Auth.Service.test.ts
 *
 * Tests unitaires purs : Admin et mailService sont mockés.
 * Structure identique à appointment.service.test.ts :
 * app/server/services/Admin.Auth.Service.ts, app/server/models/admin.model.ts,
 * app/server/__tests__/Admin.Auth.Service.test.ts (ce fichier).
 *
 * Point important : login/changePassword/resetPassword font
 * `Admin.findOne(...)` ou `Admin.findById(...)` puis, pour certains flux,
 * enchaînent `.select('+security.password')`. Le mock doit donc pouvoir être
 * `await`-é directement OU chaîné — voir mockQuery ci-dessous.
 */

import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';

jest.mock('../models/admin.model', () => ({
  Admin: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../services/mail.service', () => ({
  mailService: {
    sendOtp: jest.fn(async () => undefined),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { adminAuthService } from '../services/Admin.Auth.Service';
import { Admin } from '../models/admin.model';
import { mailService } from '../services/mail.service';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Simule un curseur Mongoose chaînable (.select/.lean/...) qui résout
 *  toujours vers la même valeur, qu'on l'`await` directement ou après
 *  un ou plusieurs maillons de chaîne. */
function mockQuery<T>(value: T) {
  const query: any = Promise.resolve(value);
  query.select = jest.fn().mockReturnValue(query);
  query.lean = jest.fn().mockReturnValue(Promise.resolve(value));
  return query;
}

const OLD_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...OLD_ENV };
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.ADMIN_BOOTSTRAP_SECRET = 'bootstrap-secret';

  (jwt.sign as any).mockImplementation((_payload: any, secret: any) => `signed-with-${secret}`);
});

afterAll(() => {
  process.env = OLD_ENV;
});

// ─── registerFirstSuperAdmin ──────────────────────────────────────────────

describe('adminAuthService.registerFirstSuperAdmin', () => {
  const dto = {
    fullName: 'Axel Sylvain',
    email: 'axel@sante.ci',
    phone: '+2250700000000',
    password: 'S3cur3Pass!',
    bootstrapSecret: 'bootstrap-secret',
  };

  it('rejette si le bootstrapSecret ne correspond pas à l\'env', async () => {
    await expect(
      adminAuthService.registerFirstSuperAdmin({ ...dto, bootstrapSecret: 'wrong' })
    ).rejects.toThrow('Non autorisé.');
    expect(Admin.create).not.toHaveBeenCalled();
  });

  it('rejette si ADMIN_BOOTSTRAP_SECRET n\'est pas configuré côté serveur', async () => {
    delete process.env.ADMIN_BOOTSTRAP_SECRET;
    await expect(adminAuthService.registerFirstSuperAdmin(dto)).rejects.toThrow('Non autorisé.');
  });

  it('rejette si un superadmin existe déjà', async () => {
    (Admin.findOne as any).mockReturnValueOnce(mockQuery({ _id: 'existing' }));

    await expect(adminAuthService.registerFirstSuperAdmin(dto)).rejects.toThrow('Un superadmin existe déjà');
    expect(Admin.findOne).toHaveBeenCalledWith({ role: 'superadmin' });
  });

  it('rejette si l\'email est déjà utilisé', async () => {
    (Admin.findOne as any)
      .mockReturnValueOnce(mockQuery(null))
      .mockReturnValueOnce(mockQuery({ _id: 'someone' }));

    await expect(adminAuthService.registerFirstSuperAdmin(dto)).rejects.toThrow('Cet email est déjà utilisé.');
  });

  it('crée le superadmin, hash le mot de passe et retourne des tokens + user', async () => {
    (Admin.findOne as any).mockReturnValueOnce(mockQuery(null)).mockReturnValueOnce(mockQuery(null));
    (bcrypt.hash as any).mockResolvedValueOnce('hashed-pwd');

    const createdDoc = {
      _id: 'admin-1',
      adminId: 'ADM-ABC123',
      role: 'superadmin',
      profile: { fullName: dto.fullName },
      contact: { email: dto.email, phone: dto.phone },
      permissions: [],
      status: { accountStatus: 'active' },
    };
    (Admin.create as any).mockResolvedValueOnce(createdDoc);

    const result = await adminAuthService.registerFirstSuperAdmin(dto);

    expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
    expect(Admin.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'superadmin',
        security: expect.objectContaining({ password: 'hashed-pwd', isAdmin: true, failedAttempts: 0 }),
      })
    );
    expect(result.message).toBe('Superadmin créé avec succès.');
    expect(result.user).toMatchObject({ _id: 'admin-1', role: 'superadmin' });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });
});

// ─── login ──────────────────────────────────────────────────────────────────

describe('adminAuthService.login', () => {
  const dto = { identifiantLogin: 'axel@sante.ci', password: 'S3cur3Pass!' };

  function baseAdmin(overrides: any = {}) {
    return {
      _id: 'admin-1',
      role: 'admin',
      adminId: 'ADM-1',
      profile: { fullName: 'Axel' },
      contact: { email: 'axel@sante.ci', phone: '+225000' },
      permissions: [],
      status: { accountStatus: 'active' },
      security: { password: 'hashed-pwd', failedAttempts: 0 },
      ...overrides,
    };
  }

  it('rejette si l\'admin n\'existe pas', async () => {
    (Admin.findOne as any).mockReturnValueOnce(mockQuery(null));

    await expect(adminAuthService.login(dto)).rejects.toThrow('Email ou mot de passe incorrect.');
  });

  it('rejette si le compte est verrouillé et indique le temps restant', async () => {
    const lockUntil = new Date(Date.now() + 5 * 60 * 1000);
    (Admin.findOne as any).mockReturnValueOnce(
      mockQuery(baseAdmin({ security: { password: 'x', lockUntil } }))
    );

    await expect(adminAuthService.login(dto)).rejects.toThrow(/verrouillé/);
  });

  it('rejette si le compte n\'est pas actif', async () => {
    (Admin.findOne as any).mockReturnValueOnce(
      mockQuery(baseAdmin({ status: { accountStatus: 'suspended' } }))
    );

    await expect(adminAuthService.login(dto)).rejects.toThrow(
      'Votre compte est suspendu ou bloqué. Contactez le superadmin.'
    );
  });

  it('incrémente failedAttempts sur mot de passe incorrect sans verrouiller sous le seuil', async () => {
    (Admin.findOne as any).mockReturnValueOnce(
      mockQuery(baseAdmin({ security: { password: 'hashed-pwd', failedAttempts: 1 } }))
    );
    (bcrypt.compare as any).mockResolvedValueOnce(false);

    await expect(adminAuthService.login(dto)).rejects.toThrow('Email ou mot de passe incorrect.');

    expect(Admin.findByIdAndUpdate).toHaveBeenCalledWith('admin-1', { 'security.failedAttempts': 2 });
  });

  it('verrouille le compte au 5e échec consécutif', async () => {
    (Admin.findOne as any).mockReturnValueOnce(
      mockQuery(baseAdmin({ security: { password: 'hashed-pwd', failedAttempts: 4 } }))
    );
    (bcrypt.compare as any).mockResolvedValueOnce(false);

    await expect(adminAuthService.login(dto)).rejects.toThrow('Email ou mot de passe incorrect.');

    const updateArg = (Admin.findByIdAndUpdate as any).mock.calls[0][1];
    expect(updateArg['security.failedAttempts']).toBe(5);
    expect(updateArg['security.lockUntil']).toBeInstanceOf(Date);
  });

  it('connecte avec succès, réinitialise failedAttempts et retourne tokens + user', async () => {
    (Admin.findOne as any).mockReturnValueOnce(mockQuery(baseAdmin()));
    (bcrypt.compare as any).mockResolvedValueOnce(true);

    const result = await adminAuthService.login(dto);

    expect(Admin.findByIdAndUpdate).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({
        'security.failedAttempts': 0,
        'security.lockUntil': null,
        'status.isOnline': true,
      })
    );
    expect(result.user).toMatchObject({ _id: 'admin-1' });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });
});

// ─── refreshToken ─────────────────────────────────────────────────────────────

describe('adminAuthService.refreshToken', () => {
  it('rejette si le token est invalide ou expiré', async () => {
    (jwt.verify as any).mockImplementationOnce(() => {
      throw new Error('jwt expired');
    });

    await expect(adminAuthService.refreshToken('bad-token')).rejects.toThrow('Refresh token invalide ou expiré.');
  });

  it('rejette si l\'admin n\'existe plus ou n\'est pas actif', async () => {
    (jwt.verify as any).mockReturnValueOnce({ id: 'admin-1', role: 'admin', email: 'a@b.com' });
    (Admin.findById as any).mockReturnValueOnce(mockQuery({ status: { accountStatus: 'blocked' } }));

    await expect(adminAuthService.refreshToken('token')).rejects.toThrow('Compte introuvable, suspendu ou bloqué.');
  });

  it('retourne de nouveaux tokens si valide', async () => {
    (jwt.verify as any).mockReturnValueOnce({ id: 'admin-1', role: 'admin', email: 'a@b.com' });
    (Admin.findById as any).mockReturnValueOnce(mockQuery({ status: { accountStatus: 'active' } }));

    const tokens = await adminAuthService.refreshToken('token');

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('adminAuthService.logout', () => {
  it('marque isOnline à false et retourne un message', async () => {
    (Admin.findByIdAndUpdate as any).mockResolvedValueOnce({});

    const result = await adminAuthService.logout('admin-1');

    expect(Admin.findByIdAndUpdate).toHaveBeenCalledWith('admin-1', { 'status.isOnline': false });
    expect(result.message).toBe('Déconnexion réussie.');
  });
});

// ─── changePassword ───────────────────────────────────────────────────────────

describe('adminAuthService.changePassword', () => {
  it('rejette si l\'administrateur est introuvable', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery(null));

    await expect(adminAuthService.changePassword('admin-1', 'old', 'new')).rejects.toThrow(
      'Administrateur introuvable.'
    );
  });

  it('rejette si le mot de passe actuel est incorrect', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery({ security: { password: 'hashed' } }));
    (bcrypt.compare as any).mockResolvedValueOnce(false);

    await expect(adminAuthService.changePassword('admin-1', 'wrong', 'new')).rejects.toThrow(
      'Mot de passe actuel incorrect.'
    );
  });

  it('met à jour le mot de passe hashé en cas de succès', async () => {
    (Admin.findById as any).mockReturnValueOnce(mockQuery({ security: { password: 'hashed' } }));
    (bcrypt.compare as any).mockResolvedValueOnce(true);
    (bcrypt.hash as any).mockResolvedValueOnce('new-hashed');

    const result = await adminAuthService.changePassword('admin-1', 'old', 'newpass');

    expect(Admin.findByIdAndUpdate).toHaveBeenCalledWith('admin-1', { 'security.password': 'new-hashed' });
    expect(result.message).toBe('Mot de passe mis à jour.');
  });
});

// ─── sendPasswordResetOtp ─────────────────────────────────────────────────────

describe('adminAuthService.sendPasswordResetOtp', () => {
  it('rejette si aucun compte ne correspond à cet email', async () => {
    (Admin.findOne as any).mockReturnValueOnce(mockQuery(null));

    await expect(adminAuthService.sendPasswordResetOtp('nobody@x.com')).rejects.toThrow(
      'Aucun compte administrateur trouvé avec cet email.'
    );
  });

  it('génère un OTP, le persiste et déclenche l\'envoi du mail', async () => {
    (Admin.findOne as any).mockReturnValueOnce(mockQuery({ _id: 'admin-1' }));

    const result = await adminAuthService.sendPasswordResetOtp('axel@sante.ci');

    expect(Admin.findByIdAndUpdate).toHaveBeenCalledWith(
      'admin-1',
      expect.objectContaining({
        'status.verificationCode': expect.stringMatching(/^\d{6}$/),
        'status.verificationExpires': expect.any(Date),
      })
    );
    expect(mailService.sendOtp).toHaveBeenCalledWith('axel@sante.ci', expect.stringMatching(/^\d{6}$/), 'admin');
    expect(result.message).toBe('OTP envoyé. Vérifiez votre email.');
  });
});

// ─── verifyPasswordResetOtp ───────────────────────────────────────────────────

describe('adminAuthService.verifyPasswordResetOtp', () => {
  it('rejette si le compte est introuvable', async () => {
    (Admin.findOne as any).mockReturnValueOnce(mockQuery(null));

    await expect(adminAuthService.verifyPasswordResetOtp('a@b.com', '123456')).rejects.toThrow('Compte introuvable.');
  });

  it('rejette si le code OTP ne correspond pas', async () => {
    (Admin.findOne as any).mockReturnValueOnce(
      mockQuery({ status: { verificationCode: '111111', verificationExpires: new Date(Date.now() + 60000) } })
    );

    await expect(adminAuthService.verifyPasswordResetOtp('a@b.com', '222222')).rejects.toThrow('Code OTP invalide.');
  });

  it('rejette si le code OTP est expiré', async () => {
    (Admin.findOne as any).mockReturnValueOnce(
      mockQuery({ status: { verificationCode: '111111', verificationExpires: new Date(Date.now() - 1000) } })
    );

    await expect(adminAuthService.verifyPasswordResetOtp('a@b.com', '111111')).rejects.toThrow(
      'Code OTP expiré. Demandez-en un nouveau.'
    );
  });

  it('valide un OTP correct et non expiré', async () => {
    (Admin.findOne as any).mockReturnValueOnce(
      mockQuery({ status: { verificationCode: '111111', verificationExpires: new Date(Date.now() + 60000) } })
    );

    const result = await adminAuthService.verifyPasswordResetOtp('a@b.com', '111111');
    expect(result.message).toBe('OTP valide.');
  });
});

// ─── resetPassword ────────────────────────────────────────────────────────────

describe('adminAuthService.resetPassword', () => {
  it('propage l\'erreur si l\'OTP est invalide (délègue à verifyPasswordResetOtp)', async () => {
    (Admin.findOne as any).mockReturnValueOnce(mockQuery(null));

    await expect(adminAuthService.resetPassword('a@b.com', '111111', 'newpass')).rejects.toThrow('Compte introuvable.');
    expect(Admin.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('réinitialise le mot de passe et nettoie les champs de vérification', async () => {
    (Admin.findOne as any).mockReturnValueOnce(
      mockQuery({ status: { verificationCode: '111111', verificationExpires: new Date(Date.now() + 60000) } })
    );
    (bcrypt.hash as any).mockResolvedValueOnce('new-hashed');

    const result = await adminAuthService.resetPassword('a@b.com', '111111', 'newpass');

    expect(Admin.findOneAndUpdate).toHaveBeenCalledWith(
      { 'contact.email': 'a@b.com' },
      { 'security.password': 'new-hashed', 'status.verificationCode': null, 'status.verificationExpires': null }
    );
    expect(result.message).toBe('Mot de passe réinitialisé avec succès.');
  });
});