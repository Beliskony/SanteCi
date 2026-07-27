import { z } from 'zod';

export const createReviewSchema = z.object({
  appointmentId: z.string().length(24, 'appointmentId invalide'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  isAnonymous: z.boolean().optional(),
});

export type CreateReviewDTO = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
  isAnonymous: z.boolean().optional(),
});

export type UpdateReviewDTO = z.infer<typeof updateReviewSchema>;