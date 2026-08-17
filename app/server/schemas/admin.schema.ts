// app/server/schemas/admin.schema.ts
import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

// ── Permissions ──────────────────────────────────────────────────────────────

export const AdminPermissionEnum = z.enum([
  'moderate:doctors',
  'moderate:patients',
  'moderate:hospitals',
  'moderate:reviews',
  'manage:subscriptions',
  'manage:payments',
  'manage:disputes',
  'manage:notifications',
  'view:analytics',
]);

// ── Sous-schémas ────────────────────────────────────────────────────────────

const AdminProfileSchema = z.object({
  fullName: z.string().min(1),
  photo:    z.string().url().optional(),
});

const AdminContactSchema = z.object({
  email:         z.string().email(),
  emailVerified: z.boolean().default(false),
  phone:         z.string().min(1),
  phoneVerified: z.boolean().default(false),
});

const AdminSecuritySchema = z.object({
  password:        z.string().min(8),
  isAdmin:         z.boolean().default(true),
  twoFactorEnabled: z.boolean().default(false),
  devices: z.array(z.object({
    deviceId:   z.string(),
    platform:   z.enum(['ios', 'android', 'web']),
    lastActive: z.date(),
  })).default([]),
  failedAttempts: z.number().int().min(0).default(0),
  lockUntil:      z.date().optional(),
});

const AdminStatusSchema = z.object({
  accountStatus: z.enum(['active', 'suspended', 'blocked']).default('active'),
  isOnline:      z.boolean().default(false),
  lastActive:    z.date().default(() => new Date()),
  lastLoginAt:   z.date().optional(),
  verificationCode:    z.string().optional(),
  verificationExpires: z.date().optional(),
});

const AdminActionLogSchema = z.object({
  action: z.enum([
    'verify_doctor', 'suspend_doctor', 'block_doctor', 'reactivate_doctor',
    'verify_hospital', 'suspend_hospital', 'reactivate_hospital',
    'suspend_patient', 'block_patient', 'reactivate_patient',
    'delete_review',
    'refund_payment',
    'create_admin', 'update_admin_permissions', 'suspend_admin', 'delete_admin',
    'other',
  ]),
  targetId:    objectId,
  targetType:  z.enum(['doctor', 'patient', 'hospital', 'review', 'payment', 'admin']),
  reason:      z.string().max(300).optional(),
  performedAt: z.date().default(() => new Date()),
});

const AdminMetadataSchema = z.object({
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  createdBy: objectId.nullable().default(null),
});

// ── Schéma principal ────────────────────────────────────────────────────────

export const AdminSchema = z.object({
  adminId:       z.string().trim().min(1),
  profile:       AdminProfileSchema,
  contact:       AdminContactSchema,

  role:          z.enum(['admin', 'superadmin']).default('admin'),
  permissions:   z.array(AdminPermissionEnum).default([]),

  security:      AdminSecuritySchema,
  status:        AdminStatusSchema.default(() => ({
    accountStatus: 'active' as const,
    isOnline:      false,
    lastActive:    new Date(),
  })),

  recentActions: z.array(AdminActionLogSchema).max(50).default([]),
  metadata:      AdminMetadataSchema.default(() => ({
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
  })),
});

// ── Types inférés ───────────────────────────────────────────────────────────

export type TAdmin           = z.infer<typeof AdminSchema>;
export type TAdminProfile    = z.infer<typeof AdminProfileSchema>;
export type TAdminContact    = z.infer<typeof AdminContactSchema>;
export type TAdminSecurity   = z.infer<typeof AdminSecuritySchema>;
export type TAdminStatus     = z.infer<typeof AdminStatusSchema>;
export type TAdminActionLog  = z.infer<typeof AdminActionLogSchema>;
export type TAdminPermission = z.infer<typeof AdminPermissionEnum>;

// ── Schémas dérivés : bootstrap & auth ──────────────────────────────────────

/** Création du tout premier superadmin (bootstrap protégé par secret d'env) */
export const RegisterSuperAdminSchema = z.object({
  fullName:        z.string().min(1),
  email:           z.string().email(),
  phone:           z.string().min(1),
  password:        z.string().min(8),
  bootstrapSecret: z.string().min(1),
});

/** Connexion */
export const LoginAdminSchema = z.object({
  identifiantLogin: z.string().min(1), // email ou téléphone
  password:         z.string().min(8),
});

/** Changement de mot de passe (admin déjà authentifié) */
export const ChangePasswordAuthenticatedSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword:     z.string().min(8),
}).refine((d) => d.currentPassword !== d.newPassword, {
  message: 'Le nouveau mot de passe doit être différent de l\'actuel',
  path: ['newPassword'],
});

/** Mot de passe oublié : demande d'OTP */
export const SendPasswordOtpSchema = z.object({
  email: z.string().email(),
});

/** Mot de passe oublié : réinitialisation via OTP */
export const ResetPasswordWithOtpSchema = z.object({
  email:       z.string().email(),
  otp:         z.string().length(6),
  newPassword: z.string().min(8),
});

// ── Schémas dérivés : gestion des comptes admin ─────────────────────────────

/** Création d'un sous-admin par le superadmin */
export const CreateSubAdminSchema = z.object({
  fullName:    z.string().min(1),
  email:       z.string().email(),
  phone:       z.string().min(1),
  password:    z.string().min(8),
  permissions: z.array(AdminPermissionEnum).min(1, 'Au moins une permission requise'),
});

/** Mise à jour des permissions (superadmin only) */
export const UpdateAdminPermissionsSchema = z.object({
  permissions: z.array(AdminPermissionEnum).min(1, 'Au moins une permission requise'),
});

/** Mise à jour du profil admin (soi-même) */
export const UpdateAdminProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  photo:    z.string().url().optional(),
  phone:    z.string().min(1).optional(),
});

// ── Schémas dérivés : modération ────────────────────────────────────────────

/** Changement de statut générique — admin, patient, ou hôpital ciblé */
export const UpdateAccountStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'blocked']),
  reason: z.string().min(5).max(300).optional(),
});

/** Changement de statut spécifique au médecin (statut 'pending' en plus) */
export const DoctorStatusSchema = z.object({
  status: z.enum(['active', 'pending', 'suspended', 'blocked']),
  reason: z.string().min(5).max(300).optional(),
});

// ── Schémas dérivés : pagination & documents ────────────────────────────────

/** Filtre de pagination pour listPayments / listAdmins */
export const PaginationQuerySchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Document complet depuis la DB */
export const AdminDocumentSchema = AdminSchema.extend({
  _id: objectId,
  __v: z.number().optional(),
});

// ── Types inférés (schémas dérivés) ─────────────────────────────────────────

export type TRegisterSuperAdmin       = z.infer<typeof RegisterSuperAdminSchema>;
export type TLoginAdmin               = z.infer<typeof LoginAdminSchema>;
export type TChangePasswordAuth       = z.infer<typeof ChangePasswordAuthenticatedSchema>;
export type TSendPasswordOtp          = z.infer<typeof SendPasswordOtpSchema>;
export type TResetPasswordWithOtp     = z.infer<typeof ResetPasswordWithOtpSchema>;
export type TCreateSubAdmin           = z.infer<typeof CreateSubAdminSchema>;
export type TUpdateAdminPermissions   = z.infer<typeof UpdateAdminPermissionsSchema>;
export type TUpdateAdminProfile       = z.infer<typeof UpdateAdminProfileSchema>;
export type TUpdateAccountStatus      = z.infer<typeof UpdateAccountStatusSchema>;
export type TDoctorStatus             = z.infer<typeof DoctorStatusSchema>;
export type TPaginationQuery          = z.infer<typeof PaginationQuerySchema>;