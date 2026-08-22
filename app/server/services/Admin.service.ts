// app/server/services/Admin.Service.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Admin } from '../models/admin.model';
import { Review } from '../models/review.model';
import { IAdmin, AdminPermission, AdminActionType } from '../interfaces/admin.interface';
import { Doctor } from '../models/medcin.model';
import { Patient } from '../models/patient.model';
import HospitalClinic from '../models/hopitalClinic.model';
import { Appointment } from '../models/appointement.model';
import { doctorService } from './doctor.service';
import { patientService } from './patient.service';
import { hospitalClinicService } from './hopital.service';
import { reviewService } from './review.service';

const SALT_ROUNDS = 12;
const MIN_REASON_LENGTH = 5;

interface CreateSubAdminDTO {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  permissions: AdminPermission[];
}

type TargetType = 'doctor' | 'patient' | 'hospital' | 'review' | 'payment' | 'admin';
type AccountStatus = 'active' | 'suspended' | 'blocked';
type DoctorStatus = 'active' | 'pending' | 'suspended' | 'blocked';

const VALID_ACCOUNT_STATUSES: AccountStatus[] = ['active', 'suspended', 'blocked'];
const VALID_DOCTOR_STATUSES: DoctorStatus[] = ['active', 'pending', 'suspended', 'blocked'];
const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

// ─── Admin Service ────────────────────────────────────────────────────────────

class AdminService {

  // ── Helpers internes de sécurité ────────────────────────────────────────────

  private assertValidObjectId(id: string, label = 'ID'): void {
    if (!mongoose.isValidObjectId(id)) {
      throw new Error(`${label} invalide.`);
    }
  }

  private assertReason(reason: string | undefined, action: string): void {
    if (!reason || reason.trim().length < MIN_REASON_LENGTH) {
      throw new Error(`Une raison d'au moins ${MIN_REASON_LENGTH} caractères est requise pour : ${action}.`);
    }
  }

  /** Défense en profondeur : re-vérifie la permission côté service, même si la route l'a déjà fait. */
  private async assertActorPermission(actorId: string, permission: AdminPermission): Promise<IAdmin> {
    this.assertValidObjectId(actorId, 'Identifiant administrateur');
    const actor = await Admin.findById(actorId);
    if (!actor) throw new Error('Administrateur introuvable.');
    if (actor.status.accountStatus !== 'active') throw new Error('Compte administrateur suspendu ou bloqué.');
    if (actor.role !== 'superadmin' && !actor.permissions.includes(permission)) {
      throw new Error('Permission insuffisante.');
    }
    return actor;
  }

  /** Gestion des admins = toujours réservée au superadmin, jamais une permission assignable. */
  private async assertSuperAdmin(actorId: string): Promise<IAdmin> {
    this.assertValidObjectId(actorId, 'Identifiant administrateur');
    const actor = await Admin.findById(actorId);
    if (!actor) throw new Error('Administrateur introuvable.');
    if (actor.status.accountStatus !== 'active') throw new Error('Compte administrateur suspendu ou bloqué.');
    if (actor.role !== 'superadmin') throw new Error('Réservé au superadmin.');
    return actor;
  }

  private async logAction(
    adminId: string,
    action: AdminActionType,
    targetId: string,
    targetType: TargetType,
    reason?: string
  ): Promise<void> {
    await Admin.findByIdAndUpdate(adminId, {
      $push: {
        recentActions: {
          $each: [{ action, targetId, targetType, reason, performedAt: new Date() }],
          $slice: -50,
        },
      },
    });
  }

  // ── Gestion des comptes admin (superadmin only) ──────────────────────────────

  async createSubAdmin(creatorId: string, dto: CreateSubAdminDTO): Promise<{ id: string; adminId: string; email: string }> {
    await this.assertSuperAdmin(creatorId);

    if (!dto.permissions || dto.permissions.length === 0) {
      throw new Error('Au moins une permission doit être assignée.');
    }

    const exists = await Admin.findOne({ 'contact.email': dto.email });
    if (exists) throw new Error('Cet email est déjà utilisé.');

    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const adminId = `ADM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const admin = await Admin.create({
      adminId,
      profile: { fullName: dto.fullName },
      contact: { email: dto.email, phone: dto.phone },
      role: 'admin',
      permissions: dto.permissions,
      security: { password: hashed, isAdmin: true, twoFactorEnabled: false, devices: [], failedAttempts: 0 },
      metadata: { createdBy: creatorId },
    });

    await this.logAction(creatorId, 'create_admin', String(admin._id), 'admin');

    return { id: String(admin._id), adminId: admin.adminId, email: admin.contact.email };
  }

  async listAdmins(actorId: string): Promise<IAdmin[]> {
    await this.assertSuperAdmin(actorId);
    return Admin.find().select('-security.password');
  }

  async getAdminById(actorId: string, targetAdminId: string): Promise<IAdmin> {
    await this.assertSuperAdmin(actorId);
    this.assertValidObjectId(targetAdminId, 'Identifiant administrateur cible');

    const admin = await Admin.findById(targetAdminId).select('-security.password');
    if (!admin) throw new Error('Administrateur introuvable.');
    return admin;
  }

  async updatePermissions(
    superAdminId: string,
    targetAdminId: string,
    permissions: AdminPermission[]
  ): Promise<IAdmin> {
    await this.assertSuperAdmin(superAdminId);
    this.assertValidObjectId(targetAdminId, 'Identifiant administrateur cible');

    if (!permissions || permissions.length === 0) {
      throw new Error('Au moins une permission doit être assignée.');
    }

    const target = await Admin.findById(targetAdminId);
    if (!target) throw new Error('Administrateur introuvable.');
    if (target.role === 'superadmin') throw new Error("Impossible de modifier les permissions d'un superadmin.");

    target.permissions = permissions;
    await target.save();

    await this.logAction(superAdminId, 'update_admin_permissions', targetAdminId, 'admin');

    const { security, ...rest } = target.toObject();
    return rest as IAdmin;
  }

  async setAdminStatus(
    superAdminId: string,
    targetAdminId: string,
    status: AccountStatus,
    reason?: string
  ): Promise<{ message: string }> {
    await this.assertSuperAdmin(superAdminId);
    this.assertValidObjectId(targetAdminId, 'Identifiant administrateur cible');

    if (!VALID_ACCOUNT_STATUSES.includes(status)) throw new Error('Statut invalide.');
    if (status !== 'active') this.assertReason(reason, `changement de statut (${status})`);

    if (String(superAdminId) === String(targetAdminId)) {
      throw new Error('Impossible de modifier votre propre statut.');
    }

    const target = await Admin.findById(targetAdminId);
    if (!target) throw new Error('Administrateur introuvable.');
    if (target.role === 'superadmin') throw new Error('Impossible de suspendre un superadmin.');

    target.status.accountStatus = status;
    await target.save();

    await this.logAction(superAdminId, 'suspend_admin', targetAdminId, 'admin', reason);

    return { message: `Statut mis à jour : ${status}` };
  }

  async deleteAdmin(superAdminId: string, targetAdminId: string, reason?: string): Promise<{ message: string }> {
    await this.assertSuperAdmin(superAdminId);
    this.assertValidObjectId(targetAdminId, 'Identifiant administrateur cible');
    this.assertReason(reason, 'suppression du compte');

    if (String(superAdminId) === String(targetAdminId)) {
      throw new Error('Impossible de supprimer votre propre compte.');
    }

    const target = await Admin.findById(targetAdminId);
    if (!target) throw new Error('Administrateur introuvable.');
    if (target.role === 'superadmin') throw new Error('Impossible de supprimer un superadmin.');

    await Admin.findByIdAndDelete(targetAdminId);
    await this.logAction(superAdminId, 'delete_admin', targetAdminId, 'admin', reason);

    return { message: 'Administrateur supprimé.' };
  }

  // ── Modération : médecins (perm: moderate:doctors) ───────────────────────────

  async verifyDoctor(adminId: string, doctorId: string): Promise<{ message: string }> {
    await this.assertActorPermission(adminId, 'moderate:doctors');
    this.assertValidObjectId(doctorId, 'Identifiant médecin');

    const result = await doctorService.verify(doctorId);
    await this.logAction(adminId, 'verify_doctor', doctorId, 'doctor');
    return result;
  }

  // ── Détails de vérification d'un médecin (perm: moderate:doctors) ─────────────
  async getDoctorVerificationDetails(adminId: string, doctorId: string) {
  await this.assertActorPermission(adminId, 'moderate:doctors');
  this.assertValidObjectId(doctorId, 'Identifiant médecin');
 
  const doctor = await Doctor.findById(doctorId)
    .select(
      'doctorId profile.firstName profile.lastName ' +
      'professional.licenseNumber professional.licenseExpiry professional.university ' +
      'professional.graduationYear professional.certifications professional.verificationDocuments ' +
      'professional.currentPractice status.isVerified status.accountStatus'
    )
    .lean();
 
  if (!doctor) throw new Error('Médecin introuvable.');
  return doctor;
}
 

  async setDoctorStatus(
    adminId: string,
    doctorId: string,
    status: DoctorStatus,
    reason?: string
  ): Promise<{ message: string }> {
    await this.assertActorPermission(adminId, 'moderate:doctors');
    this.assertValidObjectId(doctorId, 'Identifiant médecin');

    if (!VALID_DOCTOR_STATUSES.includes(status)) throw new Error('Statut invalide.');
    if (status === 'suspended' || status === 'blocked') this.assertReason(reason, `suspension du médecin (${status})`);

    const result = await doctorService.updateAccountStatus(doctorId, status);
    const action: AdminActionType =
      status === 'suspended' ? 'suspend_doctor' : status === 'blocked' ? 'block_doctor' : 'reactivate_doctor';
    await this.logAction(adminId, action, doctorId, 'doctor', reason);
    return result;
  }

  // ── Modération : hôpitaux (perm: moderate:hospitals) ─────────────────────────

  async verifyHospital(adminId: string, hospitalId: string): Promise<{ message: string }> {
    await this.assertActorPermission(adminId, 'moderate:hospitals');
    this.assertValidObjectId(hospitalId, 'Identifiant établissement');

    const result = await hospitalClinicService.verify(hospitalId);
    await this.logAction(adminId, 'verify_hospital', hospitalId, 'hospital');
    return result;
  }

  // ── Dans la section "Modération : hôpitaux (perm: moderate:hospitals)" ──
 
async getHospitalVerificationDetails(adminId: string, hospitalId: string) {
  await this.assertActorPermission(adminId, 'moderate:hospitals');
  this.assertValidObjectId(hospitalId, 'Identifiant établissement');
 
  const hospital = await HospitalClinic.findById(hospitalId)
    .select('facilityId name certification metadata.verified')
    .lean();
 
  if (!hospital) throw new Error('Établissement introuvable.');
  return hospital;
}

  async setHospitalStatus(
    adminId: string,
    hospitalId: string,
    status: AccountStatus,
    reason?: string
  ): Promise<{ message: string }> {
    await this.assertActorPermission(adminId, 'moderate:hospitals');
    this.assertValidObjectId(hospitalId, 'Identifiant établissement');

    if (!VALID_ACCOUNT_STATUSES.includes(status)) throw new Error('Statut invalide.');
    if (status !== 'active') this.assertReason(reason, `suspension de l'établissement (${status})`);

    const result = await hospitalClinicService.updateAccountStatus(hospitalId, status);
    const action: AdminActionType = status === 'active' ? 'reactivate_hospital' : 'suspend_hospital';
    await this.logAction(adminId, action, hospitalId, 'hospital', reason);
    return result;
  }

  // ── Modération : patients (perm: moderate:patients) ──────────────────────────

  async setPatientStatus(
    adminId: string,
    patientId: string,
    status: AccountStatus,
    reason?: string
  ): Promise<{ message: string }> {
    await this.assertActorPermission(adminId, 'moderate:patients');
    this.assertValidObjectId(patientId, 'Identifiant patient');

    if (!VALID_ACCOUNT_STATUSES.includes(status)) throw new Error('Statut invalide.');
    if (status !== 'active') this.assertReason(reason, `suspension du patient (${status})`);

    const result = await patientService.updateAccountStatus(patientId, status);
    const action: AdminActionType =
      status === 'suspended' ? 'suspend_patient' : status === 'blocked' ? 'block_patient' : 'reactivate_patient';
    await this.logAction(adminId, action, patientId, 'patient', reason);
    return result;
  }

  // ── Modération : avis (perm: moderate:reviews) ───────────────────────────────

  async deleteReview(adminId: string, reviewId: string, reason?: string): Promise<{ message: string }> {
    await this.assertActorPermission(adminId, 'moderate:reviews');
    this.assertValidObjectId(reviewId, 'Identifiant avis');
    this.assertReason(reason, 'suppression de l\'avis');

    const result = await reviewService.adminDeleteReview(reviewId);
    await this.logAction(adminId, 'delete_review', reviewId, 'review', reason);
    return result;
  }

  // ── Supervision globale (perm: view:analytics) ───────────────────────────────

  async getDashboardStats(adminId: string) {
    await this.assertActorPermission(adminId, 'view:analytics');

    const [totalDoctors, verifiedDoctors, totalPatients, totalHospitals, pendingHospitals, activeAppointments, completedAppointments] =
      await Promise.all([
        Doctor.countDocuments(),
        Doctor.countDocuments({ 'status.isVerified': true }),
        Patient.countDocuments(),
        HospitalClinic.countDocuments(),
        HospitalClinic.countDocuments({ 'metadata.verified': false }),
        Appointment.countDocuments({ 'status.current': { $in: ['pending', 'confirmed'] } }),
        Appointment.countDocuments({ 'status.current': 'completed' }),
      ]);

    const revenueAgg = await Appointment.aggregate([
      { $match: { 'status.paymentStatus': 'paid' } },
      { $group: { _id: null, total: { $sum: '$payment.amount' } } },
    ]);

    const subscriptionBreakdown = await Doctor.aggregate([
      { $group: { _id: '$status.subscription', count: { $sum: 1 } } },
    ]);

    return {
      doctors: { total: totalDoctors, verified: verifiedDoctors, pending: totalDoctors - verifiedDoctors },
      patients: { total: totalPatients },
      hospitals: { total: totalHospitals, pendingVerification: pendingHospitals },
      appointments: { active: activeAppointments, completed: completedAppointments },
      revenue: { total: revenueAgg[0]?.total ?? 0 },
      subscriptions: subscriptionBreakdown,
    };
  }

  // ajout dans app/server/services/Admin.Service.ts, dans class AdminService

async listDoctors(
  adminId: string,
  filters: { status?: string; search?: string; page?: number; limit?: number }
) {
  await this.assertActorPermission(adminId, 'moderate:doctors');

  const { status, search, page = 1, limit = 20 } = filters;
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  const query: Record<string, unknown> = {};

  if (status && status !== 'all') {
    if (!VALID_DOCTOR_STATUSES.includes(status as DoctorStatus)) throw new Error('Statut invalide.');
    query['status.accountStatus'] = status;
  }

  if (search) {
    const safeSearch = search.trim().slice(0, 100); // évite un $regex démesuré
    query.$or = [
      { 'profile.firstName': { $regex: safeSearch, $options: 'i' } },
      { 'profile.lastName': { $regex: safeSearch, $options: 'i' } },
      { 'contact.email': { $regex: safeSearch, $options: 'i' } },
      { doctorId: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const [doctors, total] = await Promise.all([
    Doctor.find(query)
      .select('doctorId profile contact location status telemedicine.rating metadata.createdAt')
      .sort({ 'metadata.createdAt': -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Doctor.countDocuments(query),
  ]);

  return { doctors, total, page: safePage, pages: Math.ceil(total / safeLimit) };
}

// ── Listing : hôpitaux ──────────────────────────────────────────────────────

async listHospitals(
  adminId: string,
  filters: { status?: string; verified?: string; search?: string; page?: number; limit?: number }
) {
  await this.assertActorPermission(adminId, 'moderate:hospitals');

  const { status, verified, search, page = 1, limit = 20 } = filters;
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  const query: Record<string, unknown> = {};

  if (status && status !== 'all') {
    if (!VALID_ACCOUNT_STATUSES.includes(status as AccountStatus)) throw new Error('Statut invalide.');
    query['status.accountStatus'] = status;
  }

  if (verified === 'true' || verified === 'false') {
    query['metadata.verified'] = verified === 'true';
  }

  if (search) {
    const safeSearch = search.trim().slice(0, 100);
    query.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { 'location.city': { $regex: safeSearch, $options: 'i' } },
      { 'contact.email': { $regex: safeSearch, $options: 'i' } },
      { facilityId: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const [hospitals, total] = await Promise.all([
    HospitalClinic.find(query)
      .select('facilityId name type category location contact status metadata.verified metadata.createdAt')
      .sort({ 'metadata.createdAt': -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    HospitalClinic.countDocuments(query),
  ]);

  return { hospitals, total, page: safePage, pages: Math.ceil(total / safeLimit) };
}

// ── Listing : patients ────────────────────────────────────────────────────

async listPatients(
  adminId: string,
  filters: { status?: string; search?: string; page?: number; limit?: number }
) {
  await this.assertActorPermission(adminId, 'moderate:patients');

  const { status, search, page = 1, limit = 20 } = filters;
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  const query: Record<string, unknown> = {};

  if (status && status !== 'all') {
    if (!VALID_ACCOUNT_STATUSES.includes(status as AccountStatus)) throw new Error('Statut invalide.');
    query['status.accountStatus'] = status;
  }

  if (search) {
    const safeSearch = search.trim().slice(0, 100);
    query.$or = [
      { 'profile.firstName': { $regex: safeSearch, $options: 'i' } },
      { 'profile.lastName': { $regex: safeSearch, $options: 'i' } },
      { 'contact.phone': { $regex: safeSearch, $options: 'i' } },
      { 'contact.email': { $regex: safeSearch, $options: 'i' } },
      { patientId: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const [patients, total] = await Promise.all([
    Patient.find(query)
      .select('patientId profile contact location status metadata.createdAt metadata.totalConsultations')
      .sort({ 'metadata.createdAt': -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Patient.countDocuments(query),
  ]);

  return { patients, total, page: safePage, pages: Math.ceil(total / safeLimit) };
}

// ── Listing : avis ─────────────────────────────────────────────────────────

async listReviews(
  adminId: string,
  filters: { status?: string; page?: number; limit?: number }
) {
  await this.assertActorPermission(adminId, 'moderate:reviews');

  const { status, page = 1, limit = 20 } = filters;
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  const query: Record<string, unknown> = {};
  if (status && status !== 'all') {
    if (!['published', 'flagged', 'hidden'].includes(status)) throw new Error('Statut invalide.');
    query.status = status;
  }

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .select('rating comment isAnonymous status metadata.createdAt doctorId patientId')
      .populate('doctorId', 'profile.firstName profile.lastName')
      .populate('patientId', 'profile.firstName profile.lastName')
      .sort({ 'metadata.createdAt': -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Review.countDocuments(query),
  ]);

  return { reviews, total, page: safePage, pages: Math.ceil(total / safeLimit) };
}


async listSubscriptions(
  adminId: string,
  filters: { plan?: string; page?: number; limit?: number }
) {
  await this.assertActorPermission(adminId, 'manage:subscriptions');

  const { plan, page = 1, limit = 20 } = filters;
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  const query: Record<string, unknown> = {};
  if (plan && plan !== 'all') {
    if (!['free', 'premium', 'elite'].includes(plan)) throw new Error('Plan invalide.');
    query['status.subscription'] = plan;
  }

  const [doctors, total] = await Promise.all([
    Doctor.find(query)
      .select('doctorId profile.firstName profile.lastName contact.email status.subscription status.subscriptionStatus status.subscriptionExpiry')
      .sort({ 'status.subscriptionExpiry': 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Doctor.countDocuments(query),
  ]);

  return { doctors, total, page: safePage, pages: Math.ceil(total / safeLimit) };
}

  // ── Paiements (perm: manage:payments) ────────────────────────────────────────

  async listPayments(adminId: string, filters: { status?: string; page?: number; limit?: number }) {
    await this.assertActorPermission(adminId, 'manage:payments');

    const { status, page = 1, limit = 20 } = filters;

    if (status && !VALID_PAYMENT_STATUSES.includes(status)) {
      throw new Error('Statut de paiement invalide.');
    }

    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

    const query: Record<string, unknown> = {};
    if (status) query['status.paymentStatus'] = status;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .select('patientId doctorId payment status.paymentStatus details.scheduledFor')
        .populate('patientId', 'profile.firstName profile.lastName')
        .populate('doctorId', 'profile.firstName profile.lastName')
        .sort({ 'details.scheduledFor': -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit),
      Appointment.countDocuments(query),
    ]);

    return { payments: appointments, total, page: safePage, pages: Math.ceil(total / safeLimit) };
  }
}

export const adminService = new AdminService();