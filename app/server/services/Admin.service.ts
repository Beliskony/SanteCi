// app/server/services/Admin.Service.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Admin } from '../models/admin.model';
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