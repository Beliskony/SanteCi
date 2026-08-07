/**
 * review.service.test.ts
 *
 * Tests unitaires purs : Review, Appointment, Doctor sont mockés.
 * Structure : app/server/services/review.service.ts, app/server/models/*.ts,
 * app/server/__tests__/review.service.test.ts (ce fichier).
 *
 * Ce fichier est basé sur ma lecture du fichier uploadé, PAS sur un
 * copier-coller confirmé du code source réel (contrairement à auth/
 * appointment/payment/doctor). Si des noms de champs ou messages d'erreur
 * diffèrent, colle-moi le vrai review.service.ts pour un contrôle croisé.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../models/review.model', () => ({
  Review: {
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.mock('../models/appointement.model', () => ({
  Appointment: {
    findById: jest.fn(),
  },
}));

jest.mock('../models/medcin.model', () => ({
  Doctor: {
    findByIdAndUpdate: jest.fn(),
    findById: jest.fn(),
  },
}));

import { reviewService } from '../services/review.service';
import { Review } from '../models/review.model';
import { Appointment } from '../models/appointement.model';
import { Doctor } from '../models/medcin.model';

function mockQuery<T>(value: T) {
  const query: any = Promise.resolve(value);
  query.select = jest.fn().mockReturnValue(query);
  query.populate = jest.fn().mockReturnValue(query);
  query.sort = jest.fn().mockReturnValue(query);
  query.skip = jest.fn().mockReturnValue(query);
  query.limit = jest.fn().mockReturnValue(query);
  query.lean = jest.fn().mockReturnValue(Promise.resolve(value));
  return query;
}

beforeEach(() => {
  jest.clearAllMocks();
  (Review.aggregate as any).mockResolvedValue([{ avg: 4.5, count: 3 }]);
  (Doctor.findByIdAndUpdate as any).mockResolvedValue(undefined);
});

// ─── createReview ───────────────────────────────────────────────────────────

describe('reviewService.createReview', () => {
  const dto = { appointmentId: '507f1f77bcf86cd799439013', rating: 5, comment: 'Excellent médecin' };

  it('rejette si le rendez-vous est introuvable', async () => {
    (Appointment.findById as any).mockResolvedValue(null);

    await expect(reviewService.createReview('507f1f77bcf86cd799439011', dto)).rejects.toThrow(
      'Rendez-vous introuvable.'
    );
  });

  it("rejette si le patient n'est pas celui du rendez-vous", async () => {
    (Appointment.findById as any).mockResolvedValue({
      patientId: '507f1f77bcf86cd799439099',
      status: { current: 'completed' },
    });

    await expect(reviewService.createReview('507f1f77bcf86cd799439011', dto)).rejects.toThrow(
      'Action non autorisée.'
    );
  });

  it("rejette si la consultation n'est pas terminée", async () => {
    (Appointment.findById as any).mockResolvedValue({
      patientId: '507f1f77bcf86cd799439011',
      status: { current: 'confirmed' },
    });

    await expect(reviewService.createReview('507f1f77bcf86cd799439011', dto)).rejects.toThrow(
      'Vous ne pouvez laisser un avis que pour une consultation terminée.'
    );
  });

  it('rejette si un avis existe déjà pour ce rendez-vous', async () => {
    (Appointment.findById as any).mockResolvedValue({
      patientId: '507f1f77bcf86cd799439011',
      status: { current: 'completed' },
      doctorId: '507f1f77bcf86cd799439012',
    });
    (Review.findOne as any).mockResolvedValue({ _id: 'existing-review' });

    await expect(reviewService.createReview('507f1f77bcf86cd799439011', dto)).rejects.toThrow(
      'Un avis a déjà été laissé pour ce rendez-vous.'
    );
  });

  it('crée l\'avis et recalcule la note du médecin', async () => {
    (Appointment.findById as any).mockResolvedValue({
      patientId: '507f1f77bcf86cd799439011',
      status: { current: 'completed' },
      doctorId: '507f1f77bcf86cd799439012',
    });
    (Review.findOne as any).mockResolvedValue(null);
    const createdReview = { _id: 'rev1', rating: 5 };
    (Review.create as any).mockResolvedValue(createdReview);

    const result = await reviewService.createReview('507f1f77bcf86cd799439011', dto);

    expect(result).toBe(createdReview);
    expect(Review.create).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 5, comment: 'Excellent médecin' })
    );
    expect(Doctor.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      expect.objectContaining({ 'telemedicine.rating': 4.5, 'analytics.reviewCount': 3 })
    );
  });
});

// ─── updateReview ───────────────────────────────────────────────────────────

describe('reviewService.updateReview', () => {
  it("rejette si l'avis est introuvable", async () => {
    (Review.findById as any).mockResolvedValue(null);

    await expect(reviewService.updateReview('rev1', '507f1f77bcf86cd799439011', { rating: 4 })).rejects.toThrow(
      'Avis introuvable.'
    );
  });

  it("rejette si le patient n'est pas l'auteur de l'avis", async () => {
    (Review.findById as any).mockResolvedValue({
      patientId: '507f1f77bcf86cd799439099',
      metadata: { createdAt: new Date() },
    });

    await expect(reviewService.updateReview('rev1', '507f1f77bcf86cd799439011', { rating: 4 })).rejects.toThrow(
      'Action non autorisée.'
    );
  });

  it("rejette si la fenêtre de 30 jours est dépassée", async () => {
    const oldDate = new Date(Date.now() - 31 * 86400000);
    (Review.findById as any).mockResolvedValue({
      patientId: '507f1f77bcf86cd799439011',
      doctorId: '507f1f77bcf86cd799439012',
      metadata: { createdAt: oldDate },
      save: jest.fn(async () => undefined),
    });

    await expect(reviewService.updateReview('rev1', '507f1f77bcf86cd799439011', { rating: 4 })).rejects.toThrow(
      /30 jours/
    );
  });

  it('met à jour l\'avis dans la fenêtre autorisée et recalcule la note', async () => {
    const recentDate = new Date(Date.now() - 5 * 86400000);
    const review: any = {
      patientId: '507f1f77bcf86cd799439011',
      doctorId: '507f1f77bcf86cd799439012',
      rating: 3,
      comment: 'Correct',
      metadata: { createdAt: recentDate },
    };
    review.save = jest.fn(async () => review);
    (Review.findById as any).mockResolvedValue(review);

    const result = await reviewService.updateReview('rev1', '507f1f77bcf86cd799439011', { rating: 5, comment: 'Finalement excellent' });

    expect(review.rating).toBe(5);
    expect(review.comment).toBe('Finalement excellent');
    expect(review.save).toHaveBeenCalled();
    expect(Doctor.findByIdAndUpdate).toHaveBeenCalled();
  });
});

// ─── deleteReview ───────────────────────────────────────────────────────────

describe('reviewService.deleteReview', () => {
  it("rejette si l'avis est introuvable", async () => {
    (Review.findById as any).mockResolvedValue(null);

    await expect(reviewService.deleteReview('rev1', '507f1f77bcf86cd799439011')).rejects.toThrow('Avis introuvable.');
  });

  it("rejette si le patient n'est pas l'auteur", async () => {
    (Review.findById as any).mockResolvedValue({ patientId: '507f1f77bcf86cd799439099', doctorId: '507f1f77bcf86cd799439012' });

    await expect(reviewService.deleteReview('rev1', '507f1f77bcf86cd799439011')).rejects.toThrow(
      'Action non autorisée.'
    );
  });

  it('supprime l\'avis et recalcule la note du médecin', async () => {
    (Review.findById as any).mockResolvedValue({ patientId: '507f1f77bcf86cd799439011', doctorId: '507f1f77bcf86cd799439012' });
    (Review.findByIdAndDelete as any).mockResolvedValue(undefined);

    const result = await reviewService.deleteReview('rev1', '507f1f77bcf86cd799439011');

    expect(result.message).toMatch(/supprimé/);
    expect(Doctor.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      expect.objectContaining({ 'telemedicine.rating': 4.5 })
    );
  });
});