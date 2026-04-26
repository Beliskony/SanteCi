import mongoose, { Schema } from 'mongoose';
import { INotification } from '../interfaces/notification.interface';

const NotificationSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, refPath: 'userType' },
  userType: { type: String, enum: ['patient', 'doctor'], required: true },
  type: { type: String, enum: ['appointment', 'prescription', 'message', 'reminder', 'payment', 'system', 'emergency'], required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: {
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
    url: { type: String },
  },
  channels: {
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
  },
  statut: {
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
    delivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  metadata: {
    createdAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  },
});


export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);