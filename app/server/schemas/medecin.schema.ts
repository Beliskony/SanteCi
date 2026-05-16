import { z } from 'zod';

const objectId   = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:MM requis');

// ── Sous-schémas ───────────────────────────────────────────────────────────────

const ProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  title:     z.enum(['Dr', 'Pr', 'Médecin', 'Spécialiste']),
  specialty: z.enum([
    'Cardiologie', 'Pédiatrie', 'Généraliste',
    'Dermatologie', 'Psychiatrie', 'Gynécologie', 'autres...',
  ]),
  photo:     z.string().nullable().optional(), 
});

const CertificationSchema = z.object({
  name:   z.string().min(1),
  year:   z.number().int().min(1900).max(new Date().getFullYear()),
  issuer: z.string().min(1),
});

const ProfessionalSchema = z.object({
  licenseNumber:  z.string().min(1),
  licenseExpiry:  z.date(),
  university:     z.string().min(1),
  graduationYear: z.number().int().min(1900).max(new Date().getFullYear()),
  certifications: z.array(CertificationSchema).default([]),
});

const ContactSchema = z.object({
  phone:         z.string().min(1),
  phoneVerified: z.boolean().default(false),
  email:         z.string().email(),
  emailVerified: z.boolean().default(false),
});

const ConsultationFeesSchema = z.object({
  video: z.number().min(0).default(0),
  audio: z.number().min(0).default(0),
  chat:  z.number().min(0).default(0),
});

const SlotSchema = z.object({
  start:    timeString,
  end:      timeString,
  isBooked: z.boolean().default(false),
}).refine(
  (s) => s.start < s.end,
  { message: 'L\'heure de fin doit être après l\'heure de début', path: ['end'] }
);

const AvailabilitySchema = z.object({
  day:   z.enum(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']),
  slots: z.array(SlotSchema).default([]),
});

const TelemedicineSchema = z.object({
  isAvailable:         z.boolean().default(false),
  consultationTypes:   z.array(z.enum(['video', 'audio', 'chat'])).default([]),
  consultationFees:    ConsultationFeesSchema.default(() => ({
    video: 0, audio: 0, chat: 0,
  })),
  availability:        z.array(AvailabilitySchema).default([]),
  averageResponseTime: z.number().min(0).default(0),
  rating:              z.number().min(0).max(5).default(0),
  totalConsultations:  z.number().int().min(0).default(0),
});

const LocationSchema = z.object({
  city: z.string().min(1),
});

const AffiliationsSchema = z.object({
  hospitals:          z.array(objectId).default([]),
  clinics:            z.array(objectId).default([]),
  insuranceCompanies: z.array(z.string()).default([]),
});

const StatusSchema = z.object({
  isVerified:     z.boolean().default(false),
  isOnline:       z.boolean().default(false),
  lastActive:     z.date().optional(),
  accountStatus:  z.enum(['active', 'pending', 'suspended', 'blocked']).default('pending'),
  subscription:   z.enum(['free', 'premium', 'elite']).default('free'),
});

const AnalyticsSchema = z.object({
  totalPatients:       z.number().int().min(0).default(0),
  totalConsultations:  z.number().int().min(0).default(0),
  monthlyEarnings:     z.number().min(0).default(0),
  patientSatisfaction: z.number().min(0).max(100).default(0),
  cancellationRate:    z.number().min(0).max(100).default(0),
});

const DeviceSchema = z.object({
  deviceId:   z.string().min(1),
  platform:   z.enum(['ios', 'android', 'web']),
  lastActive: z.date(),
});

const SecuritySchema = z.object({
  password:         z.string().min(8),
  isMedcin:         z.boolean().default(true),
  twoFactorEnabled: z.boolean().default(false),
  devices:          z.array(DeviceSchema).default([]),
});

const MetadataSchema = z.object({
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// ── Schéma principal ───────────────────────────────────────────────────────────

export const DoctorSchema = z.object({
  doctorId:     z.string().min(1),
  profile:      ProfileSchema,
  professional: ProfessionalSchema,
  contact:      ContactSchema,
  telemedicine: TelemedicineSchema.default(() => ({
    isAvailable:         false,
    consultationTypes:   [],
    consultationFees:    { video: 0, audio: 0, chat: 0 },
    availability:        [],
    averageResponseTime: 0,
    rating:              0,
    totalConsultations:  0,
  })),
  location:     LocationSchema,
  affiliations: AffiliationsSchema.default(() => ({
    hospitals: [], clinics: [], insuranceCompanies: [],
  })),
  status:       StatusSchema.default(() => ({
    isVerified:    false,
    isOnline:      false,
    accountStatus: 'pending' as const,
    subscription:  'free'    as const,
  })),
  analytics:    AnalyticsSchema.default(() => ({
    totalPatients:       0,
    totalConsultations:  0,
    monthlyEarnings:     0,
    patientSatisfaction: 0,
    cancellationRate:    0,
  })),
  security:     SecuritySchema,
  metadata:     MetadataSchema.default(() => ({
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
});

// ── Types inférés ──────────────────────────────────────────────────────────────

export type TDoctor           = z.infer<typeof DoctorSchema>;
export type TDoctorProfile    = z.infer<typeof ProfileSchema>;
export type TDoctorProfessional = z.infer<typeof ProfessionalSchema>;
export type TDoctorContact    = z.infer<typeof ContactSchema>;
export type TTelemedicine     = z.infer<typeof TelemedicineSchema>;
export type TAvailability     = z.infer<typeof AvailabilitySchema>;
export type TSlot             = z.infer<typeof SlotSchema>;
export type TDevice           = z.infer<typeof DeviceSchema>;

// ── Schémas dérivés ────────────────────────────────────────────────────────────

/** Inscription d'un médecin */
export const RegisterDoctorSchema = DoctorSchema.omit({
  doctorId:  true,
  analytics: true,
  status:    true,
  metadata:  true,
}).extend({
  security: SecuritySchema.omit({ devices: true, isMedcin: true }),
});

/** Mise à jour du profil */
export const UpdateDoctorSchema = DoctorSchema
  .omit({ doctorId: true, security: true, metadata: true })
  .partial();

/** Connexion */
export const LoginDoctorSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

/** Document complet depuis la DB */
export const DoctorDocumentSchema = DoctorSchema.extend({
  _id: objectId,
  __v: z.number().optional(),
});

export type TRegisterDoctor = z.infer<typeof RegisterDoctorSchema>;
export type TUpdateDoctor   = z.infer<typeof UpdateDoctorSchema>;
export type TLoginDoctor    = z.infer<typeof LoginDoctorSchema>;