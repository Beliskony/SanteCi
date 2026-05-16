import mongoose, { Schema } from 'mongoose';
import { IHospitalClinic } from '../interfaces/hopitalClinic.interface';

const HospitalClinicSchema: Schema = new Schema({
  facilityId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  category: { type: String, required: true },

  // Image de couverture (gérée via Cloudinary)
  imageCover: {
    url:      { type: String },
    publicId: { type: String },
  },
  
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    commune: { type: String },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  },
  contact: {
    phoneNumbers: [{ type: String, required: true }],
    email: { type: String, required: true },
    website: { type: String },
    emergencyNumber: { type: String }
  },
  services: [
    {
      name: { type: String, required: true },
      specialty: { type: String },
      available: { type: Boolean, required: true },
      hours: {
        open: { type: String },
        close: { type: String }
      }
    }
  ],
  staff: {
    doctors: [{ type: Schema.Types.ObjectId, ref: 'Doctor' }],
    nurses: { type: Number, required: true },
    administrators: { type: Number, required: true }
  },
  facilities: {
    consultationRooms: { type: Number, required: true },
    emergencyRoom: { type: Boolean, required: true },
    pharmacy: { type: Boolean, required: true },
    laboratory: { type: Boolean, required: true },
    imaging: { type: Boolean, required: true },
    beds: { type: Number, required: true }
  },
  partnerships: {
    insuranceCompanies: [{ type: String }],
    telemedicineEnabled: { type: Boolean, required: true },
    homeVisits: { type: Boolean, required: true }
  },
  hours: {
    weekdays: { open: { type: String, required: true }, close: { type: String, required: true } },
    saturday: { open: { type: String, required: true }, close: { type: String, required: true } },
    sunday: { open: { type: String, required: true }, close: { type: String, required: true } },
    emergency24h: { type: Boolean, required: true }
  },
  certification: {
    licenseNumber: { type: String, required: true },
    accreditation: [{ type: String, required: true }],
    expiryDate: { type: Date, required: true }
  },
  metadata: {
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
    verified: { type: Boolean, required: true, default: false },
    rating: { type: Number, required: true, default: 0 },
    totalReviews: { type: Number, required: true, default: 0 }
  }
});

const HospitalClinic =
  (mongoose.models.HospitalClinic as mongoose.Model<IHospitalClinic>) ||
  mongoose.model<IHospitalClinic>("HospitalClinic", HospitalClinicSchema);

export default HospitalClinic;
