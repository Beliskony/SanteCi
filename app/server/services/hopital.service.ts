import crypto from 'crypto';
import { Types, QueryFilter } from 'mongoose';
import { HospitalClinic } from '../models/hopitalClinic.model';
import { IHospitalClinic } from '../interfaces/hopitalClinic.interface';
import {
  TCreateHospitalClinic,
  TUpdateHospitalClinic,
} from '../schemas/HospitalClinic.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HospitalFilters {
  city?: string;
  district?: string;
  type?: string;
  category?: string;
  telemedicineEnabled?: boolean;
  homeVisits?: boolean;
  emergency24h?: boolean;
  specialty?: string;
  page?: number;
  limit?: number;
}

// ─── Hospital/Clinic Service ──────────────────────────────────────────────────

class HospitalClinicService {

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(dto: Omit<TCreateHospitalClinic, 'facilityId'>): Promise<IHospitalClinic> {
    const existing = await HospitalClinic.findOne({
      'certification.licenseNumber': dto.certification.licenseNumber,
    });
    if (existing) throw new Error('Un établissement avec ce numéro de licence existe déjà.');

    const facilityId = `FAC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const facility = await HospitalClinic.create({
      ...dto,
      facilityId,
      metadata: {
        createdAt:    new Date(),
        updatedAt:    new Date(),
        verified:     false,
        rating:       0,
        totalReviews: 0,
      },
    });

    return facility;
  }

  // ── Get by MongoDB _id ─────────────────────────────────────────────────────

  async getById(id: string): Promise<IHospitalClinic> {
    const facility = await HospitalClinic.findById(id)
      .populate('staff.doctors', 'profile.firstName profile.lastName profile.specialty profile.title contact.phone');

    if (!facility) throw new Error('Établissement introuvable.');
    return facility;
  }

  // ── Get by facilityId string ───────────────────────────────────────────────

  async getByFacilityId(facilityId: string): Promise<IHospitalClinic> {
    const facility = await HospitalClinic.findOne({ facilityId })
      .populate('staff.doctors', 'profile.firstName profile.lastName profile.specialty profile.title');

    if (!facility) throw new Error('Établissement introuvable.');
    return facility;
  }

  // ── Search / List ──────────────────────────────────────────────────────────

  async search(filters: HospitalFilters): Promise<{
    facilities: IHospitalClinic[];
    total: number;
    page: number;
    pages: number;
  }> {
    const {
      city, district, type, category,
      telemedicineEnabled, homeVisits, emergency24h,
      specialty, page = 1, limit = 10,
    } = filters;

    const query: QueryFilter<IHospitalClinic> = {};

    if (city)     query['location.city']     = { $regex: city, $options: 'i' };
    if (district) query['location.district'] = { $regex: district, $options: 'i' };
    if (type)     query.type                 = type;
    if (category) query.category             = category;

    if (telemedicineEnabled !== undefined) query['partnerships.telemedicineEnabled'] = telemedicineEnabled;
    if (homeVisits !== undefined)          query['partnerships.homeVisits']          = homeVisits;
    if (emergency24h !== undefined)        query['hours.emergency24h']               = emergency24h;

    // Filtrer par spécialité dans les services
    if (specialty) {
      query['services'] = {
        $elemMatch: {
          specialty: { $regex: specialty, $options: 'i' },
          available: true,
        },
      };
    }

    const skip  = (page - 1) * limit;
    const total = await HospitalClinic.countDocuments(query);

    const facilities = await HospitalClinic.find(query)
      .select('-staff.doctors')
      .sort({ 'metadata.rating': -1, 'metadata.verified': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return { facilities, total, page, pages: Math.ceil(total / limit) };
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, dto: TUpdateHospitalClinic): Promise<IHospitalClinic> {
    const updateFields: Record<string, unknown> = {};

    // Mise à jour dot-notation pour éviter d'écraser les sous-documents entiers
    if (dto.name)     updateFields['name']     = dto.name;
    if (dto.type)     updateFields['type']     = dto.type;
    if (dto.category) updateFields['category'] = dto.category;

    if (dto.location) {
      if (dto.location.address)     updateFields['location.address']               = dto.location.address;
      if (dto.location.city)        updateFields['location.city']                  = dto.location.city;
      if (dto.location.district)    updateFields['location.district']              = dto.location.district;
      if (dto.location.commune)     updateFields['location.commune']               = dto.location.commune;
      if (dto.location.coordinates) updateFields['location.coordinates']           = dto.location.coordinates;
    }

    if (dto.contact) {
      if (dto.contact.phoneNumbers)    updateFields['contact.phoneNumbers']    = dto.contact.phoneNumbers;
      if (dto.contact.email)           updateFields['contact.email']           = dto.contact.email;
      if (dto.contact.website)         updateFields['contact.website']         = dto.contact.website;
      if (dto.contact.emergencyNumber) updateFields['contact.emergencyNumber'] = dto.contact.emergencyNumber;
    }

    if (dto.services)   updateFields['services']   = dto.services;
    if (dto.facilities) updateFields['facilities'] = dto.facilities;

    if (dto.partnerships) {
      if (dto.partnerships.insuranceCompanies  !== undefined) updateFields['partnerships.insuranceCompanies']  = dto.partnerships.insuranceCompanies;
      if (dto.partnerships.telemedicineEnabled !== undefined) updateFields['partnerships.telemedicineEnabled'] = dto.partnerships.telemedicineEnabled;
      if (dto.partnerships.homeVisits          !== undefined) updateFields['partnerships.homeVisits']          = dto.partnerships.homeVisits;
    }

    if (dto.hours) updateFields['hours'] = dto.hours;

    if (dto.certification) {
      if (dto.certification.licenseNumber) updateFields['certification.licenseNumber'] = dto.certification.licenseNumber;
      if (dto.certification.accreditation) updateFields['certification.accreditation'] = dto.certification.accreditation;
      if (dto.certification.expiryDate)    updateFields['certification.expiryDate']    = dto.certification.expiryDate;
    }

    updateFields['metadata.updatedAt'] = new Date();

    const updated = await HospitalClinic.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('staff.doctors', 'profile.firstName profile.lastName profile.specialty');

    if (!updated) throw new Error('Établissement introuvable.');
    return updated;
  }

  // ── Add doctor to staff ────────────────────────────────────────────────────

  async addDoctor(facilityId: string, doctorId: string): Promise<{ message: string }> {
    const facility = await HospitalClinic.findById(facilityId);
    if (!facility) throw new Error('Établissement introuvable.');

    const alreadyAdded = facility.staff.doctors.some(
      (id) => String(id) === doctorId
    );
    if (alreadyAdded) throw new Error('Ce médecin est déjà affilié à cet établissement.');

    await HospitalClinic.findByIdAndUpdate(facilityId, {
      $push: { 'staff.doctors': new Types.ObjectId(doctorId) },
      $set:  { 'metadata.updatedAt': new Date() },
    });

    return { message: 'Médecin ajouté à l\'établissement.' };
  }

  // ── Remove doctor from staff ───────────────────────────────────────────────

  async removeDoctor(facilityId: string, doctorId: string): Promise<{ message: string }> {
    await HospitalClinic.findByIdAndUpdate(facilityId, {
      $pull: { 'staff.doctors': new Types.ObjectId(doctorId) },
      $set:  { 'metadata.updatedAt': new Date() },
    });

    return { message: 'Médecin retiré de l\'établissement.' };
  }

  // ── Verify facility (admin) ────────────────────────────────────────────────

  async verify(id: string): Promise<{ message: string }> {
    const facility = await HospitalClinic.findByIdAndUpdate(
      id,
      { $set: { 'metadata.verified': true, 'metadata.updatedAt': new Date() } },
      { new: true }
    );
    if (!facility) throw new Error('Établissement introuvable.');
    return { message: 'Établissement vérifié avec succès.' };
  }

  // ── Update rating ──────────────────────────────────────────────────────────

  async updateRating(id: string, newRating: number): Promise<void> {
    const facility = await HospitalClinic.findById(id).select('metadata.rating metadata.totalReviews');
    if (!facility) throw new Error('Établissement introuvable.');

    const total      = facility.metadata.totalReviews + 1;
    const currentAvg = facility.metadata.rating || 0;
    const updatedAvg = parseFloat(((currentAvg * (total - 1) + newRating) / total).toFixed(2));

    await HospitalClinic.findByIdAndUpdate(id, {
      $set: {
        'metadata.rating':       updatedAvg,
        'metadata.totalReviews': total,
        'metadata.updatedAt':    new Date(),
      },
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async delete(id: string): Promise<{ message: string }> {
    const facility = await HospitalClinic.findByIdAndDelete(id);
    if (!facility) throw new Error('Établissement introuvable.');
    return { message: 'Établissement supprimé avec succès.' };
  }
}

export const hospitalClinicService = new HospitalClinicService();