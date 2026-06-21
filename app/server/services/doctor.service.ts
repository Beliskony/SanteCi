import { Doctor } from '../models/medcin.model';
import { QueryFilter, Types } from 'mongoose';
import crypto from 'crypto';
import { IDoctor } from '../interfaces/medecin.interface';
import { Prescription } from '../models/prescription.model';
import { IPrescription } from '../interfaces/prescription.interface';
import { Appointment } from '../models/appointement.model';
import { Patient } from '../models/patient.model';
import { cloudinaryService } from './cloudinary.service';
import { CreatePrescriptionDTO, UpdatePrescriptionDTO } from '../schemas/prescription.schema';

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
  documentUrl?: string;
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


  // ── Get my patients — annuaire patient du médecin connecté ────────────────

  async getMyPatients(
    doctorId: string,
    filters: { query?: string; page?: number; limit?: number } = {}
  ): Promise<{
    patients: Array<{
      _id: string;
      profile: { firstName: string; lastName: string; photo?: string; dateOfBirth: Date; bloodGroup?: string };
      mainCondition: string;
      followUpStatus: 'priority' | 'followed' | 'recent' | null;
      nextAppointment: { date: Date; label: string } | null;
      patientSince: Date;
      totalConsultations: number;
    }>;
    total: number;
    page: number;
    pages: number;
  }> {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const patientIds = await Appointment.distinct('patientId', {
      doctorId: new Types.ObjectId(doctorId),
    });

    if (patientIds.length === 0) {
      return { patients: [], total: 0, page, pages: 0 };
    }

    const query: Record<string, unknown> = { _id: { $in: patientIds } };
    if (filters.query) {
      query.$or = [
        { 'profile.firstName': { $regex: filters.query, $options: 'i' } },
        { 'profile.lastName':  { $regex: filters.query, $options: 'i' } },
        { 'contact.phone':     { $regex: filters.query, $options: 'i' } },
        { 'health.chronicDiseases': { $regex: filters.query, $options: 'i' } },
      ];
    }

    const total = await Patient.countDocuments(query);

    const patientsRaw = await Patient.find(query)
      .select('profile contact.phone health.chronicDiseases metadata')
      .skip(skip)
      .limit(limit)
      .lean();

    const enriched = await Promise.all(
      patientsRaw.map(async (p) => {
        const apptsWithDoctor = await Appointment.find({
          doctorId: new Types.ObjectId(doctorId),
          patientId: p._id,
        })
          .select('details.scheduledFor status.current')
          .sort({ 'details.scheduledFor': -1 })
          .lean();

        const now = new Date();
        const upcoming = apptsWithDoctor
          .filter((a) => new Date(a.details.scheduledFor) >= now && a.status.current !== 'cancelled')
          .sort((a, b) => new Date(a.details.scheduledFor).getTime() - new Date(b.details.scheduledFor).getTime())[0];

        const completedCount = apptsWithDoctor.filter((a) => a.status.current === 'completed').length;

        let followUpStatus: 'priority' | 'followed' | 'recent' | null = null;
        if (upcoming) {
          const hoursUntil = (new Date(upcoming.details.scheduledFor).getTime() - now.getTime()) / 3600000;
          if (hoursUntil <= 48) followUpStatus = 'priority';
        }
        if (!followUpStatus) {
          followUpStatus = completedCount >= 2 ? 'followed' : completedCount === 0 ? 'recent' : null;
        }

        const mainCondition = p.health?.chronicDiseases?.[0] ?? 'Suivi général';

        let nextAppointmentLabel: string | null = null;
        if (upcoming) {
          const dt = new Date(upcoming.details.scheduledFor);
          const isToday = dt.toDateString() === now.toDateString();
          const tomorrow = new Date(now);
          tomorrow.setDate(now.getDate() + 1);
          const isTomorrow = dt.toDateString() === tomorrow.toDateString();
          const time = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

          nextAppointmentLabel = isToday
            ? `Aujourd'hui ${time}`
            : isTomorrow
            ? `Demain ${time}`
            : dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ` ${time}`;
        }

        return {
          _id: String(p._id),
          profile: {
            firstName:   p.profile.firstName,
            lastName:    p.profile.lastName,
            photo:       p.profile.photo,
            dateOfBirth: p.profile.dateOfBirth,
            bloodGroup:  p.profile.bloodGroup,
          },
          mainCondition,
          followUpStatus,
          nextAppointment: upcoming
            ? { date: upcoming.details.scheduledFor, label: nextAppointmentLabel! }
            : null,
          patientSince: p.metadata?.createdAt,
          totalConsultations: completedCount,
        };
      })
    );

    return {
      patients: enriched,
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


  // ── Create prescription ────────────────────────────────────────────────────────

async createPrescription(
  doctorId: string,
  dto: CreatePrescriptionDTO
): Promise<IPrescription> {

  // Vérifier que le médecin existe
  const doctor = await Doctor.findById(doctorId).select('status.accountStatus profile.firstName profile.lastName');
  if (!doctor) throw new Error('Médecin introuvable.');
  if (doctor.status.accountStatus !== 'active') throw new Error('Compte médecin inactif.');

  // Vérifier que le patient existe
  const patient = await Patient.findById(dto.patientId).select('status.accountStatus');
  if (!patient) throw new Error('Patient introuvable.');
  if (patient.status.accountStatus !== 'active') throw new Error('Compte patient inactif.');

  const prescriptionId = `PRX-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

  const prescription = await Prescription.create({
    prescriptionId,
    doctorId:      new Types.ObjectId(doctorId),
    patientId:     new Types.ObjectId(dto.patientId),
    appointmentId: dto.appointmentId ? new Types.ObjectId(dto.appointmentId) : undefined,
    date:          new Date(),
    validityDays:  dto.validityDays ?? 90,
    diagnosis:     dto.diagnosis,
    medications:   dto.medications,
    testsRequested: dto.testsRequested ?? [],
    notes:         dto.notes,
    refillsAllowed: dto.refillsAllowed ?? 0,
    refillsUsed:   0,
    followUp:      dto.followUp ?? { required: false },
    sharing: {
      sharedWithPharmacies: [],
      patientAcknowledged:  false,
    },
    metadata: {
      createdAt:   new Date(),
      updatedAt:   new Date(),
      generatedBy: 'doctor',
    },
  });

  // Pousser la référence dans le dossier patient
  await Patient.findByIdAndUpdate(dto.patientId, {
    $push: {
      prescriptions: {
        prescriptionId: prescription._id,
        doctorId:       new Types.ObjectId(doctorId),
        appointmentId:  dto.appointmentId ? new Types.ObjectId(dto.appointmentId) : undefined,
        issuedAt:       new Date(),
        expiresAt:      dto.validityDays
          ? new Date(Date.now() + dto.validityDays * 86400000)
          : undefined,
      },
    },
    $inc: { 'metadata.totalPrescriptions': 1 },
  });

  return prescription;
}

// ── Update prescription ────────────────────────────────────────────────────────

async updatePrescription(
  prescriptionId: string,
  doctorId: string,
  dto: UpdatePrescriptionDTO
): Promise<IPrescription> {

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) throw new Error('Ordonnance introuvable.');

  // Seul le médecin auteur peut modifier
  if (String(prescription.doctorId) !== doctorId) {
    throw new Error('Action non autorisée.');
  }

  // Une ordonnance annulée ou complétée ne peut plus être modifiée
  if (['cancelled', 'completed'].includes(prescription.status)) {
    throw new Error(`Impossible de modifier une ordonnance au statut "${prescription.status}".`);
  }

  const updateFields: Record<string, unknown> = {
    'metadata.updatedAt': new Date(),
  };

  if (dto.notes         !== undefined) updateFields['notes']          = dto.notes;
  if (dto.validityDays  !== undefined) updateFields['validityDays']   = dto.validityDays;
  if (dto.refillsAllowed !== undefined) updateFields['refillsAllowed'] = dto.refillsAllowed;
  if (dto.status        !== undefined) updateFields['status']         = dto.status;
  if (dto.followUp) {
    if (dto.followUp.required !== undefined) updateFields['followUp.required'] = dto.followUp.required;
    if (dto.followUp.date     !== undefined) updateFields['followUp.date']     = dto.followUp.date;
    if (dto.followUp.notes    !== undefined) updateFields['followUp.notes']    = dto.followUp.notes;
  }

  // Recalculer expiresAt si validityDays change
  if (dto.validityDays !== undefined) {
    const expiry = new Date(prescription.date);
    expiry.setDate(expiry.getDate() + dto.validityDays);
    updateFields['status'] = expiry < new Date() ? 'expired' : (dto.status ?? prescription.status);

    // Mettre à jour aussi la référence dans le patient
    await Patient.findOneAndUpdate(
      {
        _id: prescription.patientId,
        'prescriptions.prescriptionId': prescription._id,
      },
      {
        $set: { 'prescriptions.$.expiresAt': expiry },
      }
    );
  }

  const updated = await Prescription.findByIdAndUpdate(
    prescriptionId,
    { $set: updateFields },
    { new: true }
  )
    .populate('doctorId',     'profile.firstName profile.lastName profile.title profile.specialty')
    .populate('appointmentId','details.scheduledFor details.type details.reason');

  return updated!;
}

// ── Delete prescription ────────────────────────────────────────────────────────

async deletePrescription(
  prescriptionId: string,
  doctorId: string
): Promise<{ message: string }> {

  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) throw new Error('Ordonnance introuvable.');

  // Seul le médecin auteur peut supprimer
  if (String(prescription.doctorId) !== doctorId) {
    throw new Error('Action non autorisée.');
  }

  // Bloquer la suppression si déjà acquittée par le patient
  if (prescription.sharing.patientAcknowledged) {
    throw new Error('Impossible de supprimer une ordonnance déjà reçue par le patient.');
  }

  await Prescription.findByIdAndDelete(prescriptionId);

  // Retirer la référence du dossier patient
  await Patient.findByIdAndUpdate(prescription.patientId, {
    $pull: { prescriptions: { prescriptionId: prescription._id } },
    $inc:  { 'metadata.totalPrescriptions': -1 },
  });

  return { message: 'Ordonnance supprimée.' };
}
}

export const doctorService = new DoctorService();