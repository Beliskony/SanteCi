import { Document, Types } from 'mongoose';

export interface IDoctor extends Document {
  _id: Types.ObjectId;
  doctorId: string;
  
  // Profil professionnel
  profile: {
    firstName: string;
    lastName: string;
    title: 'Dr' | 'Pr' | 'Médecin' | 'Spécialiste';
    specialty: 'Cardiologie' | 'Pédiatrie' | 'Généraliste' | 'Dermatologie' | 'Psychiatrie' | 'Gynécologie' | 'autres...';
    photo: string;
    bio: string;
    languages: 'fr'| 'en'; 
    yearsOfExperience: number;
  };
  
  // Informations professionnelles
  professional: {
    licenseNumber: string;
    licenseExpiry: Date;
    university: string;
    graduationYear: number;
    certifications: Array<{
      name: string;
      year: number;
      issuer: string;
    }>;
  };
  
  // Contact
  contact: {
    phone: string;
    phoneVerified: boolean;
    email: string;
    emailVerified: boolean;
    emergencyContact?: string;
  };
  
  // Télémédecine
  telemedicine: {
    isAvailable: boolean;
    consultationTypes: Array<'video' | 'audio' | 'chat'>;
    consultationFees: {
      video: number;
      audio: number;
      chat: number;
    };
    availability: Array<{
      day: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
      slots: Array<{
        start: string; // "09:00"
        end: string;   // "10:00"
        isBooked: boolean;
      }>;
    }>;
    averageResponseTime: number; // en minutes
    rating: number;
    totalConsultations: number;
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
    consultationRadius?: number; // Rayon en km pour les visites à domicile
  };
  
  // Affiliations
  affiliations: {
    hospitals: Types.ObjectId[];
    clinics: Types.ObjectId[];
    insuranceCompanies: string[];
  };
  
  // Statut
  status: {
    isVerified: boolean;
    isOnline: boolean;
    lastActive: Date;
    accountStatus: 'active' | 'pending' | 'suspended' | 'blocked';
    subscription: 'free' | 'premium' | 'elite';
    subscriptionExpiry?: Date;
  };
  
  // Analytics
  analytics: {
    totalPatients: number;
    totalConsultations: number;
    monthlyEarnings: number;
    patientSatisfaction: number;
    cancellationRate: number;
  };
  
  // Sécurité
  security: {
    password: string;
    isMedcin: boolean;
    username?: string; // Optionnel
    twoFactorEnabled: boolean;
    devices: Array<{
      deviceId: string;
      platform: 'ios' | 'android' | 'web';
      lastActive: Date;
    }>;
  };
  
  metadata: {
    createdAt: Date;
    updatedAt: Date;
  };
}