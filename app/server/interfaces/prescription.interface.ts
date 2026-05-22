import { Document, Types } from 'mongoose';

export interface IMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity: number;
  unit: string;
}

export interface IPrescription extends Document {
  _id: Types.ObjectId;
  prescriptionId: string;
  
  // Références
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  
  // Détails
  date: Date;
  validityDays: number;
  diagnosis: string;
  notes?: string;
  
  // Médicaments
  medications: IMedication[];
  
  // Analyses/Examens demandés
  testsRequested?: Array<{
    type: string;
    instructions?: string;
    laboratory?: string;
  }>;
  
  // Statut
  status: 'active' | 'expired' | 'completed' | 'cancelled';
  isDigital: boolean;
  refillsAllowed: number;
  refillsUsed: number;
  
  // Suivi
  followUp: {
    required: boolean;
    date?: Date;
    notes?: string;
  };
  
  // Partage
  sharing: {
    sharedWithPharmacies: Types.ObjectId[];
    patientAcknowledged: boolean;
    acknowledgedAt?: Date;
  };
  
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    generatedBy: 'doctor' | 'system';
  };
}