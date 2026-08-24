/**
 * Admin.Auth.Service.integration.test.ts
 *
 * Tests d'intégration pour Admin.Auth.Service.ts.
 * MongoDB en mémoire réelle (via ./setup, comme appointment.integration.test.ts) —
 * bcrypt et jsonwebtoken tournent en vrai ; seul mailService est mocké
 * (dépendance externe : envoi d'email).
 *
 * À placer dans : app/server/__tests__/integration/Admin.Auth.Service.integration.test.ts
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// ── Mocks des services externes ───────────────────────────────────────────
jest.mock('../../services/mail.service', () => ({
  mailService: { sendOtp: jest.fn(async () => undefined) },
}));

import { setupTestDB, clearDB, teardownTestDB } from './setup';
import { adminAuthService } from '../../services/Admin.Auth.Service';
import { Admin } from '../../models/admin.model';

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  await setupTestDB();
  process.env.JWT_ACCESS_SECRET = 'integration-access-secret';
  process.env.JWT_REFRESH_SECRET = 'integration-refresh-secret';
  process.env.ADMIN_BOOTSTRAP_SECRET = 'bootstrap-secret';
});
afterAll(async () => { await teardownTestDB(); });
beforeEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const superAdminDto = {
  fullName: 'Axel Sylvain',
  email: 'axel@sante.ci',
  phone: '+2250700000001',
  password: 'S3cur3Pass!',
  bootstrapSecret: 'bootstrap-secret',
};

// ─── registerFirstSuperAdmin — persistance réelle ────────────────────────────

describe('[intégration] adminAuthService.registerFirstSuperAdmin', () => {
  it('crée réellement un document superadmin en base avec un mot de passe hashé', async () => {
    const result = await adminAuthService.registerFirstSuperAdmin(superAdminDto);

    const stored = await Admin.findOne({ 'contact.email': superAdminDto.email }).select('+security.password');
    expect(stored).not.toBeNull();
    expect(stored!.role).toBe('superadmin');
    expect(stored!.security.password).not.toBe(superAdminDto.password);
    expect(result.accessToken).toBeDefined();
  });

  it('refuse la création d\'un second superadmin', async () => {
    await adminAuthService.registerFirstSuperAdmin(superAdminDto);

    await expect(
      adminAuthService.registerFirstSuperAdmin({ ...superAdminDto, email: 'other@sante.ci', phone: '+2250700000002' })
    ).rejects.toThrow('Un superadmin existe déjà');
  });

  it('refuse un email déjà utilisé', async () => {
    await Admin.create({
      adminId: 'ADM-DUP',
      profile: { fullName: 'Autre' },
      contact: { email: superAdminDto.email, phone: '+2250700009999' },
      role: 'admin',
      permissions: [],
      security: { password: 'x', isAdmin: true, failedAttempts: 0 },
    });

    await expect(adminAuthService.registerFirstSuperAdmin(superAdminDto)).rejects.toThrow(
      'Cet email est déjà utilisé.'
    );
  });
});

// ─── login + verrouillage réel ────────────────────────────────────────────────

describe('[intégration] adminAuthService.login — verrouillage de compte', () => {
  it('connecte avec les bons identifiants (email ou téléphone)', async () => {
    await adminAuthService.registerFirstSuperAdmin(superAdminDto);

    const byEmail = await adminAuthService.login({
      identifiantLogin: superAdminDto.email,
      password: superAdminDto.password,
    });
    expect(byEmail.user).toMatchObject({ role: 'superadmin' });

    const stored = await Admin.findOne({ 'contact.email': superAdminDto.email });
    expect(stored!.status.isOnline).toBe(true);

    const byPhone = await adminAuthService.login({
      identifiantLogin: superAdminDto.phone,
      password: superAdminDto.password,
    });
    expect(byPhone.accessToken).toBeDefined();
  });

  it('verrouille le compte après 5 tentatives échouées puis rejette même le bon mot de passe', async () => {
    await adminAuthService.registerFirstSuperAdmin(superAdminDto);

    for (let i = 0; i < 5; i++) {
      await expect(
        adminAuthService.login({ identifiantLogin: superAdminDto.email, password: 'wrong-pass' })
      ).rejects.toThrow('Email ou mot de passe incorrect.');
    }

    await expect(
      adminAuthService.login({ identifiantLogin: superAdminDto.email, password: superAdminDto.password })
    ).rejects.toThrow(/verrouillé/);

    const stored = await Admin.findOne({ 'contact.email': superAdminDto.email });
    expect(stored!.security.failedAttempts).toBe(5);
    expect(stored!.security.lockUntil).not.toBeNull();
  });

  it('rejette la connexion sur un compte suspendu', async () => {
    await adminAuthService.registerFirstSuperAdmin(superAdminDto);
    await Admin.findOneAndUpdate({ 'contact.email': superAdminDto.email }, { 'status.accountStatus': 'suspended' });

    await expect(
      adminAuthService.login({ identifiantLogin: superAdminDto.email, password: superAdminDto.password })
    ).rejects.toThrow('Votre compte est suspendu ou bloqué. Contactez le superadmin.');
  });
});

// ─── refreshToken + logout ────────────────────────────────────────────────────

describe('[intégration] adminAuthService — refreshToken / logout', () => {
  it('émet un nouveau couple de tokens valide pour un compte actif', async () => {
    const { refreshToken } = await adminAuthService.registerFirstSuperAdmin(superAdminDto);

    const tokens = await adminAuthService.refreshToken(refreshToken);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });

  it('logout met isOnline à false en base', async () => {
    const { user } = await adminAuthService.registerFirstSuperAdmin(superAdminDto);
    const id = String((user as any)._id);

    await adminAuthService.logout(id);

    const stored = await Admin.findById(id);
    expect(stored!.status.isOnline).toBe(false);
  });
});

// ─── changePassword ───────────────────────────────────────────────────────────

describe('[intégration] adminAuthService.changePassword', () => {
  it('permet de se reconnecter avec le nouveau mot de passe uniquement', async () => {
    const { user } = await adminAuthService.registerFirstSuperAdmin(superAdminDto);
    const id = String((user as any)._id);

    await adminAuthService.changePassword(id, superAdminDto.password, 'NouveauPass1!');

    await expect(
      adminAuthService.login({ identifiantLogin: superAdminDto.email, password: superAdminDto.password })
    ).rejects.toThrow('Email ou mot de passe incorrect.');

    const result = await adminAuthService.login({
      identifiantLogin: superAdminDto.email,
      password: 'NouveauPass1!',
    });
    expect(result.accessToken).toBeDefined();
  });
});

// ─── flux mot de passe oublié (OTP) ───────────────────────────────────────────

describe('[intégration] adminAuthService — flux OTP mot de passe oublié', () => {
  it('envoie, vérifie puis consomme un OTP pour réinitialiser le mot de passe', async () => {
    await adminAuthService.registerFirstSuperAdmin(superAdminDto);

    await adminAuthService.sendPasswordResetOtp(superAdminDto.email);
    const stored = await Admin.findOne({ 'contact.email': superAdminDto.email });
    const otp = stored!.status.verificationCode!;

    await expect(adminAuthService.verifyPasswordResetOtp(superAdminDto.email, otp)).resolves.toMatchObject({
      message: 'OTP valide.',
    });

    await adminAuthService.resetPassword(superAdminDto.email, otp, 'ApresReset1!');

    const cleaned = await Admin.findOne({ 'contact.email': superAdminDto.email });
    expect(cleaned!.status.verificationCode).toBeNull();

    const result = await adminAuthService.login({
      identifiantLogin: superAdminDto.email,
      password: 'ApresReset1!',
    });
    expect(result.accessToken).toBeDefined();
  });

  it('rejette un OTP expiré', async () => {
    await adminAuthService.registerFirstSuperAdmin(superAdminDto);
    await adminAuthService.sendPasswordResetOtp(superAdminDto.email);

    await Admin.findOneAndUpdate(
      { 'contact.email': superAdminDto.email },
      { 'status.verificationExpires': new Date(Date.now() - 1000) }
    );
    const stored = await Admin.findOne({ 'contact.email': superAdminDto.email });

    await expect(
      adminAuthService.verifyPasswordResetOtp(superAdminDto.email, stored!.status.verificationCode!)
    ).rejects.toThrow('Code OTP expiré. Demandez-en un nouveau.');
  });
});