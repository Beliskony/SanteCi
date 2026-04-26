import mongoose, { Schema } from 'mongoose';
import { IDoctor } from '../interfaces/medecin.interface';


const DoctorSchema: Schema = new Schema({
  doctorId: { type: String, required: true, unique: true },
  profile: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    title: { type: String, enum: ['Dr', 'Pr', 'Médecin', 'Spécialiste'], required: true },
    specialty: { type: String, enum: ['Cardiologie', 'Pédiatrie', 'Généraliste', 'Dermatologie', 'Psychiatrie', 'Gynécologie', 'autres...'], required: true },
  },
  professional: {
    licenseNumber: { type: String, required: true },
    licenseExpiry: { type: Date, required: true },
    university: { type: String, required: true },
    graduationYear: { type: Number, required: true },
    certifications: [{
      name: { type: String, required: true },
      year: { type: Number, required: true },
      issuer: { type: String, required: true },
    }],
  },
  contact: {
    phone: { type: String, required: true, unique: true },
    phoneVerified: { type: Boolean, default: false },
    email: { type: String, required: true, unique:true},
    emailVerified:{type:Boolean,default:false},
  },
  telemedicine: {
    isAvailable: { type: Boolean, default: false },
    consultationTypes: [{ type: String, enum: ['video', 'audio', 'chat'] }],
    consultationFees: {
      video: { type: Number, default: 0 },
      audio: { type: Number, default: 0 },
      chat: { type: Number, default: 0 },
    },
    availability: [{
      day: { type: String, enum: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'], required: true },
      slots: [{
        start: { type: String, required: true },
        end: { type: String, required: true },
        isBooked: { type: Boolean, default: false },
      }],
    }],
    averageResponseTime: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    totalConsultations: { type: Number, default: 0 },
  },
  location: {
    city: { type: String, required: true },
  },
  affiliations: {
    hospitals: [{ type: Schema.Types.ObjectId, ref: 'Hospital' }],
    clinics: [{ type: Schema.Types.ObjectId, ref: 'Clinic' }],
    insuranceCompanies: [{ type: String }],
  },
  status: {
    isVerified: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    lastActive: { type: Date },
    accountStatus: { type: String, enum: ['active', 'pending', 'suspended', 'blocked'], default: 'pending' },
    subscription: { type: String, enum: ['free', 'premium', 'elite'], default: 'free' },
  },
  analytics: {
    totalPatients: { type: Number, default: 0 },
    totalConsultations: { type: Number, default: 0 },
    monthlyEarnings: { type: Number, default: 0 },
    patientSatisfaction: { type: Number, default: 0 },
    cancellationRate: { type: Number, default: 0 },
  },
  security: {
    password: { type: String, required: true },
    isMedcin: { type: Boolean, default: true },
    twoFactorEnabled: { type: Boolean, default: false },
    devices: [{
      deviceId: { type: String, required: true },
      platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
      lastActive: { type: Date, required: true },
    }],
  },
}, 
{ timestamps: { createdAt: 'metadata.createdAt', updatedAt: 'metadata.updatedAt' } });



export const Doctor = mongoose.models.Doctor || mongoose.model<IDoctor>('Doctor', DoctorSchema);