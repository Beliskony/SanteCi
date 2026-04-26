import { Document, Types } from 'mongoose';

export interface IAppointment extends Document {
  _id: Types.ObjectId;
  appointmentId: string;
  
  // Références
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  
  // Détails du rendez-vous
  details: {
    type: 'video' | 'audio' | 'chat' | 'in_person';
    scheduledFor: Date;
    duration: number; // en minutes
    reason: string;
    symptoms?: string[];
    priority: 'low' | 'medium' | 'high' | 'emergency';
  };
  
  // Statut
  status: {
    current: 'pending' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled' | 'no_show';
    paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
    cancellationReason?: string;
    cancelledBy?: 'patient' | 'doctor' | 'system';
  };
  
  // Consultation
  consultation: {
    startedAt?: Date;
    endedAt?: Date;
    actualDuration?: number;
    notes?: string;
    diagnosis?: string;
    recommendations?: string[];
    prescriptionId?: Types.ObjectId;
    followUpDate?: Date;
  };
  
  // Paiement
  payment: {
    amount: number;
    currency: 'XOF' | 'EUR' | 'USD';
    method: 'mobile_money' | 'card' | 'wallet' | 'Assurance';
    provider?: 'orange_money' | 'mtn_money' | 'wave';
    transactionId?: string;
    paidAt?: Date;
  };
  
  // Communication
  communication: {
    chatRoomId: string;
    videoRoomId?: string;
    recordings?: string[]; // URLs des enregistrements
    sharedDocuments?: Array<{
      name: string;
      url: string;
      uploadedBy: 'patient' | 'doctor';
    }>;
  };
  
  // Notifications
  notifications: {
    remindersSent: number;
    lastReminderSent?: Date;
    patientJoinedAt?: Date;
    doctorJoinedAt?: Date;
  };
  
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    bookedBy: 'patient' | 'assistant' | 'system';
  };
}
