// app/server/models/prescription.model.ts
import mongoose, { Schema } from 'mongoose';
import { IPrescription } from '../interfaces/prescription.interface';

// ─── Sous-schéma médicament ───────────────────────────────────────────────────

const MedicationSchema = new Schema({
  name:         { type: String, required: true, trim: true },
  dosage:       { type: String, required: true, trim: true },
  frequency:    { type: String, required: true, trim: true },
  duration:     { type: String, required: true, trim: true },
  instructions: { type: String, trim: true },
  quantity:     { type: Number, required: true, min: 1 },
  unit:         { type: String, required: true, trim: true }, // ex: "comprimés", "ml"
}, { _id: false });

// ─── Sous-schéma examen ───────────────────────────────────────────────────────

const TestRequestedSchema = new Schema({
  type:         { type: String, required: true, trim: true },
  instructions: { type: String, trim: true },
  laboratory:   { type: String, trim: true },
}, { _id: false });

// ─── Schéma principal ─────────────────────────────────────────────────────────

const PrescriptionSchema = new Schema<IPrescription>(
  {
    prescriptionId: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },

    // ── Références ──────────────────────────────────────────────────────────
    patientId: {
      type:     Schema.Types.ObjectId,
      ref:      'Patient',
      required: true,
      index:    true,
    },
    doctorId: {
      type:     Schema.Types.ObjectId,
      ref:      'Doctor',
      required: true,
      index:    true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref:  'Appointment',
    },

    // ── Détails ─────────────────────────────────────────────────────────────
    date:         { type: Date,   required: true, default: Date.now },
    validityDays: { type: Number, required: true, min: 1, default: 90 },
    diagnosis:    { type: String, required: true, trim: true, maxlength: 500 },
    notes:        { type: String, trim: true, maxlength: 1000 },

    // ── Médicaments ─────────────────────────────────────────────────────────
    medications: {
      type:     [MedicationSchema],
      required: true,
      validate: {
        validator: (v: unknown[]) => v.length > 0,
        message:   'Au moins un médicament requis.',
      },
    },

    // ── Examens demandés ────────────────────────────────────────────────────
    testsRequested: {
      type:    [TestRequestedSchema],
      default: [],
    },

    // ── Statut ──────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['active', 'expired', 'completed', 'cancelled'],
      default: 'active',
      index:   true,
    },
    isDigital:     { type: Boolean, default: true },
    refillsAllowed: { type: Number, default: 0, min: 0 },
    refillsUsed:    { type: Number, default: 0, min: 0 },

    // ── Suivi ────────────────────────────────────────────────────────────────
    followUp: {
      required: { type: Boolean, default: false },
      date:     { type: Date },
      notes:    { type: String, trim: true, maxlength: 500 },
    },

    // ── Partage ──────────────────────────────────────────────────────────────
    sharing: {
      sharedWithPharmacies: [{ type: Schema.Types.ObjectId, ref: 'Pharmacy' }],
      patientAcknowledged:  { type: Boolean, default: false },
      acknowledgedAt:       { type: Date },
    },

    // ── Métadonnées ──────────────────────────────────────────────────────────
    metadata: {
      createdAt:   { type: Date, default: Date.now },
      updatedAt:   { type: Date, default: Date.now },
      generatedBy: {
        type:    String,
        enum:    ['doctor', 'system'],
        default: 'doctor',
      },
    },
  },
  { timestamps: false }
);



export const Prescription = mongoose.models.Prescription || mongoose.model<IPrescription>('Prescription', PrescriptionSchema);