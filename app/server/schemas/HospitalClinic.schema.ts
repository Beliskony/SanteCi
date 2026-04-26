import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

// ── Helpers ────────────────────────────────────────────────────────────────────

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:MM requis');

// ── Sous-schémas ───────────────────────────────────────────────────────────────

const CoordinatesSchema = z.object({
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const LocationSchema = z.object({
  address:     z.string().min(1),
  city:        z.string().min(1),
  district:    z.string().min(1),
  commune:     z.string().optional(),
  coordinates: CoordinatesSchema,
});

const ContactSchema = z.object({
  phoneNumbers:    z.array(z.string().min(1)).min(1, 'Au moins un numéro requis'),
  email:           z.string().email(),
  website:         z.string().url().optional(),
  emergencyNumber: z.string().optional(),
});

const ServiceHoursSchema = z.object({
  open:  timeString.optional(),
  close: timeString.optional(),
});

const ServiceSchema = z.object({
  name:      z.string().min(1),
  specialty: z.string().optional(),
  available: z.boolean(),
  hours:     ServiceHoursSchema.optional(),
});

const StaffSchema = z.object({
  doctors:        z.array(objectId).default([]),
  nurses:         z.number().int().min(0),
  administrators: z.number().int().min(0),
});

const FacilitiesSchema = z.object({
  consultationRooms: z.number().int().min(0),
  emergencyRoom:     z.boolean(),
  pharmacy:          z.boolean(),
  laboratory:        z.boolean(),
  imaging:           z.boolean(),
  beds:              z.number().int().min(0),
});

const PartnershipsSchema = z.object({
  insuranceCompanies:  z.array(z.string()).default([]),
  telemedicineEnabled: z.boolean(),
  homeVisits:          z.boolean(),
});

const DayHoursSchema = z.object({
  open:  timeString,
  close: timeString,
});

const HoursSchema = z.object({
  weekdays:    DayHoursSchema,
  saturday:    DayHoursSchema,
  sunday:      DayHoursSchema,
  emergency24h: z.boolean(),
});

const CertificationSchema = z.object({
  licenseNumber: z.string().min(1),
  accreditation: z.array(z.string().min(1)).default([]),
  expiryDate:    z.date(),
});

const MetadataSchema = z.object({
  createdAt:    z.date().default(() => new Date()),
  updatedAt:    z.date().default(() => new Date()),
  verified:     z.boolean().default(false),
  rating:       z.number().min(0).max(5).default(0),
  totalReviews: z.number().int().min(0).default(0),
});

// ── Schéma principal ───────────────────────────────────────────────────────────

export const HospitalClinicSchema = z.object({
  facilityId:   z.string().min(1),
  name:         z.string().min(1),
  type:         z.string().min(1),
  category:     z.string().min(1),
  location:     LocationSchema,
  contact:      ContactSchema,
  services:     z.array(ServiceSchema).default([]),
  staff:        StaffSchema,
  facilities:   FacilitiesSchema,
  partnerships: PartnershipsSchema,
  hours:        HoursSchema,
  certification: CertificationSchema,
  metadata:     MetadataSchema.default(() => ({
    createdAt:    new Date(),
    updatedAt:    new Date(),
    verified:     false,
    rating:       0,
    totalReviews: 0,
  })),
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

// ── Schémas dérivés ────────────────────────────────────────────────────────────

/** Création d'un établissement */
export const CreateHospitalClinicSchema = HospitalClinicSchema.omit({
  metadata: true,
});

/** Mise à jour partielle */
export const UpdateHospitalClinicSchema = HospitalClinicSchema.partial();

/** Document complet depuis la DB */
export const HospitalClinicDocumentSchema = HospitalClinicSchema.extend({
  _id: objectId,
  __v: z.number().optional(),
});

export type TCreateHospitalClinic = z.infer<typeof CreateHospitalClinicSchema>;
export type TUpdateHospitalClinic = z.infer<typeof UpdateHospitalClinicSchema>;