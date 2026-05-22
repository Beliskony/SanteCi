import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Doctor } from '../models/medcin.model';
import { Patient } from '../models/patient.model';
import { mailService } from './mail.service';

// ─── Types ─────────────────────────────────────────────────────────────────

type Role = 'doctor' | 'patient';

interface TokenPayload {
  id: string;
  role: Role;
  email: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface RegisterDoctorDTO {
  firstName: string;
  lastName: string;
  title: 'Dr' | 'Pr' | 'Médecin' | 'Spécialiste';
  specialty: string;
  email: string;
  phone: string;
  password: string;
  licenseNumber: string;
  licenseExpiry: Date;
  university: string;
  graduationYear: number;
  city: string;
}

interface RegisterPatientDTO {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  email?: string;
  phone: string;
  password: string;
  city: string;
}


export interface LoginDTO {
  identifiantLogin: string;  // comment signifie email ou téléphone
  password: string;
  role: Role;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;
const ACCESS_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY = '21d';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateTokens(payload: TokenPayload): AuthTokens {
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET || "monSuperCodeSecretAxel123456@", {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || "monSuperCodeSecretRefreshAxel123456@", {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
  return { accessToken, refreshToken };
}

function otpExpiry(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

// ─── Auth Service ────────────────────────────────────────────────────────────

class AuthService {

  // ── Register Doctor ────────────────────────────────────────────────────────

  async registerDoctor(dto: RegisterDoctorDTO): Promise<{ message: string }> {
    const existing = await Doctor.findOne({ 'contact.email': dto.email });
    if (existing) throw new Error('Un compte médecin existe déjà avec cet email.');

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const otp = generateOtp();
    const doctorId = `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    await Doctor.create({
      doctorId,
      profile: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        title: dto.title,
        specialty: dto.specialty,
      },
      professional: {
        licenseNumber: dto.licenseNumber,
        licenseExpiry: dto.licenseExpiry,
        university: dto.university,
        graduationYear: dto.graduationYear,
        certifications: [],
      },
      contact: {
        phone: dto.phone,
        email: dto.email,
        emailVerified: false,
        phoneVerified: false,
      },
      location: { city: dto.city },
      security: {
        password: hashedPassword,
        isMedcin: true,
        twoFactorEnabled: false,
        devices: [],
      },
      status: {
        isVerified: false,
        accountStatus: 'pending',
        verificationCode: otp,
        verificationExpires: otpExpiry(),
      },
    });

    await mailService.sendOtp(dto.email, otp, 'doctor');

    return { message: 'Compte médecin créé. Vérifiez votre email pour activer votre compte.' };
  }

  // ── Register Patient ───────────────────────────────────────────────────────

  async registerPatient(dto: RegisterPatientDTO): Promise<{ message: string }> {
    if (dto.email) {
      const existing = await Patient.findOne({ 'contact.email': dto.email });
      if (existing) throw new Error('Un compte patient existe déjà avec cet email.');
    }

    const phoneExists = await Patient.findOne({ 'contact.phone': dto.phone });
    if (phoneExists) throw new Error('Ce numéro de téléphone est déjà utilisé.');

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const otp = generateOtp();
    const patientId = `PAT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    await Patient.create({
      patientId,
      profile: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
      },
      contact: {
        phone: dto.phone,
        phoneVerified: false,
        email: dto.email,
        emailVerified: false,
        emergencyContacts: [],
      },
      location: { city: dto.city },
      security: {
        password: hashedPassword,
        isPatient: true,
        isActive: true,
        failedAttempts: 0,
      },
      status: {
        isVerified: false,
        verificationCode: otp,
        verificationExpires: otpExpiry(),
        accountStatus: 'active',
      },
    });

    if (dto.email) {
      await mailService.sendOtp(dto.email, otp, 'patient');
    }

    return { message: 'Compte patient créé. Vérifiez votre email pour activer votre compte.' };
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDTO): Promise<AuthTokens & { user: object }> {
    if (dto.role === 'doctor') {
      const doctor = await Doctor.findOne({$or: [
        { 'contact.email': dto.identifiantLogin },
        { 'contact.phone': dto.identifiantLogin }
      ]}).select('+security.password');
      if (!doctor) throw new Error('Email ou mot de passe incorrect.');

      if (doctor.status.accountStatus === 'suspended' || doctor.status.accountStatus === 'blocked') {
        throw new Error('Votre compte est suspendu ou bloqué. Contactez le support.');
      }

      const isMatch = await bcrypt.compare(dto.password, doctor.security.password);
      if (!isMatch) throw new Error('Email ou mot de passe incorrect.');

      const tokens = generateTokens({
        id: String(doctor._id),
        role: 'doctor',
        email: doctor.contact.email,
      });

      await Doctor.findByIdAndUpdate(doctor._id, {
        'status.isOnline': true,
        'status.lastActive': new Date(),
      });

      return {
        ...tokens,
        user: {
          id: doctor._id,
          firstName: doctor.profile.firstName,
          lastName: doctor.profile.lastName,
          email: doctor.contact.email,
          role: 'doctor',
          isVerified: doctor.status.isVerified,
          accountStatus: doctor.status.accountStatus,
          specialty: doctor.profile.specialty,
          photo: doctor.profile.photo || null,
        },
      };
    }

    // Patient login
    const patient = await Patient.findOne({ 
      $or: [
        { 'contact.email': dto.identifiantLogin },
        { 'contact.phone': dto.identifiantLogin }
      ]
     }).select('+security.password');
    if (!patient) throw new Error('Email ou mot de passe incorrect.');

    // Vérification verrouillage compte
    if (patient.security.lockUntil && patient.security.lockUntil > new Date()) {
      const remaining = Math.ceil((patient.security.lockUntil.getTime() - Date.now()) / 60000);
      throw new Error(`Compte temporairement verrouillé. Réessayez dans ${remaining} minute(s).`);
    }

    if (patient.status.accountStatus !== 'active') {
      throw new Error('Votre compte est suspendu ou bloqué. Contactez le support.');
    }

    const isMatch = await bcrypt.compare(dto.password, patient.security.password);
    if (!isMatch) {
      const failedAttempts = (patient.security.failedAttempts || 0) + 1;
      const update: Record<string, unknown> = { 'security.failedAttempts': failedAttempts };

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        update['security.lockUntil'] = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      }

      await Patient.findByIdAndUpdate(patient._id, update);
      throw new Error('Email ou mot de passe incorrect.');
    }

    // Reset failed attempts on success
    await Patient.findByIdAndUpdate(patient._id, {
      'security.failedAttempts': 0,
      'security.lockUntil': null,
      'security.lastLogin': new Date(),
    });

    const tokens = generateTokens({
      id: String(patient._id),
      role: 'patient',
      email: patient.contact.email!,
    });

    return {
      ...tokens,
      user: {
        id: patient._id,
        firstName: patient.profile.firstName,
        lastName: patient.profile.lastName,
        email: patient.contact.email,
        role: 'patient',
        isVerified: patient.status.isVerified,
        photo: patient.profile.photo || null,
      },
    };
  }

  // ── Refresh Token ──────────────────────────────────────────────────────────

  async refreshToken(token: string): Promise<AuthTokens> {
    let payload: TokenPayload;

    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET! || "monSuperCodeSecretRefreshAxel123456@"!) as TokenPayload;
    } catch {
      throw new Error('Refresh token invalide ou expiré.');
    }

    // Vérifier que l'utilisateur existe toujours et est actif
    if (payload.role === 'doctor') {
      const doctor = await Doctor.findById(payload.id);
      if (!doctor || doctor.status.accountStatus === 'blocked') {
        throw new Error('Compte introuvable ou bloqué.');
      }
    } else {
      const patient = await Patient.findById(payload.id);
      if (!patient || !patient.security.isActive) {
        throw new Error('Compte introuvable ou inactif.');
      }
    }

    return generateTokens({ id: payload.id, role: payload.role, email: payload.email });
  }

  // ── Send OTP ───────────────────────────────────────────────────────────────

  async sendOtp(email: string, role: Role): Promise<{ message: string }> {
    const otp = generateOtp();
    const expires = otpExpiry();

    if (role === 'doctor') {
      const doctor = await Doctor.findOne({ 'contact.email': email });
      if (!doctor) throw new Error('Aucun compte médecin trouvé avec cet email.');

      await Doctor.findByIdAndUpdate(doctor._id, {
        'status.verificationCode': otp,
        'status.verificationExpires': expires,
      });

      await mailService.sendOtp(email, otp, 'doctor');
    } else {
      const patient = await Patient.findOne({ 'contact.email': email });
      if (!patient) throw new Error('Aucun compte patient trouvé avec cet email.');

      await Patient.findByIdAndUpdate(patient._id, {
        'status.verificationCode': otp,
        'status.verificationExpires': expires,
      });

      await mailService.sendOtp(email, otp, 'patient');
    }

    return { message: 'OTP envoyé. Vérifiez votre email.' };
  }

  // ── Verify OTP ─────────────────────────────────────────────────────────────

  async verifyOtp(email: string, otp: string, role: Role): Promise<{ message: string }> {
    if (role === 'doctor') {
      const doctor = await Doctor.findOne({ 'contact.email': email });
      if (!doctor) throw new Error('Compte introuvable.');


      await Doctor.findByIdAndUpdate(doctor._id, {
        'contact.emailVerified': true,
        'status.isVerified': true,
        'status.accountStatus': 'active',
        'status.verificationCode': null,
        'status.verificationExpires': null,
      });

      await mailService.sendWelcome(email, doctor.profile.firstName, 'doctor');
      console.log(otp);
      

    } else {
      const patient = await Patient.findOne({ 'contact.email': email });
      if (!patient) throw new Error('Compte introuvable.');

      if (!patient.status.verificationCode || patient.status.verificationCode !== otp) {
        throw new Error('Code OTP invalide.');
      }

      if (!patient.status.verificationExpires || patient.status.verificationExpires < new Date()) {
        throw new Error('Code OTP expiré. Demandez-en un nouveau.');
      }

      await Patient.findByIdAndUpdate(patient._id, {
        'contact.emailVerified': true,
        'status.isVerified': true,
        'status.verificationCode': null,
        'status.verificationExpires': null,
      });

      await mailService.sendWelcome(email, patient.profile.firstName, 'patient');
    }

    return { message: 'Email vérifié avec succès.' };
  }

  // ── Forgot Password (envoie OTP reset) ────────────────────────────────────

  async forgotPassword(email: string, role: Role): Promise<{ message: string }> {
    const otp = generateOtp();
    const expires = otpExpiry();

    if (role === 'doctor') {
      const doctor = await Doctor.findOne({ 'contact.email': email });
      if (!doctor) throw new Error('Aucun compte médecin trouvé avec cet email.');

      await Doctor.findByIdAndUpdate(doctor._id, {
        'status.verificationCode': otp,
        'status.verificationExpires': expires,
      });
    } else {
      const patient = await Patient.findOne({ 'contact.email': email });
      if (!patient) throw new Error('Aucun compte patient trouvé avec cet email.');

      await Patient.findByIdAndUpdate(patient._id, {
        'status.verificationCode': otp,
        'status.verificationExpires': expires,
      });
    }

    await mailService.sendOtp(email, otp, role);
    return { message: 'Code de réinitialisation envoyé sur votre email.' };
  }

  // ── Reset Password (après vérification OTP) ────────────────────────────────

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
    role: Role
  ): Promise<{ message: string }> {
    // Vérifier l'OTP d'abord
    await this.verifyOtp(email, otp, role); // throws si invalide

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    if (role === 'doctor') {
      await Doctor.findOneAndUpdate(
        { 'contact.email': email },
        { 'security.password': hashedPassword }
      );
    } else {
      await Patient.findOneAndUpdate(
        { 'contact.email': email },
        { 'security.password': hashedPassword }
      );
    }

    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  // ── Change Password (utilisateur connecté) ────────────────────────────────

  async changePassword(
    userId: string,
    role: Role,
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    if (role === 'doctor') {
      const doctor = await Doctor.findById(userId).select('+security.password');
      if (!doctor) throw new Error('Médecin introuvable.');

      const isMatch = await bcrypt.compare(currentPassword, doctor.security.password);
      if (!isMatch) throw new Error('Mot de passe actuel incorrect.');

      const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await Doctor.findByIdAndUpdate(userId, { 'security.password': hashed });
    } else {
      const patient = await Patient.findById(userId).select('+security.password');
      if (!patient) throw new Error('Patient introuvable.');

      const isMatch = await bcrypt.compare(currentPassword, patient.security.password);
      if (!isMatch) throw new Error('Mot de passe actuel incorrect.');

      const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await Patient.findByIdAndUpdate(userId, { 'security.password': hashed });
    }

    return { message: 'Mot de passe modifié avec succès.' };
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(userId: string, role: Role): Promise<{ message: string }> {
    if (role === 'doctor') {
      await Doctor.findByIdAndUpdate(userId, {
        'status.isOnline': false,
        'status.lastActive': new Date(),
      });
    }
    // Pour le patient, la déconnexion est gérée côté client (suppression du token)
    return { message: 'Déconnexion réussie.' };
  }
}

export const authService = new AuthService();