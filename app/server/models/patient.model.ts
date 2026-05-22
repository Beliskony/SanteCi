import mongoose, { Schema } from 'mongoose';
import { IPatient } from '../interfaces/patient.interface';

const PatientSchema: Schema = new Schema({
 patientId: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  profile: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    photo: { type: String },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  },
  contact: {
    phone: { type: String, required: true, unique: true },
    phoneVerified: { type: Boolean, default: true },
    email: { type: String, unique: true, sparse: true },
    emailVerified: { type: Boolean, default: true },
    emergencyContacts: [{
      name: { type: String, required: true },
      phone: { type: String, required: true },
      relationship: { type: String, required: true },
    }],
  },
  location: { 
    city: { type: String, required: true },
    district: { type: String },
    address: { type: String },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
  },
  health: {
    allergies: [{ type: String }],
    chronicDiseases: [{ type: String }],
    currentMedications: [{ type: String }],
    disabilities: [{ type: String }],
    height: { type: Number },
    weight: { type: Number },
    bmi: { type: Number },
    },
  prescriptions: [{
    prescriptionId: { type: mongoose.Types.ObjectId, ref: 'Prescription', required: true },
    doctorId: { type: mongoose.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentId: { type: mongoose.Types.ObjectId, ref: 'Appointment' },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date },
  }],
  security: {
    password: { type: String, required: true },
    isPatient: { type: Boolean, default: true },
    pinCode: { type: String },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    failedAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  preferences: {
        language: { type: String, enum: ['fr', 'en'], default: 'fr' },
        notifications: {
          sms: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
        },
        privacy: {
          showProfile: { type: Boolean, default: true },
          showMedicalInfo: { type: Boolean, default: true },
          shareLocation: { type: Boolean, default: false },
        },
    },
    status: {
        isVerified: { type: Boolean, default: false },
        verificationCode: { type: String },
        verificationExpires: { type: Date },
        accountStatus: { type: String, enum: ['active', 'suspended', 'blocked'], default: 'active' },
        subscription: { type: String, enum: ['free', 'premium', 'vip'], default: 'free' },
    },
    metadata: {
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        lastMedicalUpdate: { type: Date, default: Date.now },
        totalConsultations: { type: Number, default: 0 },
        totalPrescriptions: { type: Number, default: 0 },
    },
});

PatientSchema.index({ 'profile.firstName': 'text', 'profile.lastName': 'text' });
PatientSchema.index({ 'contact.phone': 1 });
PatientSchema.index({ 'contact.email': 1 });
PatientSchema.index({ 'status.accountStatus': 1 });
PatientSchema.index({ 'location.city': 1 });



export const Patient = mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);
