// app/server/interfaces/admin.interface.ts
import { Document, Types } from 'mongoose';

// ─── Permissions granulaires ───────────────────────────────────────────────
// 'manage:admins' n'existe pas ici volontairement : c'est un droit exclusif
// au rôle 'superadmin', vérifié via admin.role et non via ce tableau.

export type AdminPermission =
  | 'moderate:doctors'      // vérifier / suspendre / bloquer un médecin
  | 'moderate:patients'     // suspendre / bloquer un patient
  | 'moderate:hospitals'    // vérifier / suspendre un établissement
  | 'moderate:reviews'      // masquer / supprimer un avis
  | 'manage:subscriptions'  // consulter / modifier les abonnements
  | 'manage:payments'       // consulter les transactions, rembourser
  | 'manage:disputes'       // litiges patient/médecin (à venir)
  | 'manage:notifications'  // notifications broadcast
  | 'view:analytics';       // dashboard et statistiques globales

export type AdminRole = 'admin' | 'superadmin';
export type AdminAccountStatus = 'active' | 'suspended' | 'blocked';

// ─── Journal d'activité (audit trail léger) ────────────────────────────────

export type AdminActionType =
  | 'verify_doctor' | 'suspend_doctor' | 'block_doctor' | 'reactivate_doctor'
  | 'verify_hospital' | 'suspend_hospital' | 'reactivate_hospital'
  | 'suspend_patient' | 'block_patient' | 'reactivate_patient'
  | 'delete_review'
  | 'refund_payment'
  | 'create_admin' | 'update_admin_permissions' | 'suspend_admin' | 'delete_admin'
  | 'create_hospital' | 'update_hospital' | 'remove_hospital' 
  | 'other';

export interface IAdminActionLog {
  action: AdminActionType;
  targetId: Types.ObjectId;
  targetType: 'doctor' | 'patient' | 'hospital' | 'review' | 'payment' | 'admin';
  reason?: string;
  performedAt: Date;
}

// ─── Interface principale ──────────────────────────────────────────────────

export interface IAdmin extends Document {
  _id: Types.ObjectId;
  adminId: string; // ex: "ADM-2026-0001"

  // Identité
  profile: {
    fullName: string;
    photo?: string;
  };

  // Contact
  contact: {
    email: string;
    emailVerified: boolean;
    phone: string;
    phoneVerified: boolean;
  };

  // Rôle & permissions
  role: AdminRole;
  permissions: AdminPermission[]; // ignoré si role === 'superadmin' (accès total implicite)

  // Sécurité
  security: {
    password: string;
    isAdmin: boolean;         // flag rapide, même convention que isMedcin/isPatient
    twoFactorEnabled: boolean;
    devices: Array<{
      deviceId: string;
      platform: 'ios' | 'android' | 'web';
      lastActive: Date;
    }>;
    failedAttempts: number;
    lockUntil?: Date;
  };

  // Statut
  status: {
    accountStatus: AdminAccountStatus;
    isOnline: boolean;
    lastActive: Date;
    lastLoginAt?: Date;
    verificationCode?: string;
    verificationExpires?: Date;
  };

  // Journal des dernières actions (les N dernières ; historique complet possible
  // plus tard via une collection dédiée si le besoin d'audit devient plus lourd)
  recentActions: IAdminActionLog[];

  // Métadonnées
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId | null; // ref Admin (superadmin créateur) — null pour le tout premier superadmin
  };
}