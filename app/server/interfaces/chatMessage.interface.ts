import  { Document, Types } from 'mongoose';

export interface IChatMessage extends Document {
  _id: Types.ObjectId;
  
  // Références
  senderId: Types.ObjectId; // Patient ou Docteur
  receiverId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  chatRoomId: string;
  
  // Message
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'prescription';
  content: string;
  
  // Pour les fichiers
  file?: {
    url: string;
    name: string;
    size: number;
    type: string;
  };
  
  // Statut
  status: {
    delivered: boolean;
    deliveredAt?: Date;
    read: boolean;
    readAt?: Date;
  };
  
  // Métadonnées
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    deletedFor?: Types.ObjectId[]; // Pour qui le message est supprimé
  };
}