import { z } from 'zod';

// ── Helpers ────────────────────────────────────────────────────────────────────
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

// ── Sous-schémas ───────────────────────────────────────────────────────────────
const DataSchema = z.object({
  appointmentId:  objectId.optional(),
  prescriptionId: objectId.optional(),
  doctorId:       objectId.optional(),
  patientId:      objectId.optional(),
  url:            z.string().url().optional(),
});

const ChannelsSchema = z.object({
  push:  z.boolean().default(true),
  email: z.boolean().default(false),
  sms:   z.boolean().default(false),
  inApp: z.boolean().default(true),
});

const StatutSchema = z.object({
  sent:        z.boolean().default(false),
  sentAt:      z.date().optional(),
  delivered:   z.boolean().default(false),
  deliveredAt: z.date().optional(),
  read:        z.boolean().default(false),
  readAt:      z.date().optional(),
});

const MetadataSchema = z.object({
  createdAt: z.date().default(() => new Date()),
  expiresAt: z.date().optional(),
  priority:  z.enum(['low', 'normal', 'high']).default('normal'),
});

// ── Schéma principal ───────────────────────────────────────────────────────────
export const NotificationSchema = z.object({
  userId:   objectId,
  userType: z.enum(['patient', 'doctor']),
  type:     z.enum(['appointment', 'prescription', 'message', 'reminder', 'payment', 'system', 'emergency']),
  title:    z.string().min(1),
  body:     z.string().min(1),
  data:     DataSchema.optional(),
    channels: ChannelsSchema.default(() => ({
    push:  true,
    email: false,
    sms:   false,
    inApp: true,
  })),

  statut: StatutSchema.default(() => ({
    sent:      false,
    delivered: false,
    read:      false,
  })),

  metadata: MetadataSchema.default(() => ({
    createdAt: new Date(),
    priority:  'normal' as const,
  })),
});

// ── Types inférés ──────────────────────────────────────────────────────────────
export type TNotification        = z.infer<typeof NotificationSchema>;
export type TNotificationData    = z.infer<typeof DataSchema>;
export type TNotificationChannels = z.infer<typeof ChannelsSchema>;
export type TNotificationStatut  = z.infer<typeof StatutSchema>;
export type TNotificationMetadata = z.infer<typeof MetadataSchema>;

// ── Schémas dérivés (usage courant) ───────────────────────────────────────────

/** Création : userId peut être un ObjectId Mongoose passé en string */
export const CreateNotificationSchema = NotificationSchema;

/** Mise à jour partielle */
export const UpdateNotificationSchema = NotificationSchema.partial();

/** Lecture depuis la DB : inclut les champs Mongoose automatiques */
export const NotificationDocumentSchema = NotificationSchema.extend({
  _id:       objectId,
  __v:       z.number().optional(),
});