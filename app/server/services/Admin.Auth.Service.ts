// app/server/services/Admin.Auth.Service.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Admin } from '../models/admin.model';
import { mailService } from './mail.service';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AdminTokenPayload {
  id: string;
  role: 'admin';
  email: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginAdminDTO {
  identifiantLogin: string; // email ou téléphone
  password: string;
}

export interface RegisterSuperAdminDTO {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  bootstrapSecret: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY = '21d';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const OTP_EXPIRY_MINUTES = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateTokens(payload: AdminTokenPayload): AuthTokens {
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET || "monSuperCodeSecretAxel123456@", {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || "monSuperCodeSecretRefreshAxel123456@", {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
  return { accessToken, refreshToken };
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function otpExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

// ─── Admin Auth Service ───────────────────────────────────────────────────────

class AdminAuthService {

  // ── Register : premier superadmin uniquement (bootstrap protégé) ──────────

  async registerFirstSuperAdmin(dto: RegisterSuperAdminDTO): Promise<AuthTokens & { user: object; message: string }> {
    if (!process.env.ADMIN_BOOTSTRAP_SECRET || dto.bootstrapSecret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
      throw new Error('Non autorisé.');
    }

    const existingSuperAdmin = await Admin.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      throw new Error('Un superadmin existe déjà. Utilisez la création de sous-admin depuis le dashboard.');
    }

    const existingEmail = await Admin.findOne({ 'contact.email': dto.email });
    if (existingEmail) throw new Error('Cet email est déjà utilisé.');

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const adminId = `ADM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const admin = await Admin.create({
      adminId,
      profile: { fullName: dto.fullName },
      contact: { email: dto.email, phone: dto.phone },
      role: 'superadmin',
      permissions: [], // implicite : accès total car role === 'superadmin'
      security: { password: hashedPassword, isAdmin: true, twoFactorEnabled: false, devices: [], failedAttempts: 0 },
      metadata: { createdBy: null },
    });

    const tokens = generateTokens({
      id: String(admin._id),
      role: 'admin',
      email: admin.contact.email,
    });

    return {
      ...tokens,
      message: 'Superadmin créé avec succès.',
      user: {
        _id: admin._id,
        role: admin.role,
        adminId: admin.adminId,
        profile: admin.profile,
        contact: admin.contact,
        permissions: admin.permissions,
        status: admin.status,
      },
    };
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginAdminDTO): Promise<AuthTokens & { user: object }> {
    const admin = await Admin.findOne({
      $or: [
        { 'contact.email': dto.identifiantLogin },
        { 'contact.phone': dto.identifiantLogin },
      ],
    }).select('+security.password');

    if (!admin) throw new Error('Email ou mot de passe incorrect.');

    if (admin.security.lockUntil && admin.security.lockUntil > new Date()) {
      const remaining = Math.ceil((admin.security.lockUntil.getTime() - Date.now()) / 60000);
      throw new Error(`Compte temporairement verrouillé. Réessayez dans ${remaining} minute(s).`);
    }

    if (admin.status.accountStatus !== 'active') {
      throw new Error('Votre compte est suspendu ou bloqué. Contactez le superadmin.');
    }

    const isMatch = await bcrypt.compare(dto.password, admin.security.password);
    if (!isMatch) {
      const failedAttempts = (admin.security.failedAttempts || 0) + 1;
      const update: Record<string, unknown> = { 'security.failedAttempts': failedAttempts };

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        update['security.lockUntil'] = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      }

      await Admin.findByIdAndUpdate(admin._id, update);
      throw new Error('Email ou mot de passe incorrect.');
    }

    await Admin.findByIdAndUpdate(admin._id, {
      'security.failedAttempts': 0,
      'security.lockUntil': null,
      'status.isOnline': true,
      'status.lastActive': new Date(),
      'status.lastLoginAt': new Date(),
    });

    const tokens = generateTokens({
      id: String(admin._id),
      role: 'admin',
      email: admin.contact.email,
    });

    return {
      ...tokens,
      user: {
        _id: admin._id,
        role: admin.role,
        adminId: admin.adminId,
        profile: admin.profile,
        contact: admin.contact,
        permissions: admin.permissions,
        status: admin.status,
      },
    };
  }

  // ── Refresh Token ──────────────────────────────────────────────────────────

  async refreshToken(token: string): Promise<AuthTokens> {
    let payload: AdminTokenPayload;

    try {
      payload = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || "monSuperCodeSecretRefreshAxel123456@"
      ) as AdminTokenPayload;
    } catch {
      throw new Error('Refresh token invalide ou expiré.');
    }

    const admin = await Admin.findById(payload.id);
    if (!admin || admin.status.accountStatus !== 'active') {
      throw new Error('Compte introuvable, suspendu ou bloqué.');
    }

    return generateTokens({ id: payload.id, role: 'admin', email: payload.email });
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(adminId: string): Promise<{ message: string }> {
    await Admin.findByIdAndUpdate(adminId, { 'status.isOnline': false });
    return { message: 'Déconnexion réussie.' };
  }

  // ── Change Password (admin déjà connecté) ─────────────────────────────────

  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const admin = await Admin.findById(adminId).select('+security.password');
    if (!admin) throw new Error('Administrateur introuvable.');

    const isMatch = await bcrypt.compare(currentPassword, admin.security.password);
    if (!isMatch) throw new Error('Mot de passe actuel incorrect.');

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await Admin.findByIdAndUpdate(adminId, { 'security.password': hashed });

    return { message: 'Mot de passe mis à jour.' };
  }

  // ── Mot de passe oublié : envoi OTP ───────────────────────────────────────

  async sendPasswordResetOtp(email: string): Promise<{ message: string }> {
    const admin = await Admin.findOne({ 'contact.email': email });
    if (!admin) throw new Error('Aucun compte administrateur trouvé avec cet email.');

    const otp = generateOtp();

    await Admin.findByIdAndUpdate(admin._id, {
      'status.verificationCode': otp,
      'status.verificationExpires': otpExpiry(),
    });

    await mailService.sendOtp(email, otp, 'admin');

    return { message: 'OTP envoyé. Vérifiez votre email.' };
  }

  // ── Mot de passe oublié : vérifier l'OTP ──────────────────────────────────

  async verifyPasswordResetOtp(email: string, otp: string): Promise<{ message: string }> {
    const admin = await Admin.findOne({ 'contact.email': email });
    if (!admin) throw new Error('Compte introuvable.');

    if (!admin.status.verificationCode || admin.status.verificationCode !== otp) {
      throw new Error('Code OTP invalide.');
    }

    if (!admin.status.verificationExpires || admin.status.verificationExpires < new Date()) {
      throw new Error('Code OTP expiré. Demandez-en un nouveau.');
    }

    return { message: 'OTP valide.' };
  }

  // ── Mot de passe oublié : réinitialiser ───────────────────────────────────

  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
    await this.verifyPasswordResetOtp(email, otp); // throws si invalide/expiré

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await Admin.findOneAndUpdate(
      { 'contact.email': email },
      {
        'security.password': hashedPassword,
        'status.verificationCode': null,
        'status.verificationExpires': null,
      }
    );

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }
}

export const adminAuthService = new AdminAuthService();