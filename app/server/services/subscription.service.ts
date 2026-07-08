// app/server/services/subscription.service.ts

import { Doctor } from '../models/medcin.model';

class SubscriptionService {

  // ── Downgrader les abonnements expirés → free ─────────────────────────────
  // Appeler régulièrement (cron) ou à chaque démarrage serveur
  async downgradeExpired(): Promise<{ downgraded: number }> {
    const now = new Date();

    const result = await Doctor.updateMany(
      {
        'status.subscription':    { $in: ['premium', 'elite'] },
        'status.subscriptionExpiry': { $lt: now },
      },
      {
        $set: {
          'status.subscription':       'free',
          'status.subscriptionStatus': 'expired',
          'metadata.updatedAt':        now,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[SubscriptionService] ${result.modifiedCount} abonnement(s) expiré(s) → free`);
    }

    return { downgraded: result.modifiedCount };
  }

  // ── Vérifier si un médecin a un abonnement actif ──────────────────────────
  isSubscriptionActive(doctor: any): boolean {
    const sub    = doctor?.status?.subscription;
    const expiry = doctor?.status?.subscriptionExpiry;
    if (sub === 'free' || !expiry) return false;
    return new Date(expiry) > new Date();
  }

  // ── Tier du médecin (pour l'UI) ───────────────────────────────────────────
  getTier(doctor: any): 'free' | 'premium' | 'elite' {
    if (!this.isSubscriptionActive(doctor)) return 'free';
    return doctor?.status?.subscription ?? 'free';
  }
}

export const subscriptionService = new SubscriptionService();