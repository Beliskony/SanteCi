import { Document, Types } from 'mongoose';

export interface IReview extends Document {
  appointmentId: Types.ObjectId;
  doctorId: Types.ObjectId;
  patientId: Types.ObjectId;
  rating: number;
  comment?: string;
  isAnonymous: boolean;
  status: 'published' | 'flagged' | 'hidden';
  metadata: {
    createdAt: Date;
    updatedAt: Date;
  };
}