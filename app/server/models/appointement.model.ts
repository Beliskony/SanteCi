import mongoose, { Schema } from 'mongoose';
import { IAppointment } from '../interfaces/appointement.interface';

const AppointmentSchema: Schema = new Schema({
  appointmentId: { type: String, required: true, unique: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  details: {
    type: {
      type: String,
      enum: ['video', 'audio', 'chat', 'in_person'],
      required: true
    },
    scheduledFor: { type: Date, required: true },
    duration: { type: Number, required: true },
    reason: { type: String, required: true },
    symptoms: [{ type: String }],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'emergency'],
      required: true
    }
  },
  status: {
    current: {
      type: String,
      enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled', 'no_show'],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      required: true
    },
    cancellationReason: { type: String },
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'system']
    }
  },
  consultation: {
    startedAt: { type: Date },
    endedAt: { type: Date },
    actualDuration: { type: Number },
    notes: { type: String },
    diagnosis: { type: String },
    recommendations: [{ type: String }],
    prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    followUpDate: { type: Date }
  },
  payment: {
    amount: { type: Number, required: true },
    currency: {
      type: String,
      enum: ['XOF', 'EUR', 'USD'],
      required: true
    },
    method: {
      type: String,
      enum: ['mobile_money', 'card', 'wallet', 'Assurance'],
      required: true
    },
    provider: {
      type: String,
      enum: ['orange_money', 'mtn_money', 'wave']
    },
    transactionId: { type: String },
    paidAt: { type: Date }
  },
  communication: {
    chatRoomId: { type: String, required: true },
    videoRoomId: { type: String },
    recordings: [{ type: String }],
    sharedDocuments: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      uploadedBy: {
        type: String,
        enum: ['patient', 'doctor'],
        required: true
      }
    }]
  },
  notifications: {
    remindersSent: { type: Number, default: 0 },
    lastReminderSent: { type: Date },
    patientJoinedAt: { type: Date },
    doctorJoinedAt: { type: Date }
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },

});

export const Appointment = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema);