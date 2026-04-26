import { Document, Types } from 'mongoose';

export interface IMedicalRecord extends Document {
  _id: Types.ObjectId;
  recordId: string;
  
  // Références
  patientId: Types.ObjectId;
  createdBy: Types.ObjectId; // Doctor or System
  
  // Classification
  category: 'consultation' | 'lab_result' | 'imaging' | 'vaccination' | 
            'surgery' | 'allergy' | 'chronic_condition' | 'prescription';
  
  // Données
  title: string;
  date: Date;
  description: string;
  
  // Données spécifiques
  data: {
    // Pour les consultations
    consultation?: {
      symptoms: string[];
      diagnosis: string;
      treatment: string;
      notes: string;
    };
    
    // Pour les résultats de labo
    labResult?: {
      testName: string;
      results: Record<string, any>;
      normalRange: Record<string, any>;
      interpretation: string;
      laboratory: string;
    };
    
    // Pour les vaccinations
    vaccination?: {
      vaccineName: string;
      dose: string;
      manufacturer: string;
      batchNumber: string;
      nextDoseDate?: Date;
    };
  };
  
  // Fichiers joints
  attachments?: Array<{
    name: string;
    url: string;
    type: 'image' | 'pdf' | 'document';
    uploadedAt: Date;
  }>;
  
  // Confidentialité
  privacy: {
    accessLevel: 'patient_only' | 'shared_doctors' | 'all_medical_staff';
    sharedWith: Types.ObjectId[]; // IDs des médecins autorisés
  };
  
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    verifiedBy?: Types.ObjectId;
  };
}