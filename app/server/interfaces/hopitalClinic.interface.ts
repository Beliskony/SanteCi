import { Document, Types } from 'mongoose';

export interface IHospitalClinic extends Document {
  _id: Types.ObjectId;
  facilityId: string;
  
  // Identification
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'laboratory' | 'imaging_center';
  category: 'public' | 'private' | 'community';
  

   imageCover?: {
    url: string;
    publicId: string;
  };
  
  // Localisation
  location: {
    address: string;
    city: string;
    district: string;
    commune?: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Contact
  contact: {
    phoneNumbers: string[];
    email: string;
    website?: string;
    emergencyNumber?: string;
  };
  
  // Services
  services: Array<{
    name: string;
    specialty?: string;
    available: boolean;
    hours?: {
      open: string;
      close: string;
    };
  }>;
  
  // Personnel
  staff: {
    doctors: Types.ObjectId[];
    nurses: number;
    administrators: number;
  };
  
  // Équipements
  facilities: {
    consultationRooms: number;
    emergencyRoom: boolean;
    pharmacy: boolean;
    laboratory: boolean;
    imaging: boolean;
    beds: number;
  };
  
  // Partenariats
  partnerships: {
    insuranceCompanies: string[];
    telemedicineEnabled: boolean;
    homeVisits: boolean;
  };
  
  // Horaires
  hours: {
    weekdays: { open: string; close: string };
    saturday: { open: string; close: string };
    sunday: { open: string; close: string };
    emergency24h: boolean;
  };
  
  // Certification
  certification: {
    licenseNumber: string;
    accreditation: string[];
    expiryDate: Date;
  };
  
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    verified: boolean;
    rating: number;
    totalReviews: number;
  };
}