// app/server/schemas/HospitalClinic.schema.ts

import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

// ── Helpers ────────────────────────────────────────────────────────────────────

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:MM requis');

// ── Sous-schémas ───────────────────────────────────────────────────────────────

const CoordinatesSchema = z.object({
  latitude:  z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).optional();

const LocationSchema = z.object({
  address:     z.string().min(1, 'Adresse requise'),
  city:        z.string().min(1, 'Ville requise'),
  district:    z.string().min(1, 'District requis'),
  commune:     z.string().optional(),
  coordinates: CoordinatesSchema,
});

const ContactSchema = z.object({
  phoneNumbers:    z.array(z.string().min(1)).min(1, 'Au moins un numéro requis'),
  email:           z.string().email('Email invalide'),
  website:         z.string().url('URL invalide').optional().or(z.literal('')),
  emergencyNumber: z.string().optional().or(z.literal('')),
});

const ServiceHoursSchema = z.object({
  open:  timeString.optional(),
  close: timeString.optional(),
});

const ServiceSchema = z.object({
  name:      z.string().min(1, 'Nom du service requis'),
  specialty: z.string().optional().or(z.literal('')),
  available: z.boolean().default(true),
  hours:     ServiceHoursSchema.optional(),
});

const StaffSchema = z.object({
  doctors:        z.array(objectId).default([]),
  nurses:         z.number().int().min(0).default(0),
  administrators: z.number().int().min(0).default(0),
});

const FacilitiesSchema = z.object({
  consultationRooms: z.number().int().min(0).default(0),
  emergencyRoom:     z.boolean().default(false),
  pharmacy:          z.boolean().default(false),
  laboratory:        z.boolean().default(false),
  imaging:           z.boolean().default(false),
  beds:              z.number().int().min(0).default(0),
});

const PartnershipsSchema = z.object({
  insuranceCompanies:  z.array(z.string()).default([]),
  telemedicineEnabled: z.boolean().default(false),
  homeVisits:          z.boolean().default(false),
});

const DayHoursSchema = z.object({
  open:  timeString.default('08:00'),
  close: timeString.default('18:00'),
});

const HoursSchema = z.object({
  weekdays:    DayHoursSchema,
  saturday:    DayHoursSchema,
  sunday:      DayHoursSchema,
  emergency24h: z.boolean().default(false),
});

const CertificationSchema = z.object({
  licenseNumber: z.string().min(1, 'Numéro de licence requis'),
  accreditation: z.array(z.string().min(1)).default([]),
  expiryDate:    z.date().or(z.string().transform((str) => new Date(str))),
});

const MetadataSchema = z.object({
  createdAt:    z.date().default(() => new Date()),
  updatedAt:    z.date().default(() => new Date()),
  verified:     z.boolean().default(false),
  rating:       z.number().min(0).max(5).default(0),
  totalReviews: z.number().int().min(0).default(0),
});

const ImageCoverSchema = z.object({
  url:      z.string().url(),
  publicId: z.string().min(1),
}).optional();

//  CORRECTION : StatusSchema simplifié
const StatusSchema = z.object({
  accountStatus: z.enum(['active', 'suspended', 'blocked']).default('active'),
});

// ── Schéma principal ───────────────────────────────────────────────────────────

export const HospitalClinicSchema = z.object({
  facilityId:   z.string().min(1),
  name:         z.string().min(1, 'Nom requis'),
  type:         z.enum(['hospital', 'clinic', 'pharmacy', 'laboratory', 'imaging_center']),
  category:     z.enum(['public', 'private', 'community']).default('private'),
  imageCover:   ImageCoverSchema,
  location:     LocationSchema,
  contact:      ContactSchema,
  services:     z.array(ServiceSchema).default([]),
  staff:        StaffSchema,
  facilities:   FacilitiesSchema,
  partnerships: PartnershipsSchema,
  hours:        HoursSchema,
  certification: CertificationSchema,
  status:       StatusSchema, //  Correction : plus d'imbrication
  metadata:     MetadataSchema.default(() => ({
    createdAt:    new Date(),
    updatedAt:    new Date(),
    verified:     false,
    rating:       0,
    totalReviews: 0,
  })),
});

// ── Schéma pour la création ────────────────────────────────────────────────────

export const CreateHospitalClinicSchema = z.object({
  name:         z.string().min(1, 'Nom requis'),
  type:         z.enum(['hospital', 'clinic', 'pharmacy', 'laboratory', 'imaging_center']),
  category:     z.enum(['public', 'private', 'community']).default('private'),
  location:     LocationSchema,
  contact:      ContactSchema,
  services:     z.array(ServiceSchema).default([]),
  staff:        StaffSchema.default({ doctors: [], nurses: 0, administrators: 0 }),
  facilities:   FacilitiesSchema.default({
    consultationRooms: 0,
    emergencyRoom: false,
    pharmacy: false,
    laboratory: false,
    imaging: false,
    beds: 0,
  }),
  partnerships: PartnershipsSchema.default({
    insuranceCompanies: [],
    telemedicineEnabled: false,
    homeVisits: false,
  }),
  hours:        HoursSchema,
  certification: CertificationSchema,
});

// ── Types inférés ──────────────────────────────────────────────────────────────

export type THospitalClinic   = z.infer<typeof HospitalClinicSchema>;
export type TLocation         = z.infer<typeof LocationSchema>;
export type TContact          = z.infer<typeof ContactSchema>;
export type TService          = z.infer<typeof ServiceSchema>;
export type TStaff            = z.infer<typeof StaffSchema>;
export type TFacilities       = z.infer<typeof FacilitiesSchema>;
export type TPartnerships     = z.infer<typeof PartnershipsSchema>;
export type THours            = z.infer<typeof HoursSchema>;
export type TCertification    = z.infer<typeof CertificationSchema>;
export type TCreateHospitalClinic = z.infer<typeof CreateHospitalClinicSchema>;
export type TUpdateHospitalClinic = z.infer<typeof UpdateHospitalClinicSchema>;

/** Mise à jour partielle */
export const UpdateHospitalClinicSchema = HospitalClinicSchema.partial();

/** Document complet depuis la DB */
export const HospitalClinicDocumentSchema = HospitalClinicSchema.extend({
  _id: objectId,
  __v: z.number().optional(),
});