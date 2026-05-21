import crypto from 'crypto';
import { Types, QueryFilter } from 'mongoose';
import { Appointment } from '../models/appointement.model';
import { Doctor } from '../models/medcin.model';
import { Patient } from '../models/patient.model';
import { IAppointment } from '../interfaces/appointement.interface';
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

// ─── Types ───────────────────────────────────────────────────────────────────

type ConsultationType = 'video' | 'audio' | 'chat' | 'in_person';
type AppointmentStatus = 'pending' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled' | 'no_show';
type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
type Priority = 'low' | 'medium' | 'high' | 'emergency';
type Currency = 'XOF' | 'EUR' | 'USD';
type PaymentMethod = 'mobile_money' | 'card' | 'wallet' | 'Assurance';
type PaymentProvider = 'orange_money' | 'mtn_money' | 'wave';
type CancelledBy = 'patient' | 'doctor' | 'system';

interface CreateAppointmentDTO {
  patientId: string;
  doctorId: string;
  type: ConsultationType;
  scheduledFor: Date;
  duration: number;
  reason: string;
  symptoms?: string[];
  priority: Priority;
  payment: {
    amount: number;
    currency: Currency;
    method: PaymentMethod;
    provider?: PaymentProvider;
  };
}

interface UpdateConsultationDTO {
  notes?: string;
  diagnosis?: string;
  recommendations?: string[];
  prescriptionId?: string;
  followUpDate?: Date;
}

interface AppointmentFilters {
  patientId?: string;
  doctorId?: string;
  status?: AppointmentStatus;
  type?: ConsultationType;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

interface SharedDocument {
  name: string;
  url: string;
  uploadedBy: 'patient' | 'doctor';
}

// ─── Appointment Service ──────────────────────────────────────────────────────

class AppointmentService {

  // ── Create appointment ─────────────────────────────────────────────────────

  async create(dto: CreateAppointmentDTO): Promise<IAppointment> {
    // Vérifier que le médecin existe et est actif
    const doctor = await Doctor.findById(dto.doctorId).select(
      'status.accountStatus telemedicine.isAvailable telemedicine.consultationFees profile.firstName profile.lastName'
    );
    if (!doctor) throw new Error('Médecin introuvable.');
    if (doctor.status.accountStatus !== 'active') throw new Error('Ce médecin n\'est pas disponible.');
    if (dto.type !== 'in_person' && !doctor.telemedicine.isAvailable) {
      throw new Error('Ce médecin ne propose pas de téléconsultation actuellement.');
    }

    // Vérifier que le patient existe
    const patient = await Patient.findById(dto.patientId).select('status.accountStatus');
    if (!patient) throw new Error('Patient introuvable.');
    if (patient.status.accountStatus !== 'active') throw new Error('Compte patient inactif.');

   const newStart = dto.scheduledFor;
const newEnd   = new Date(newStart.getTime() + dto.duration * 60000);

const conflict = await Appointment.findOne({
  doctorId: new Types.ObjectId(dto.doctorId),
  'status.current': { $in: ['pending', 'confirmed', 'ongoing'] },
  'details.scheduledFor': { $lt: newEnd },
  $expr: {
    $gt: [
      { $add: ['$details.scheduledFor', { $multiply: ['$details.duration', 60000] }] },
      newStart,
    ],
  },
});
    if (conflict) throw new Error('Ce créneau est déjà réservé pour ce médecin.');

    const appointmentId = `APT-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const chatRoomId = `ROOM-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const appointment = await Appointment.create({
      appointmentId,
      patientId: new Types.ObjectId(dto.patientId),
      doctorId: new Types.ObjectId(dto.doctorId),
      details: {
        type: dto.type,
        scheduledFor: dto.scheduledFor,
        duration: dto.duration,
        reason: dto.reason,
        symptoms: dto.symptoms ?? [],
        priority: dto.priority,
      },
      status: {
        current: 'pending',
        paymentStatus: 'pending',
      },
      payment: {
        amount: dto.payment.amount,
        currency: dto.payment.currency,
        method: dto.payment.method,
        provider: dto.payment.provider,
      },
      communication: {
        chatRoomId,
        recordings: [],
        sharedDocuments: [],
      },
      notifications: {
        remindersSent: 0,
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return appointment;
  }

  // ── Get by ID ──────────────────────────────────────────────────────────────

  async getById(appointmentId: string): Promise<IAppointment> {
    const appointment = await Appointment.findById(appointmentId)
      .populate('patientId', 'profile.firstName profile.lastName contact.phone profile.photo')
      .populate('doctorId', 'profile.firstName profile.lastName profile.specialty profile.title');

    if (!appointment) throw new Error('Rendez-vous introuvable.');
    return appointment;
  }

  // ── Get by appointmentId string ────────────────────────────────────────────

  async getByAppointmentId(appointmentId: string): Promise<IAppointment> {
    const appointment = await Appointment.findOne({ appointmentId })
      .populate('patientId', 'profile.firstName profile.lastName contact.phone')
      .populate('doctorId', 'profile.firstName profile.lastName profile.specialty profile.title');

    if (!appointment) throw new Error('Rendez-vous introuvable.');
    return appointment;
  }

  // ── List with filters ──────────────────────────────────────────────────────

  async list(filters: AppointmentFilters): Promise<{
    appointments: IAppointment[];
    total: number;
    page: number;
    pages: number;
  }> {
    const { patientId, doctorId, status, type, from, to, page = 1, limit = 10 } = filters;

    const query: QueryFilter<IAppointment> = {};

    if (patientId) query.patientId = new Types.ObjectId(patientId);
    if (doctorId) query.doctorId = new Types.ObjectId(doctorId);
    if (status) query['status.current'] = status;
    if (type) query['details.type'] = type;
    if (from || to) {
      query['details.scheduledFor'] = {};
      if (from) query['details.scheduledFor'].$gte = from;
      if (to) query['details.scheduledFor'].$lte = to;
    }

    const skip = (page - 1) * limit;
    const total = await Appointment.countDocuments(query);

    const appointments = await Appointment.find(query)
      .populate('patientId', 'profile.firstName profile.lastName profile.photo')
      .populate('doctorId', 'profile.firstName profile.lastName profile.photo profile.specialty profile.title')
      .sort({ 'details.scheduledFor': -1 })
      .skip(skip)
      .limit(limit);

    return { appointments, total, page, pages: Math.ceil(total / limit) };
  }

  // ── Confirm appointment (doctor) ───────────────────────────────────────────

  async confirm(appointmentId: string, doctorId: string): Promise<IAppointment> {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');
    if (String(appointment.doctorId) !== doctorId) throw new Error('Action non autorisée.');
    if (appointment.status.current !== 'pending') {
      throw new Error(`Impossible de confirmer un rendez-vous en statut "${appointment.status.current}".`);
    }

    appointment.status.current = 'confirmed';
    appointment.metadata.updatedAt = new Date();
    await appointment.save();

    return appointment;
  }

  // ── Start consultation ─────────────────────────────────────────────────────

  async startConsultation(appointmentId: string, doctorId: string): Promise<IAppointment> {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');
    if (String(appointment.doctorId) !== doctorId) throw new Error('Action non autorisée.');
    if (appointment.status.current !== 'confirmed') {
      throw new Error('Le rendez-vous doit être confirmé avant de démarrer.');
    }

    appointment.status.current = 'ongoing';
    appointment.consultation.startedAt = new Date();
    appointment.metadata.updatedAt = new Date();
    await appointment.save();

    return appointment;
  }

  // ── End consultation (doctor) ──────────────────────────────────────────────

  async endConsultation(
    appointmentId: string,
    doctorId: string,
    dto: UpdateConsultationDTO
  ): Promise<IAppointment> {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');
    if (String(appointment.doctorId) !== doctorId) throw new Error('Action non autorisée.');
    if (appointment.status.current !== 'ongoing') {
      throw new Error('La consultation n\'est pas en cours.');
    }

    const endedAt = new Date();

    if (!appointment.consultation.startedAt) {
      throw new Error('La consultation n\'a pas été démarrée correctement.');
    }

    const startedAt = appointment.consultation.startedAt!;
    const actualDuration = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

    appointment.status.current = 'completed';
    appointment.consultation.endedAt = endedAt;
    appointment.consultation.actualDuration = actualDuration;

    if (dto.notes) appointment.consultation.notes = dto.notes;
    if (dto.diagnosis) appointment.consultation.diagnosis = dto.diagnosis;
    if (dto.recommendations) appointment.consultation.recommendations = dto.recommendations;
    if (dto.prescriptionId) appointment.consultation.prescriptionId = new Types.ObjectId(dto.prescriptionId);
    if (dto.followUpDate) appointment.consultation.followUpDate = dto.followUpDate;

    appointment.metadata.updatedAt = new Date();
    await appointment.save();

    return appointment;
  }

  // ── Cancel appointment ─────────────────────────────────────────────────────

  async cancel(
    appointmentId: string,
    cancelledBy: CancelledBy,
    reason: string,
    requesterId: string
  ): Promise<IAppointment> {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    const cancellableStatuses: AppointmentStatus[] = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(appointment.status.current)) {
      throw new Error(`Impossible d'annuler un rendez-vous en statut "${appointment.status.current}".`);
    }

    // Vérifier que c'est bien le patient ou le médecin concerné
    if (
      (cancelledBy === 'patient' && String(appointment.patientId) !== requesterId) ||
      (cancelledBy === 'doctor'  && String(appointment.doctorId)  !== requesterId)
    ) {
      throw new Error('Action non autorisée.');
    }

    appointment.status.current = 'cancelled';
    appointment.status.cancellationReason = reason;
    appointment.status.cancelledBy = cancelledBy;

    // Si déjà payé, marquer comme à rembourser
    if (appointment.status.paymentStatus === 'paid') {
      appointment.status.paymentStatus = 'refunded';
    }

    appointment.metadata.updatedAt = new Date();
    await appointment.save();

    return appointment;
  }

  // ── Mark no show ───────────────────────────────────────────────────────────

  async markNoShow(appointmentId: string, doctorId: string): Promise<IAppointment> {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');
    if (String(appointment.doctorId) !== doctorId) throw new Error('Action non autorisée.');
    if (appointment.status.current !== 'confirmed') {
      throw new Error('Seul un rendez-vous confirmé peut être marqué comme absent.');
    }

    appointment.status.current = 'no_show';
    appointment.metadata.updatedAt = new Date();
    await appointment.save();

    return appointment;
  }

  // ── Update payment ─────────────────────────────────────────────────────────

  async updatePayment(
    appointmentId: string,
    data: {
      paymentStatus: PaymentStatus;
      transactionId?: string;
      paidAt?: Date;
    }
  ): Promise<IAppointment> {
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        $set: {
          'status.paymentStatus': data.paymentStatus,
          ...(data.transactionId && { 'payment.transactionId': data.transactionId }),
          ...(data.paidAt && { 'payment.paidAt': data.paidAt }),
          'metadata.updatedAt': new Date(),
        },
      },
      { new: true }
    );

    if (!appointment) throw new Error('Rendez-vous introuvable.');
    return appointment;
  }

  // ── Record patient/doctor join ─────────────────────────────────────────────

  async recordJoin(
    appointmentId: string,
    role: 'patient' | 'doctor'
  ): Promise<{ message: string }> {
    const field = role === 'patient' ? 'notifications.patientJoinedAt' : 'notifications.doctorJoinedAt';
    await Appointment.findByIdAndUpdate(appointmentId, {
      $set: { [field]: new Date(), 'metadata.updatedAt': new Date() },
    });
    return { message: `${role === 'patient' ? 'Patient' : 'Médecin'} rejoint la consultation.` };
  }

  // ── Share document ─────────────────────────────────────────────────────────

  async shareDocument(
    appointmentId: string,
    doc: SharedDocument,
    requesterId: string
  ): Promise<IAppointment> {
    const appointment = await Appointment.findById(appointmentId);
      if (!appointment) throw new Error('Rendez-vous introuvable.');

      const isAuthorized =
        (doc.uploadedBy === 'patient' && String(appointment.patientId) === requesterId) ||
        (doc.uploadedBy === 'doctor'  && String(appointment.doctorId)  === requesterId);

      if (!isAuthorized) throw new Error('Action non autorisée.');

      // Modifier directement l'objet en mémoire
        appointment.communication.sharedDocuments.push(doc);
        appointment.metadata.updatedAt = new Date();
          await appointment.save();

      return appointment;
    }

  // ── Add recording ──────────────────────────────────────────────────────────

  async addRecording(appointmentId: string, recordingUrl: string): Promise<{ message: string }> {
    await Appointment.findByIdAndUpdate(appointmentId, {
      $push: { 'communication.recordings': recordingUrl },
      $set: { 'metadata.updatedAt': new Date() },
    });
    return { message: 'Enregistrement ajouté.' };
  }

  // ── Increment reminder sent ────────────────────────────────────────────────

  async incrementReminder(appointmentId: string): Promise<void> {
    await Appointment.findByIdAndUpdate(appointmentId, {
      $inc: { 'notifications.remindersSent': 1 },
      $set: {
        'notifications.lastReminderSent': new Date(),
        'metadata.updatedAt': new Date(),
      },
    });
  }

  // ── Get upcoming appointments (for reminders) ──────────────────────────────

  async getUpcoming(withinMinutes: number): Promise<IAppointment[]> {
    const now = new Date();
    const threshold = new Date(now.getTime() + withinMinutes * 60000);

    return Appointment.find({
      'status.current': 'confirmed',
      'details.scheduledFor': { $gte: now, $lte: threshold },
    })
      .populate('patientId', 'profile.firstName contact.email preferences.notifications')
      .populate('doctorId', 'profile.firstName contact.email');
  }

  // ── Get doctor agenda for a day ────────────────────────────────────────────

  async getDoctorAgenda(doctorId: string, date: Date): Promise<IAppointment[]> {
    const TIMEZONE = 'Africa/Abidjan';
    const start = toZonedTime(startOfDay(date), TIMEZONE);
    const end   = fromZonedTime(endOfDay(date),   TIMEZONE);

    return Appointment.find({
      doctorId: new Types.ObjectId(doctorId),
      'details.scheduledFor': { $gte: start, $lte: end },
      'status.current': { $nin: ['cancelled'] },
    })
      .populate('patientId', 'profile.firstName profile.lastName profile.photo')
      .sort({ 'details.scheduledFor': 1 });
  }

  // ── Stats for doctor ───────────────────────────────────────────────────────

  async getDoctorStats(doctorId: string): Promise<{
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    pending: number;
    totalEarnings: number;
  }> {
    const results = await Appointment.aggregate([
      { $match: { doctorId: new Types.ObjectId(doctorId) } },
      {
        $group: {
          _id: '$status.current',
          count: { $sum: 1 },
          earnings: {
            $sum: {
              $cond: [{ $eq: ['$status.paymentStatus', 'paid'] }, '$payment.amount', 0],
            },
          },
        },
      },
    ]);

    const stats = { total: 0, completed: 0, cancelled: 0, noShow: 0, pending: 0, totalEarnings: 0 };

    for (const r of results) {
      stats.total += r.count;
      stats.totalEarnings += r.earnings;
      if (r._id === 'completed') stats.completed = r.count;
      if (r._id === 'cancelled') stats.cancelled = r.count;
      if (r._id === 'no_show') stats.noShow = r.count;
      if (r._id === 'pending') stats.pending = r.count;
    }

    return stats;
  }
}

export const appointmentService = new AppointmentService();