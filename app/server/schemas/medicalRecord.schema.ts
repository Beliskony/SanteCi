import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

// ── Sous-schémas ───────────────────────────────────────────────────────────────

const AttachmentSchema = z.object({
  name:       z.string().min(1),
  url:        z.string().url(),
  type:       z.string().min(1),
  uploadedAt: z.date(),
});

const PrivacySchema = z.object({
  accessLevel: z.enum(['private', 'shared', 'public']),
  sharedWith:  z.array(objectId).default([]),
});

const MetadataSchema = z.object({
  createdAt:  z.date().default(() => new Date()),
  updatedAt:  z.date().default(() => new Date()),
  verifiedBy: objectId.optional(),
});

// ── Schéma principal ───────────────────────────────────────────────────────────

export const MedicalRecordSchema = z.object({
  recordId:    z.string().min(1),
  patientId:   objectId,
  createdBy:   objectId,
  category:    z.string().min(1),
  title:       z.string().min(1),
  date:        z.date(),
  description: z.string().optional(),
  data:        z.record(z.string(), z.unknown()),
  attachments: z.array(AttachmentSchema).default([]),
  privacy:     PrivacySchema,
  metadata:    MetadataSchema.default(() => ({
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
});

// ── Types inférés ──────────────────────────────────────────────────────────────

export type TMedicalRecord    = z.infer<typeof MedicalRecordSchema>;
export type TAttachment       = z.infer<typeof AttachmentSchema>;
export type TPrivacy          = z.infer<typeof PrivacySchema>;
export type TMedicalMetadata  = z.infer<typeof MetadataSchema>;

// ── Schémas dérivés ────────────────────────────────────────────────────────────

/** Création d'un dossier médical */
export const CreateMedicalRecordSchema = MedicalRecordSchema.omit({
  recordId: true,
  metadata: true,
});

/** Mise à jour partielle */
export const UpdateMedicalRecordSchema = MedicalRecordSchema
  .omit({ recordId: true, patientId: true, createdBy: true, metadata: true })
  .partial();

/** Partage du dossier avec d'autres médecins */
export const ShareMedicalRecordSchema = z.object({
  sharedWith:  z.array(objectId).min(1, 'Au moins un médecin requis'),
  accessLevel: z.enum(['private', 'shared', 'public']),
});

/** Document complet depuis la DB */
export const MedicalRecordDocumentSchema = MedicalRecordSchema.extend({
  _id: objectId,
  __v: z.number().optional(),
});

export type TCreateMedicalRecord = z.infer<typeof CreateMedicalRecordSchema>;
export type TUpdateMedicalRecord = z.infer<typeof UpdateMedicalRecordSchema>;
export type TShareMedicalRecord  = z.infer<typeof ShareMedicalRecordSchema>;