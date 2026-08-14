// app/server/services/subscription.service.ts

import { Doctor } from '../models/medcin.model';
import { notificationService } from './notification.service';

class SubscriptionService {

  // ── Downgrader les abonnements expirés → free ─────────────────────────────
  // Appeler régulièrement (cron) ou à chaque démarrage serveur
  async downgradeExpired(): Promise<{ downgraded: number }> {
    const now = new Date();

    // On récupère d'abord les médecins concernés pour pouvoir les notifier individuellement
    const expiring = await Doctor.find({
      'status.subscription': { $in: ['premium', 'elite'] },
      'status.subscriptionExpiry': { $lt: now },
    }).select('_id status.subscription');

    if (expiring.length === 0) return { downgraded: 0 };

    await Doctor.updateMany(
      {
        _id: { $in: expiring.map((d) => d._id) }
      },
      {
        $set: {
          'status.subscription':       'free',
          'status.subscriptionStatus': 'expired',
          'metadata.updatedAt':        now,
        },
      }
    );

    for (const doctor of expiring) {
      try {
        await notificationService.notifySubscriptionDowngraded(
          String(doctor._id),
          doctor.status.subscription as 'premium' | 'elite'
        );
      } catch (err) {
        console.error('[SubscriptionService.downgradeExpired] Notification échec :', err);
      }
    }


    return { downgraded: expiring.length };
  }


// ── Nettoyer les demandes d'abonnement restées "pending" trop longtemps ────
// Le webhook n'est parfois jamais appelé (onglet fermé, réseau coupé) —
// sans ce nettoyage, subscriptionStatus reste "pending" indéfiniment.
// Appeler régulièrement (cron), ex: toutes les 15-30 min.

async cleanupStalePending(timeoutMinutes: number = 30): Promise<{ cleaned: number }> {
  const cutoff = new Date(Date.now() - timeoutMinutes * 60000);

  const result = await Doctor.updateMany(
    {
      'status.subscriptionStatus': 'pending',
      'metadata.updatedAt': { $lt: cutoff },
    },
    {
      $set: {
        'status.subscriptionStatus': 'failed',
        'metadata.updatedAt': new Date(),
      },
    }
  );

  return { cleaned: result.modifiedCount };
}


    // ── Alerter les médecins dont l'abonnement expire bientôt (cron, ex: 1x/jour) ──

  async notifyExpiringSoon(daysBefore: number = 3): Promise<{ notified: number }> {
    const now = new Date();
    const threshold = new Date(now.getTime() + daysBefore * 86400000);

    const expiring = await Doctor.find({
      'status.subscription': { $in: ['premium', 'elite'] },
      'status.subscriptionExpiry': { $gte: now, $lte: threshold },
      'status.expiryWarningNotifiedAt': { $ne: this._todayKey() }, // évite de spammer chaque jour
    }).select('_id status.subscription status.subscriptionExpiry');

    for (const doctor of expiring) {
      const daysLeft = Math.ceil(
        (doctor.status.subscriptionExpiry!.getTime() - now.getTime()) / 86400000
      );
      try {
        await notificationService.notifySubscriptionExpiringSoon(
          String(doctor._id),
          doctor.status.subscription as 'premium' | 'elite',
          daysLeft,
          doctor.status.subscriptionExpiry!
        );
      } catch (err) {
        console.error('[SubscriptionService.notifyExpiringSoon] Notification échec :', err);
      }
    }

    return { notified: expiring.length };
  }

  private _todayKey(): string {
    return new Date().toISOString().slice(0, 10);
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