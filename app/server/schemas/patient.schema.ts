import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

// ── Sous-schémas ───────────────────────────────────────────────────────────────

const ProfileSchema = z.object({
  firstName:   z.string().min(1),
  lastName:    z.string().min(1),
  dateOfBirth: z.date(),
  gender:      z.enum(['male', 'female', 'other']),
  photo:       z.string().url().optional(),
  bloodGroup:  z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
});

const EmergencyContactSchema = z.object({
  name:         z.string().min(1),
  phone:        z.string().min(1),
  relationship: z.string().min(1),
});

const ContactSchema = z.object({
  phone:             z.string().min(1),
  phoneVerified:     z.boolean().default(false),
  email:             z.string().email().optional(),
  emailVerified:     z.boolean().default(false),
  emergencyContacts: z.array(EmergencyContactSchema).default([]),
});

const CoordinatesSchema = z.object({
  latitude:  z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).refine(
  (c) => {
    const hasLat = c.latitude  !== undefined;
    const hasLng = c.longitude !== undefined;
    return hasLat === hasLng; // les deux ou aucun
  },
  { message: 'latitude et longitude doivent être fournis ensemble' }
);

const LocationSchema = z.object({
  city:        z.string().min(1),
  district:    z.string().optional(),
  address:     z.string().optional(),
  coordinates: CoordinatesSchema.optional(),
});

const HealthSchema = z.object({
  allergies:          z.array(z.string()).default([]),
  chronicDiseases:    z.array(z.string()).default([]),
  currentMedications: z.array(z.string()).default([]),
  disabilities:       z.array(z.string()).default([]),
  height:             z.number().positive().optional(),   // cm
  weight:             z.number().positive().optional(),   // kg
  bmi:                z.number().positive().optional(),
}).refine(
  (h) => {
    if (h.height && h.weight) {
      const expectedBmi = h.weight / Math.pow(h.height / 100, 2);
      return !h.bmi || Math.abs(h.bmi - expectedBmi) < 1;
    }
    return true;
  },
  { message: 'Le BMI ne correspond pas aux valeurs height/weight fournies', path: ['bmi'] }
);

const SecuritySchema = z.object({
  password:       z.string().min(8),
  isPatient:      z.boolean().default(true),
  pinCode:        z.string().regex(/^\d{4,6}$/, 'Le PIN doit contenir 4 à 6 chiffres').optional(),
  isActive:       z.boolean().default(true),
  lastLogin:      z.date().optional(),
  failedAttempts: z.number().int().min(0).default(0),
  lockUntil:      z.date().optional(),
});

const NotificationPrefsSchema = z.object({
  sms:   z.boolean().default(true),
  email: z.boolean().default(true),
  push:  z.boolean().default(true),
});

const PrivacyPrefsSchema = z.object({
  showProfile:    z.boolean().default(true),
  showMedicalInfo: z.boolean().default(true),
  shareLocation:  z.boolean().default(false),
});

const PreferencesSchema = z.object({
  language:      z.enum(['fr', 'en']).default('fr'),
  notifications: NotificationPrefsSchema.default(() => ({
    sms: true, email: true, push: true,
  })),
  privacy:       PrivacyPrefsSchema.default(() => ({
    showProfile: true, showMedicalInfo: true, shareLocation: false,
  })),
});

const StatusSchema = z.object({
  isVerified:          z.boolean().default(false),
  verificationCode:    z.string().optional(),
  verificationExpires: z.date().optional(),
  accountStatus:       z.enum(['active', 'suspended', 'blocked']).default('active'),
  subscription:        z.enum(['free', 'premium', 'vip']).default('free'),
});

const MetadataSchema = z.object({
  createdAt:          z.date().default(() => new Date()),
  updatedAt:          z.date().default(() => new Date()),
  lastMedicalUpdate:  z.date().default(() => new Date()),
  totalConsultations: z.number().int().min(0).default(0),
  totalPrescriptions: z.number().int().min(0).default(0),
});

// ── Schéma principal ───────────────────────────────────────────────────────────

export const PatientSchema = z.object({
  patientId:   z.string().trim().min(1),
  profile:     ProfileSchema,
  contact:     ContactSchema,
  location:    LocationSchema,
  health:      HealthSchema.default(() => ({
    allergies: [], chronicDiseases: [],
    currentMedications: [], disabilities: [],
  })),
  security:    SecuritySchema,
  preferences: PreferencesSchema.default(() => ({
    language:      'fr' as const,
    notifications: { sms: true, email: true, push: true },
    privacy:       { showProfile: true, showMedicalInfo: true, shareLocation: false },
  })),
  status:      StatusSchema.default(() => ({
    isVerified:    false,
    accountStatus: 'active'  as const,
    subscription:  'free'    as const,
  })),
  metadata:    MetadataSchema.default(() => ({
    createdAt:          new Date(),
    updatedAt:          new Date(),
    lastMedicalUpdate:  new Date(),
    totalConsultations: 0,
    totalPrescriptions: 0,
  })),
});

// ── Types inférés ──────────────────────────────────────────────────────────────

export type TPatient             = z.infer<typeof PatientSchema>;
export type TPatientProfile      = z.infer<typeof ProfileSchema>;
export type TPatientContact      = z.infer<typeof ContactSchema>;
export type TPatientLocation     = z.infer<typeof LocationSchema>;
export type TPatientHealth       = z.infer<typeof HealthSchema>;
export type TPatientSecurity     = z.infer<typeof SecuritySchema>;
export type TPatientPreferences  = z.infer<typeof PreferencesSchema>;
export type TPatientStatus       = z.infer<typeof StatusSchema>;
export type TEmergencyContact    = z.infer<typeof EmergencyContactSchema>;

// ── Schémas dérivés ────────────────────────────────────────────────────────────

/** Inscription */
export const RegisterPatientSchema = PatientSchema.omit({
  patientId: true,
  status:    true,
  metadata:  true,
}).extend({
  security: SecuritySchema.omit({
    isPatient: true, failedAttempts: true,
    lockUntil: true, lastLogin: true,
  }),
});

/** Connexion */
export const LoginPatientSchema = z.object({
  phone:    z.string().min(1).optional(),
  email:    z.string().email().optional(),
  password: z.string().min(8),
}).refine(
  (d) => d.phone || d.email,
  { message: 'Un email ou un numéro de téléphone est requis' }
);

/** Mise à jour du profil */
export const UpdatePatientSchema = PatientSchema
  .omit({ patientId: true, security: true, metadata: true })
  .partial();

/** Mise à jour du mot de passe */
export const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword:     z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine(
  (d) => d.newPassword === d.confirmPassword,
  { message: 'Les mots de passe ne correspondent pas', path: ['confirmPassword'] }
);

/** Document complet depuis la DB */
export const PatientDocumentSchema = PatientSchema.extend({
  _id: objectId,
  __v: z.number().optional(),
});

export type TRegisterPatient  = z.infer<typeof RegisterPatientSchema>;
export type TLoginPatient     = z.infer<typeof LoginPatientSchema>;
export type TUpdatePatient    = z.infer<typeof UpdatePatientSchema>;
export type TUpdatePassword   = z.infer<typeof UpdatePasswordSchema>;