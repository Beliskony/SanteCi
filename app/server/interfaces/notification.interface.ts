import { Document, Types } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  
  // Destinataire
  userId: Types.ObjectId;
  userType: 'patient' | 'doctor';
  
  // Notification
  type: 'appointment' | 'prescription' | 'message' | 'reminder' | 
        'payment' | 'system' | 'emergency';
  title: string;
  body: string;
  
  // Données associées
  data?: {
    appointmentId?: Types.ObjectId;
    prescriptionId?: Types.ObjectId;
    doctorId?: Types.ObjectId;
    patientId?: Types.ObjectId;
    url?: string;
  };
  
  // Livraison
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  
  statut: {
    sent: boolean;
    sentAt?: Date;
    delivered: boolean;
    deliveredAt?: Date;
    read: boolean;
    readAt?: Date;
  };
  
  metadata: {
    createdAt: Date;
    expiresAt?: Date;
    priority: 'low' | 'normal' | 'high';
  };
}
