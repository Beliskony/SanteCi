import mongoose, { Schema } from 'mongoose';
import { IReview } from '../interfaces/review.interface';

const ReviewSchema: Schema = new Schema({
  // unique: true → un seul avis possible par rendez-vous (empêche les doublons)
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
  doctorId:      { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  patientId:     { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  rating:        { type: Number, required: true, min: 1, max: 5 },
  comment:       { type: String, maxlength: 500 },
  isAnonymous:   { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['published', 'flagged', 'hidden'], // pour modération future si besoin
    default: 'published',
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
});

ReviewSchema.index({ doctorId: 1, status: 1 });
ReviewSchema.index({ patientId: 1 });

export const Review = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);