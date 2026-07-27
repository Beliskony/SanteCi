import { Types } from 'mongoose';
import { Review } from '../models/review.model';
import { Appointment } from '../models/appointement.model';
import { Doctor } from '../models/medcin.model';
import { IReview } from '../interfaces/review.interface';
import { CreateReviewDTO, UpdateReviewDTO } from '../schemas/review.schema';

// Fenêtre pendant laquelle un patient peut encore modifier son avis
const EDIT_WINDOW_DAYS = 30;

class ReviewService {

  // ── Créer un avis ──────────────────────────────────────────────────────
  // Conditions : le RDV doit exister, appartenir au patient, être "completed",
  // et ne pas avoir déjà été noté.
  async createReview(patientId: string, dto: CreateReviewDTO): Promise<IReview> {
    const appointment = await Appointment.findById(dto.appointmentId);
    if (!appointment) throw new Error('Rendez-vous introuvable.');

    if (String(appointment.patientId) !== patientId) {
      throw new Error('Action non autorisée.');
    }

    if (appointment.status.current !== 'completed') {
      throw new Error('Vous ne pouvez laisser un avis que pour une consultation terminée.');
    }

    const existing = await Review.findOne({ appointmentId: dto.appointmentId });
    if (existing) throw new Error('Un avis a déjà été laissé pour ce rendez-vous.');

    const review = await Review.create({
      appointmentId: new Types.ObjectId(dto.appointmentId),
      doctorId:      appointment.doctorId,
      patientId:     new Types.ObjectId(patientId),
      rating:        dto.rating,
      comment:       dto.comment,
      isAnonymous:   dto.isAnonymous ?? false,
    });

    await this.recalculateDoctorRating(String(appointment.doctorId));

    return review;
  }

  // ── Modifier un avis (fenêtre de 30 jours) ─────────────────────────────
  async updateReview(reviewId: string, patientId: string, dto: UpdateReviewDTO): Promise<IReview> {
    const review = await Review.findById(reviewId);
    if (!review) throw new Error('Avis introuvable.');

    if (String(review.patientId) !== patientId) {
      throw new Error('Action non autorisée.');
    }

    const daysSinceCreation = (Date.now() - review.metadata.createdAt.getTime()) / 86400000;
    if (daysSinceCreation > EDIT_WINDOW_DAYS) {
      throw new Error(`Les avis ne peuvent plus être modifiés après ${EDIT_WINDOW_DAYS} jours.`);
    }

    if (dto.rating !== undefined)      review.rating = dto.rating;
    if (dto.comment !== undefined)     review.comment = dto.comment;
    if (dto.isAnonymous !== undefined) review.isAnonymous = dto.isAnonymous;
    review.metadata.updatedAt = new Date();

    await review.save();
    await this.recalculateDoctorRating(String(review.doctorId));

    return review;
  }

  // ── Supprimer un avis ───────────────────────────────────────────────────
  async deleteReview(reviewId: string, patientId: string): Promise<{ message: string }> {
    const review = await Review.findById(reviewId);
    if (!review) throw new Error('Avis introuvable.');

    if (String(review.patientId) !== patientId) {
      throw new Error('Action non autorisée.');
    }

    const doctorId = String(review.doctorId);
    await Review.findByIdAndDelete(reviewId);
    await this.recalculateDoctorRating(doctorId);

    return { message: 'Avis supprimé.' };
  }

  // ── Avis publiés d'un médecin (page publique, paginé) ──────────────────
  async getDoctorReviews(
    doctorId: string,
    filters: { page?: number; limit?: number } = {}
  ): Promise<{
    reviews: Array<{
      _id: string;
      rating: number;
      comment?: string;
      patientName: string;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    pages: number;
    averageRating: number;
    reviewCount: number;
  }> {
    const { page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const query = { doctorId: new Types.ObjectId(doctorId), status: 'published' };
    const total = await Review.countDocuments(query);

    const reviewsRaw = await Review.find(query)
      .populate('patientId', 'profile.firstName profile.lastName')
      .sort({ 'metadata.createdAt': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const reviews = reviewsRaw.map((r: any) => ({
      _id: String(r._id),
      rating: r.rating,
      comment: r.comment,
      patientName: r.isAnonymous
        ? 'Patient anonyme'
        : `${r.patientId?.profile?.firstName ?? ''} ${r.patientId?.profile?.lastName?.charAt(0) ?? ''}.`.trim(),
      createdAt: r.metadata.createdAt,
    }));

    const doctor = await Doctor.findById(doctorId).select('telemedicine.rating analytics.reviewCount');

    return {
      reviews,
      total,
      page,
      pages: Math.ceil(total / limit),
      averageRating: doctor?.telemedicine?.rating ?? 0,
      reviewCount: (doctor as any)?.analytics?.reviewCount ?? 0,
    };
  }

  // ── Vérifier si un avis existe déjà pour un RDV donné ──────────────────
  // Utile côté front pour savoir si on affiche "Laisser un avis" ou "Modifier mon avis"
  async getReviewForAppointment(appointmentId: string, patientId: string): Promise<IReview | null> {
    return Review.findOne({ appointmentId, patientId });
  }

  // ── Recalcul de la note moyenne + compteur du médecin ──────────────────
  async recalculateDoctorRating(doctorId: string): Promise<void> {
    const agg = await Review.aggregate([
      { $match: { doctorId: new Types.ObjectId(doctorId), status: 'published' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    const avg = agg[0]?.avg ?? 0;
    const count = agg[0]?.count ?? 0;

    await Doctor.findByIdAndUpdate(doctorId, {
      'telemedicine.rating': avg,
      'analytics.patientSatisfaction': avg,
      'analytics.reviewCount': count,
    });
  }
}

export const reviewService = new ReviewService();