import { Document, Types } from 'mongoose';

export interface IPatient extends Document {
  _id: Types.ObjectId;
  // Informations personnelles
  profile: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'male' | 'female' | 'other';
    photo?: string;
    bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  };
  
  // Contacts
  contact: {
    phone: string; // Utilisé pour la connexion
    phoneVerified: boolean;
    email?: string;
    emailVerified: boolean;
    emergencyContacts: Array<{
      name: string;
      phone: string;
      relationship: string;
    }>;
  };
  
  // Localisation
  location: {
    city: string;
    district?: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Santé
  health: {
    allergies: string[];
    chronicDiseases: string[];
    currentMedications: string[];
    disabilities?: string[];
    height?: number; // en cm
    weight?: number; // en kg
    bmi?: number;
  };

  prescriptions?: Array<{
    prescriptionId: Types.ObjectId;  // ref → Prescription
    doctorId: Types.ObjectId;        // ref → Doctor
    appointmentId?: Types.ObjectId;  // ref → Appointment (optionnel)
    issuedAt: Date;
    expiresAt?: Date;
  }>;
  
  // Sécurité
  security: {
    password: string;
    isPatient: boolean;
    pinCode?: string; // Pour accès rapide
    isActive: boolean;
    lastLogin?: Date;
    failedAttempts: number;
    lockUntil?: Date;
  };
  
  // Préférences
  preferences: {
    language: 'fr' | 'en';
    notifications: {
      sms: boolean;
      email: boolean;
      push: boolean;
    };
    privacy: {
      showProfile: boolean;
      showMedicalInfo: boolean;
      shareLocation: boolean;
    };
  };
  
  // Statut
  status: {
    isVerified: boolean;
    verificationCode?: string;
    verificationExpires?: Date;
    accountStatus: 'active' | 'suspended' | 'blocked';
    subscription: 'free' | 'premium' | 'vip';
  };
  
  // Métadonnées
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastMedicalUpdate: Date;
    totalConsultations: number;
    totalPrescriptions: number;
  };

}