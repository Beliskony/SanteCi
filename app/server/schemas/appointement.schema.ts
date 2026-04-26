import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId');

// ── Sous-schémas ───────────────────────────────────────────────────────────────

const DetailsSchema = z.object({
  type:         z.enum(['video', 'audio', 'chat', 'in_person']),
  scheduledFor: z.date(),
  duration:     z.number().positive(),
  reason:       z.string().min(1),
  symptoms:     z.array(z.string()).default([]),
  priority:     z.enum(['low', 'medium', 'high', 'emergency']),
});

const StatusSchema = z.object({
  current:            z.enum(['pending', 'confirmed', 'ongoing', 'completed', 'cancelled', 'no_show']),
  paymentStatus:      z.enum(['pending', 'paid', 'refunded', 'failed']),
  cancellationReason: z.string().optional(),
  cancelledBy:        z.enum(['patient', 'doctor', 'system']).optional(),
});

const ConsultationSchema = z.object({
  startedAt:      z.date().optional(),
  endedAt:        z.date().optional(),
  actualDuration: z.number().positive().optional(),
  notes:          z.string().optional(),
  diagnosis:      z.string().optional(),
  recommendations: z.array(z.string()).default([]),
  prescriptionId: objectId.optional(),
  followUpDate:   z.date().optional(),
});

const PaymentSchema = z.object({
  amount:        z.number().positive(),
  currency:      z.enum(['XOF', 'EUR', 'USD']),
  method:        z.enum(['mobile_money', 'card', 'wallet', 'Assurance']),
  provider:      z.enum(['orange_money', 'mtn_money', 'wave']).optional(),
  transactionId: z.string().optional(),
  paidAt:        z.date().optional(),
});

const SharedDocumentSchema = z.object({
  name:       z.string().min(1),
  url:        z.string().url(),
  uploadedBy: z.enum(['patient', 'doctor']),
});

const CommunicationSchema = z.object({
  chatRoomId:      z.string().min(1),
  videoRoomId:     z.string().optional(),
  recordings:      z.array(z.string()).default([]),
  sharedDocuments: z.array(SharedDocumentSchema).default([]),
});

const NotificationsSchema = z.object({
  remindersSent:    z.number().int().min(0).default(0),
  lastReminderSent: z.date().optional(),
  patientJoinedAt:  z.date().optional(),
  doctorJoinedAt:   z.date().optional(),
});

const MetadataSchema = z.object({
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// ── Schéma principal ───────────────────────────────────────────────────────────

export const AppointmentSchema = z.object({
  appointmentId: z.string().min(1),
  patientId:     objectId,
  doctorId:      objectId,
  details:       DetailsSchema,
  status:        StatusSchema,
  consultation:  ConsultationSchema.default({}  as any),
  payment:       PaymentSchema,
  communication: CommunicationSchema,
  notifications: NotificationsSchema.default(() => ({ remindersSent: 0 })),
  metadata:      MetadataSchema.default(() => ({
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
});

// ── Types inférés ──────────────────────────────────────────────────────────────

export type TAppointment        = z.infer<typeof AppointmentSchema>;
export type TAppointmentDetails = z.infer<typeof DetailsSchema>;
export type TAppointmentStatus  = z.infer<typeof StatusSchema>;
export type TConsultation       = z.infer<typeof ConsultationSchema>;
export type TPayment            = z.infer<typeof PaymentSchema>;
export type TCommunication      = z.infer<typeof CommunicationSchema>;
export type TSharedDocument     = z.infer<typeof SharedDocumentSchema>;

// ── Schémas dérivés ────────────────────────────────────────────────────────────

/** Création d'un rendez-vous */
export const CreateAppointmentSchema = AppointmentSchema.omit({
  consultation: true,
  notifications: true,
  metadata: true,
});

/** Mise à jour partielle */
export const UpdateAppointmentSchema = AppointmentSchema.partial();

/** Document complet depuis la DB */
export const AppointmentDocumentSchema = AppointmentSchema.extend({
  _id: objectId,
  __v: z.number().optional(),
});

export type TCreateAppointment = z.infer<typeof CreateAppointmentSchema>;
export type TUpdateAppointment = z.infer<typeof UpdateAppointmentSchema>;