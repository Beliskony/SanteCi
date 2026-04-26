import mongoose, { Schema } from 'mongoose';
import { IMedicalRecord } from '../interfaces/medecinRecord.interface';

const MedicalRecordSchema: Schema = new Schema({
  recordId: { type: String, required: true, unique: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  category: { type: String, required: true },
  title: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String },
  data: { type: Schema.Types.Mixed, required: true },
  attachments: [
    {
      name: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String, required: true },
      uploadedAt: { type: Date, required: true }
    }
  ],
  privacy: {
    accessLevel: { type: String, required: true },
    sharedWith: [{ type: Schema.Types.ObjectId, ref: 'Doctor' }]
  },
  metadata: {
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'Doctor' }
  }
});

export const MedicalRecord = mongoose.model<IMedicalRecord>('MedicalRecord', MedicalRecordSchema);