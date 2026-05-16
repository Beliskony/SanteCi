import { Doctor } from '../models/medcin.model';
import { QueryFilter, Types } from 'mongoose';
import { IDoctor } from '../interfaces/medecin.interface';
import { cloudinaryService } from './cloudinary.service';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UpdateProfileDTO {
  firstName?: string;
  lastName?: string;
  title?: 'Dr' | 'Pr' | 'Médecin' | 'Spécialiste';
  specialty?: string;
  city?: string;
  phone?: string;
}

interface UpdateTelemedicineDTO {
  isAvailable?: boolean;
  consultationTypes?: Array<'video' | 'audio' | 'chat'>;
  consultationFees?: {
    video?: number;
    audio?: number;
    chat?: number;
  };
  availability?: Array<{
    day: string;
    slots: Array<{ start: string; end: string; isBooked?: boolean }>;
  }>;
}

interface AddCertificationDTO {
  name: string;
  year: number;
  issuer: string;
}

interface DoctorFilters {
  specialty?: string;
  city?: string;
  isAvailable?: boolean;
  consultationType?: 'video' | 'audio' | 'chat';
  minRating?: number;
  page?: number;
  limit?: number;
}

// ─── Doctor Service ──────────────────────────────────────────────────────────

class DoctorService {

  // ── Get profile ────────────────────────────────────────────────────────────

  async getProfile(doctorId: string): Promise<IDoctor> {
    const doctor = await Doctor.findById(doctorId)
      .select('-security.password')
      .populate('affiliations', 'name location.city');

    if (!doctor) throw new Error('Médecin introuvable.');
    return doctor;
  }

  // ── Get doctor by _id (public) ───────────────────────────────────────

  async getDoctorPublicProfile(id: string): Promise<Partial<IDoctor>> {
    const doctor = await Doctor.findById(id)
      .select('doctorId profile professional.certifications contact.phone contact.email telemedicine location status.isVerified status.isOnline analytics.patientSatisfaction analytics.totalConsultations')
      .lean();

    if (!doctor) throw new Error('Médecin introuvable.');
    return doctor;
  }

  // ── Update profile ─────────────────────────────────────────────────────────

  async updateProfile(doctorId: string, dto: UpdateProfileDTO): Promise<IDoctor> {
    const updateFields: Record<string, unknown> = {};

    if (dto.firstName) updateFields['profile.firstName'] = dto.firstName;
    if (dto.lastName) updateFields['profile.lastName'] = dto.lastName;
    if (dto.title) updateFields['profile.title'] = dto.title;
    if (dto.specialty) updateFields['profile.specialty'] = dto.specialty;
    if (dto.city) updateFields['location.city'] = dto.city;
    if (dto.phone) {
      const exists = await Doctor.findOne({ 'contact.phone': dto.phone });
      if (exists && String(exists._id) !== doctorId) {
        throw new Error('Ce numéro est déjà utilisé par un autre compte.');
      }
      updateFields['contact.phone'] = dto.phone;
      updateFields['contact.phoneVerified'] = false;
    }

    const updated = await Doctor.findByIdAndUpdate(
      doctorId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-security.password');

    if (!updated) throw new Error('Médecin introuvable.');
    return updated;
  }

 // ── Update photo ───────────────────────────────────────────────────────────
async updatePhoto(doctorId: string, buffer: Buffer): Promise<{ photoUrl: string }> {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw new Error('Médecin introuvable.');
  
  const { url } = await cloudinaryService.uploadProfilePhoto(buffer, doctorId, 'doctor');
  
  // Mise à jour
  await Doctor.updateOne(
    { _id: doctorId },
    { $set: { 'profile.photo': url } }
  );
  
  // Vérification en forçant la sélection du champ
  const updatedDoctor = await Doctor.findById(doctorId).select('+profile.photo');
  console.log('Photo en DB après update:', updatedDoctor?.profile?.photo);
  
  // Si toujours undefined, essayez ceci :
  const rawDoc = await Doctor.findById(doctorId).lean();
  console.log('Document brut:', rawDoc?.profile);
  
  return { photoUrl: url };
}

  // ── Update telemedicine settings ───────────────────────────────────────────

  async updateTelemedicine(doctorId: string, dto: UpdateTelemedicineDTO): Promise<IDoctor> {
    const updateFields: Record<string, unknown> = {};

    if (dto.isAvailable !== undefined) updateFields['telemedicine.isAvailable'] = dto.isAvailable;
    if (dto.consultationTypes) updateFields['telemedicine.consultationTypes'] = dto.consultationTypes;
    if (dto.consultationFees) {
      if (dto.consultationFees.video !== undefined) updateFields['telemedicine.consultationFees.video'] = dto.consultationFees.video;
      if (dto.consultationFees.audio !== undefined) updateFields['telemedicine.consultationFees.audio'] = dto.consultationFees.audio;
      if (dto.consultationFees.chat !== undefined) updateFields['telemedicine.consultationFees.chat'] = dto.consultationFees.chat;
    }
    if (dto.availability) updateFields['telemedicine.availability'] = dto.availability;

    const updated = await Doctor.findByIdAndUpdate(
      doctorId,
      { $set: updateFields },
      { new: true }
    ).select('-security.password');

    if (!updated) throw new Error('Médecin introuvable.');
    return updated;
  }

  // ── Add certification ──────────────────────────────────────────────────────

  async addCertification(doctorId: string, dto: AddCertificationDTO): Promise<IDoctor> {
    const updated = await Doctor.findByIdAndUpdate(
      doctorId,
      { $push: { 'professional.certifications': dto } },
      { new: true }
    ).select('-security.password');

    if (!updated) throw new Error('Médecin introuvable.');
    return updated;
  }

  // ── Remove certification ───────────────────────────────────────────────────

  async removeCertification(doctorId: string, certificationId: string): Promise<IDoctor> {
    const updated = await Doctor.findByIdAndUpdate(
      doctorId,
      { $pull: { 'professional.certifications': { _id: new Types.ObjectId(certificationId) } } },
      { new: true }
    ).select('-security.password');

    if (!updated) throw new Error('Médecin introuvable.');
    return updated;
  }

  // ── Search doctors (public) ────────────────────────────────────────────────

  async searchDoctors(filters: DoctorFilters): Promise<{
    doctors: Partial<IDoctor>[];
    total: number;
    page: number;
    pages: number;
  }> {
    const { specialty, city, isAvailable, consultationType, minRating, page = 1, limit = 10 } = filters;

    const query: QueryFilter<IDoctor> = {
      'status.accountStatus': 'active',
      'status.isVerified': true,
    };

    if (specialty) query['profile.specialty'] = { $regex: specialty, $options: 'i' };
    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (isAvailable !== undefined) query['telemedicine.isAvailable'] = isAvailable;
    if (consultationType) query['telemedicine.consultationTypes'] = consultationType;
    if (minRating) query['telemedicine.rating'] = { $gte: minRating };

    const skip = (page - 1) * limit;
    const total = await Doctor.countDocuments(query);

    const doctors = await Doctor.find(query)
      .select('doctorId profile telemedicine location status.isOnline status.isVerified analytics.patientSatisfaction analytics.totalConsultations')
      .sort({ 'telemedicine.rating': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      doctors,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ── Toggle online status ───────────────────────────────────────────────────

  async toggleOnlineStatus(doctorId: string, isOnline: boolean): Promise<{ message: string }> {
    await Doctor.findByIdAndUpdate(doctorId, {
      'status.isOnline': isOnline,
      'status.lastActive': new Date(),
    });
    return { message: `Statut mis à jour : ${isOnline ? 'En ligne' : 'Hors ligne'}` };
  }

  // ── Get availability for a specific day ───────────────────────────────────

  async getAvailability(doctorId: string): Promise<unknown> {
    const doctor = await Doctor.findById(doctorId)
      .select('telemedicine.availability telemedicine.consultationTypes telemedicine.isAvailable')
      .lean();

    if (!doctor) throw new Error('Médecin introuvable.');
    return doctor;
  }

  // ── Update slot booked status ──────────────────────────────────────────────

  async updateSlotStatus(
    doctorId: string,
    day: string,
    slotStart: string,
    isBooked: boolean
  ): Promise<{ message: string }> {
    await Doctor.findOneAndUpdate(
      {
        _id: new Types.ObjectId(doctorId),
        'telemedicine.availability.day': day,
        'telemedicine.availability.slots.start': slotStart,
      },
      {
        $set: { 'telemedicine.availability.$[d].slots.$[s].isBooked': isBooked },
      },
      {
        arrayFilters: [{ 'd.day': day }, { 's.start': slotStart }],
      }
    );

    return { message: `Créneau ${isBooked ? 'réservé' : 'libéré'} avec succès.` };
  }

  // ── Update analytics after consultation ────────────────────────────────────

  async incrementConsultationStats(
    doctorId: string,
    earnings: number,
    satisfaction?: number
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      $inc: {
        'analytics.totalConsultations': 1,
        'analytics.monthlyEarnings': earnings,
        'telemedicine.totalConsultations': 1,
      },
    };

    if (satisfaction !== undefined) {
      // Calcul moyenne glissante de satisfaction
      const doctor = await Doctor.findById(doctorId).select('analytics.patientSatisfaction analytics.totalConsultations');
      if (doctor) {
        const total = doctor.analytics.totalConsultations + 1;
        const currentAvg = doctor.analytics.patientSatisfaction || 0;
        const newAvg = (currentAvg * (total - 1) + satisfaction) / total;
        (updateData as { $set?: Record<string, unknown> }).$set = { 'analytics.patientSatisfaction': newAvg };
      }
    }

    await Doctor.findByIdAndUpdate(doctorId, updateData);
  }

  // ── Delete account ─────────────────────────────────────────────────────────

  async deleteAccount(doctorId: string): Promise<{ message: string }> {
    await Doctor.findByIdAndUpdate(doctorId, {
      'status.accountStatus': 'suspended',
      'status.isOnline': false,
      'telemedicine.isAvailable': false,
    });

    return { message: 'Compte désactivé. Contactez le support pour une suppression définitive.' };
  }
}

export const doctorService = new DoctorService();