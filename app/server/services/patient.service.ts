import { Patient } from '../models/patient.model';
import { QueryFilter, Types } from 'mongoose';
import { IPatient } from '../interfaces/patient.interface';
import { cloudinaryService } from './cloudinary.service';

// ─── Types ──────────────────────────────────────────────────────────────────

interface UpdateProfileDTO {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  city?: string;
  district?: string;
  address?: string;
  coordinates?: { latitude: number; longitude: number };
}

interface UpdateHealthDTO {
  allergies?: string[];
  chronicDiseases?: string[];
  currentMedications?: string[];
  disabilities?: string[];
  height?: number;
  weight?: number;
}

interface EmergencyContactDTO {
  name: string;
  phone: string;
  relationship: string;
}

interface UpdatePreferencesDTO {
  language?: 'fr' | 'en';
  notifications?: {
    sms?: boolean;
    email?: boolean;
    push?: boolean;
  };
  privacy?: {
    showProfile?: boolean;
    showMedicalInfo?: boolean;
    shareLocation?: boolean;
  };
}

interface PatientFilters {
  city?: string;
  bloodGroup?: string;
  accountStatus?: string;
  page?: number;
  limit?: number;
}

// ─── Patient Service ─────────────────────────────────────────────────────────

class PatientService {

  // ── Get profile ────────────────────────────────────────────────────────────

  async getProfile(patientId: string): Promise<IPatient> {
    const patient = await Patient.findById(patientId)
      .select('-security.password -security.pinCode');

    if (!patient) throw new Error('Patient introuvable.');
    return patient;
  }

  // ── Get patient by patientId (pour médecin) ────────────────────────────────

  async getPatientForDoctor(patientId: string): Promise<Partial<IPatient>> {
    const patient = await Patient.findOne({ patientId })
      .select('profile contact.phone contact.email health location status.isVerified metadata.totalConsultations')
      .lean();

    if (!patient) throw new Error('Patient introuvable.');
    return patient;
  }

  // ── Update profile ─────────────────────────────────────────────────────────

  async updateProfile(patientId: string, dto: UpdateProfileDTO): Promise<IPatient> {
    const updateFields: Record<string, unknown> = {};

    if (dto.firstName) updateFields['profile.firstName'] = dto.firstName;
    if (dto.lastName) updateFields['profile.lastName'] = dto.lastName;
    if (dto.dateOfBirth) updateFields['profile.dateOfBirth'] = dto.dateOfBirth;
    if (dto.gender) updateFields['profile.gender'] = dto.gender;
    if (dto.bloodGroup) updateFields['profile.bloodGroup'] = dto.bloodGroup;
    if (dto.city) updateFields['location.city'] = dto.city;
    if (dto.district) updateFields['location.district'] = dto.district;
    if (dto.address) updateFields['location.address'] = dto.address;
    if (dto.coordinates) updateFields['location.coordinates'] = dto.coordinates;

    updateFields['metadata.updatedAt'] = new Date();

    const updated = await Patient.findByIdAndUpdate(
      patientId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-security.password -security.pinCode');

    if (!updated) throw new Error('Patient introuvable.');
    return updated;
  }

  // ── Update photo ───────────────────────────────────────────────────────────

  async updatePhoto(patientId: string, buffer: Buffer): Promise<{ message: string }> {
  const { url } = await cloudinaryService.uploadProfilePhoto(buffer, patientId, 'patient');
  await Patient.findByIdAndUpdate(patientId, { 'profile.photo': url });
  return { message: 'Photo de profil mise à jour.' };
}

  // ── Update health info ─────────────────────────────────────────────────────

  async updateHealthInfo(patientId: string, dto: UpdateHealthDTO): Promise<IPatient> {
    const updateFields: Record<string, unknown> = {};

    if (dto.allergies !== undefined) updateFields['health.allergies'] = dto.allergies;
    if (dto.chronicDiseases !== undefined) updateFields['health.chronicDiseases'] = dto.chronicDiseases;
    if (dto.currentMedications !== undefined) updateFields['health.currentMedications'] = dto.currentMedications;
    if (dto.disabilities !== undefined) updateFields['health.disabilities'] = dto.disabilities;
    if (dto.height !== undefined) {
      updateFields['health.height'] = dto.height;
    }
    if (dto.weight !== undefined) {
      updateFields['health.weight'] = dto.weight;
    }

    // Calcul BMI automatique si height et weight disponibles
    const patient = await Patient.findById(patientId).select('health.height health.weight');
    if (patient) {
      const height = dto.height ?? patient.health?.height;
      const weight = dto.weight ?? patient.health?.weight;
      if (height && weight) {
        const heightInMeters = height / 100;
        updateFields['health.bmi'] = parseFloat((weight / (heightInMeters ** 2)).toFixed(2));
      }
    }

    updateFields['metadata.lastMedicalUpdate'] = new Date();

    const updated = await Patient.findByIdAndUpdate(
      patientId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-security.password -security.pinCode');

    if (!updated) throw new Error('Patient introuvable.');
    return updated;
  }

  // ── Add emergency contact ──────────────────────────────────────────────────

  async addEmergencyContact(patientId: string, dto: EmergencyContactDTO): Promise<IPatient> {
    const patient = await Patient.findById(patientId);
    if (!patient) throw new Error('Patient introuvable.');

    if (patient.contact.emergencyContacts.length >= 3) {
      throw new Error('Maximum 3 contacts d\'urgence autorisés.');
    }

    const updated = await Patient.findByIdAndUpdate(
      patientId,
      { $push: { 'contact.emergencyContacts': dto } },
      { new: true }
    ).select('-security.password -security.pinCode');

    return updated!;
  }

  // ── Remove emergency contact ───────────────────────────────────────────────

  async removeEmergencyContact(patientId: string, contactId: string): Promise<IPatient> {
    const updated = await Patient.findByIdAndUpdate(
      patientId,
      { $pull: { 'contact.emergencyContacts': { _id: new Types.ObjectId(contactId) } } },
      { new: true }
    ).select('-security.password -security.pinCode');

    if (!updated) throw new Error('Patient introuvable.');
    return updated;
  }

  // ── Update preferences ─────────────────────────────────────────────────────

  async updatePreferences(patientId: string, dto: UpdatePreferencesDTO): Promise<IPatient> {
    const updateFields: Record<string, unknown> = {};

    if (dto.language) updateFields['preferences.language'] = dto.language;
    if (dto.notifications) {
      if (dto.notifications.sms !== undefined) updateFields['preferences.notifications.sms'] = dto.notifications.sms;
      if (dto.notifications.email !== undefined) updateFields['preferences.notifications.email'] = dto.notifications.email;
      if (dto.notifications.push !== undefined) updateFields['preferences.notifications.push'] = dto.notifications.push;
    }
    if (dto.privacy) {
      if (dto.privacy.showProfile !== undefined) updateFields['preferences.privacy.showProfile'] = dto.privacy.showProfile;
      if (dto.privacy.showMedicalInfo !== undefined) updateFields['preferences.privacy.showMedicalInfo'] = dto.privacy.showMedicalInfo;
      if (dto.privacy.shareLocation !== undefined) updateFields['preferences.privacy.shareLocation'] = dto.privacy.shareLocation;
    }

    const updated = await Patient.findByIdAndUpdate(
      patientId,
      { $set: updateFields },
      { new: true }
    ).select('-security.password -security.pinCode');

    if (!updated) throw new Error('Patient introuvable.');
    return updated;
  }

  // ── Set PIN code ───────────────────────────────────────────────────────────

  async setPinCode(patientId: string, pin: string): Promise<{ message: string }> {
    if (!/^\d{4,6}$/.test(pin)) throw new Error('Le code PIN doit contenir 4 à 6 chiffres.');

    const bcrypt = await import('bcrypt');
    const hashedPin = await bcrypt.hash(pin, 10);

    await Patient.findByIdAndUpdate(patientId, { 'security.pinCode': hashedPin });
    return { message: 'Code PIN défini avec succès.' };
  }

  // ── Verify PIN code ────────────────────────────────────────────────────────

  async verifyPinCode(patientId: string, pin: string): Promise<{ valid: boolean }> {
    const patient = await Patient.findById(patientId).select('security.pinCode');
    if (!patient?.security.pinCode) throw new Error('Aucun code PIN défini.');

    const bcrypt = await import('bcrypt');
    const isValid = await bcrypt.compare(pin, patient.security.pinCode);
    return { valid: isValid };
  }

  // ── Increment consultation count ───────────────────────────────────────────

  async incrementConsultationCount(patientId: string): Promise<void> {
    await Patient.findByIdAndUpdate(patientId, {
      $inc: { 'metadata.totalConsultations': 1 },
    });
  }

  // ── Increment prescription count ───────────────────────────────────────────

  async incrementPrescriptionCount(patientId: string): Promise<void> {
    await Patient.findByIdAndUpdate(patientId, {
      $inc: { 'metadata.totalPrescriptions': 1 },
    });
  }

  // ── Search patients (admin / doctor) ──────────────────────────────────────

  async searchPatients(filters: PatientFilters): Promise<{
    patients: Partial<IPatient>[];
    total: number;
    page: number;
    pages: number;
  }> {
    const { city, bloodGroup, accountStatus, page = 1, limit = 10 } = filters;

    const query: QueryFilter<IPatient> = {};

    if (city) query['location.city'] = { $regex: city, $options: 'i' };
    if (bloodGroup) query['profile.bloodGroup'] = bloodGroup;
    if (accountStatus) query['status.accountStatus'] = accountStatus;

    const skip = (page - 1) * limit;
    const total = await Patient.countDocuments(query);

    const patients = await Patient.find(query)
      .select('profile contact.phone contact.email location status metadata')
      .sort({ 'metadata.createdAt': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      patients,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ── Update account status (admin) ─────────────────────────────────────────

  async updateAccountStatus(
    patientId: string,
    status: 'active' | 'suspended' | 'blocked'
  ): Promise<{ message: string }> {
    await Patient.findByIdAndUpdate(patientId, { 'status.accountStatus': status });
    return { message: `Statut du compte mis à jour : ${status}` };
  }

  // ── Delete account (soft delete) ──────────────────────────────────────────

  async deleteAccount(patientId: string): Promise<{ message: string }> {
    await Patient.findByIdAndUpdate(patientId, {
      'status.accountStatus': 'suspended',
      'security.isActive': false,
    });

    return { message: 'Compte désactivé. Contactez le support pour une suppression définitive.' };
  }

  // ── Get patient stats ──────────────────────────────────────────────────────

  async getStats(patientId: string): Promise<{
    totalConsultations: number;
    totalPrescriptions: number;
    lastMedicalUpdate: Date | null;
    bmi: number | null;
  }> {
    const patient = await Patient.findById(patientId)
      .select('metadata.totalConsultations metadata.totalPrescriptions metadata.lastMedicalUpdate health.bmi')
      .lean();

    if (!patient) throw new Error('Patient introuvable.');

    return {
      totalConsultations: patient.metadata?.totalConsultations ?? 0,
      totalPrescriptions: patient.metadata?.totalPrescriptions ?? 0,
      lastMedicalUpdate: patient.metadata?.lastMedicalUpdate ?? null,
      bmi: patient.health?.bmi ?? null,
    };
  }
}

export const patientService = new PatientService();