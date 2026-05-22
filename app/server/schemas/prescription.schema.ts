// app/server/validators/prescription.validator.ts
import { z } from 'zod';

// ─── Médicament ───────────────────────────────────────────────────────────────

export const MedicationSchema = z.object({
  name:         z.string().min(1, 'Nom requis').max(100),
  dosage:       z.string().min(1, 'Dosage requis').max(50),
  frequency:    z.string().min(1, 'Fréquence requise').max(100),
  duration:     z.string().min(1, 'Durée requise').max(100),
  instructions: z.string().max(300).optional(),
  quantity:     z.number().int().min(1, 'Quantité minimum : 1'),
  unit:         z.string().min(1, 'Unité requise').max(30),
});

// ─── Examen demandé ───────────────────────────────────────────────────────────

export const TestRequestedSchema = z.object({
  type:         z.string().min(1, 'Type d\'examen requis').max(100),
  instructions: z.string().max(300).optional(),
  laboratory:   z.string().max(100).optional(),
});

// ─── Création ─────────────────────────────────────────────────────────────────

export const CreatePrescriptionSchema = z.object({
  patientId:      z.string().min(1, 'patientId requis'),
  appointmentId:  z.string().optional(),
  diagnosis:      z.string().min(1, 'Diagnostic requis').max(500),
  medications:    z.array(MedicationSchema).min(1).max(20),
  testsRequested: z.array(TestRequestedSchema).max(10).optional(),
  notes:          z.string().max(1000).optional(),
  validityDays:   z.number().int().min(1).max(365).default(90),
  refillsAllowed: z.number().int().min(0).max(10).default(0),
  followUp: z.object({
    required: z.boolean().default(false),
    date:     z.coerce.date().optional(),
    notes:    z.string().max(500).optional(),
  }).optional(),
});

// ─── Mise à jour (médecin) ────────────────────────────────────────────────────

export const UpdatePrescriptionSchema = z.object({
  notes:          z.string().max(1000).optional(),
  validityDays:   z.number().int().min(1).max(365).optional(),
  refillsAllowed: z.number().int().min(0).max(10).optional(),
  followUp: z.object({
    required: z.boolean().optional(),
    date:     z.coerce.date().optional(),
    notes:    z.string().max(500).optional(),
  }).optional(),
  status: z.enum(['active', 'expired', 'completed', 'cancelled']).optional(),
});

// ─── Accusé de réception patient ─────────────────────────────────────────────

export const AcknowledgePrescriptionSchema = z.object({
  prescriptionId: z.string().min(1),
});

// ─── Types inférés ────────────────────────────────────────────────────────────

export type CreatePrescriptionDTO  = z.infer<typeof CreatePrescriptionSchema>;
export type UpdatePrescriptionDTO  = z.infer<typeof UpdatePrescriptionSchema>;
export type MedicationDTO          = z.infer<typeof MedicationSchema>;
export type TestRequestedDTO       = z.infer<typeof TestRequestedSchema>;