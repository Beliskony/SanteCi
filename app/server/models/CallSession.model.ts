import { Schema, model } from 'mongoose';
import { ICallSession } from '../interfaces/callSession.interface';

const CallSessionSchema = new Schema<ICallSession>(
  {
    // ── Participants ────────────────────────────────────────────────────────
    callerId:     { type: Schema.Types.ObjectId, required: true, ref: 'Doctor' },
    callerType:   { type: String, enum: ['doctor', 'patient'], required: true },
    receiverId:   { type: Schema.Types.ObjectId, required: true },
    receiverType: { type: String, enum: ['doctor', 'patient'], required: true },

    // ── Lien RDV ────────────────────────────────────────────────────────────
    appointmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Appointment' },
    chatRoomId:    { type: String, required: true },

    // ── Type d'appel ────────────────────────────────────────────────────────
    callType: { type: String, enum: ['audio', 'video'], required: true },

    // ── Statut ──────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'accepted', 'declined', 'ended', 'missed', 'failed'],
      default: 'initiated',
    },

    // ── Agora ───────────────────────────────────────────────────────────────
    agora: {
      channelName:   { type: String, required: true },
      callerToken:   { type: String, required: true },
      receiverToken: { type: String, required: true },
      callerUid:     { type: Number, required: true },
      receiverUid:   { type: Number, required: true },
      appId:         { type: String, required: true },
    },

    // ── Timing ──────────────────────────────────────────────────────────────
    timing: {
      initiatedAt: { type: Date, default: Date.now },
      ringingAt:   { type: Date },
      acceptedAt:  { type: Date },
      endedAt:     { type: Date },
      duration:    { type: Number }, // secondes
    },

    // ── Fin d'appel ─────────────────────────────────────────────────────────
    endedBy:       { type: String, enum: ['caller', 'receiver', 'system'] },
    declineReason: { type: String },
    failureReason: { type: String },

    // ── Metadata ────────────────────────────────────────────────────────────
    metadata: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  { versionKey: false }
);

// Index pour retrouver rapidement les appels d'un utilisateur
CallSessionSchema.index({ callerId: 1, 'timing.initiatedAt': -1 });
CallSessionSchema.index({ receiverId: 1, 'timing.initiatedAt': -1 });
CallSessionSchema.index({ appointmentId: 1 });
CallSessionSchema.index({ 'agora.channelName': 1 }, { unique: true });

export const CallSession = model<ICallSession>('CallSession', CallSessionSchema);