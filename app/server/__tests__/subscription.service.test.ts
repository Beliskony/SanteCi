/**
 * subscription.service.test.ts
 *
 * Tests unitaires purs : Doctor et notificationService sont mockés.
 * Structure : app/server/services/subscription.service.ts,
 * app/server/__tests__/subscription.service.test.ts (ce fichier).
 *
 * Basé sur le code source réel fourni — aucun new Types.ObjectId() appelé
 * directement à partir des paramètres de test, donc les IDs courts suffisent.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../models/medcin.model', () => ({
  Doctor: {
    find: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../services/notification.service', () => ({
  notificationService: {
    notifySubscriptionDowngraded: jest.fn(async () => undefined),
    notifySubscriptionExpiringSoon: jest.fn(async () => undefined),
  },
}));

import { subscriptionService } from '../services/subscription.service';
import { Doctor } from '../models/medcin.model';
import { notificationService } from '../services/notification.service';

function mockFind(value: any[]) {
  const query: any = Promise.resolve(value);
  query.select = jest.fn().mockReturnValue(Promise.resolve(value));
  return query;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── downgradeExpired ────────────────────────────────────────────────────────

describe('subscriptionService.downgradeExpired', () => {
  it("retourne 0 s'il n'y a aucun abonnement expiré", async () => {
    (Doctor.find as any).mockReturnValue(mockFind([]));

    const result = await subscriptionService.downgradeExpired();

    expect(result.downgraded).toBe(0);
    expect(Doctor.updateMany).not.toHaveBeenCalled();
    expect(notificationService.notifySubscriptionDowngraded).not.toHaveBeenCalled();
  });

  it('dégrade les abonnements expirés et notifie chaque médecin', async () => {
    const expiring = [
      { _id: 'doc1', status: { subscription: 'premium' } },
      { _id: 'doc2', status: { subscription: 'elite' } },
    ];
    (Doctor.find as any).mockReturnValue(mockFind(expiring));
    (Doctor.updateMany as any).mockResolvedValue({ modifiedCount: 2 });

    const result = await subscriptionService.downgradeExpired();

    expect(result.downgraded).toBe(2);
    expect(Doctor.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ['doc1', 'doc2'] } },
      {
        $set: expect.objectContaining({
          'status.subscription': 'free',
          'status.subscriptionStatus': 'expired',
        }),
      }
    );
    expect(notificationService.notifySubscriptionDowngraded).toHaveBeenCalledTimes(2);
    expect(notificationService.notifySubscriptionDowngraded).toHaveBeenCalledWith('doc1', 'premium');
    expect(notificationService.notifySubscriptionDowngraded).toHaveBeenCalledWith('doc2', 'elite');
  });

  it('continue même si une notification échoue', async () => {
    const expiring = [
      { _id: 'doc1', status: { subscription: 'premium' } },
      { _id: 'doc2', status: { subscription: 'elite' } },
    ];
    (Doctor.find as any).mockReturnValue(mockFind(expiring));
    (Doctor.updateMany as any).mockResolvedValue({ modifiedCount: 2 });
    // La première notification plante
    (notificationService.notifySubscriptionDowngraded as any)
      .mockRejectedValueOnce(new Error('Push service unavailable'))
      .mockResolvedValueOnce(undefined);

    const result = await subscriptionService.downgradeExpired();

    // Ne doit pas propager l'erreur — le service la catch individuellement
    expect(result.downgraded).toBe(2);
    expect(notificationService.notifySubscriptionDowngraded).toHaveBeenCalledTimes(2);
  });
});

// ─── notifyExpiringSoon ──────────────────────────────────────────────────────

describe('subscriptionService.notifyExpiringSoon', () => {
  it("retourne 0 s'il n'y a aucun abonnement expirant bientôt", async () => {
    (Doctor.find as any).mockReturnValue(mockFind([]));

    const result = await subscriptionService.notifyExpiringSoon(3);

    expect(result.notified).toBe(0);
    expect(notificationService.notifySubscriptionExpiringSoon).not.toHaveBeenCalled();
  });

  it('notifie les médecins dont l\'abonnement expire dans le délai', async () => {
    const expiry = new Date(Date.now() + 2 * 86400000); // dans 2 jours
    const expiring = [
      { _id: 'doc1', status: { subscription: 'premium', subscriptionExpiry: expiry } },
    ];
    (Doctor.find as any).mockReturnValue(mockFind(expiring));

    const result = await subscriptionService.notifyExpiringSoon(3);

    expect(result.notified).toBe(1);
    expect(notificationService.notifySubscriptionExpiringSoon).toHaveBeenCalledWith(
      'doc1',
      'premium',
      expect.any(Number), // daysLeft calculé dynamiquement
      expiry
    );
    // daysLeft doit être 2 (arrondi au supérieur de ~2 jours)
    const daysLeft = (notificationService.notifySubscriptionExpiringSoon as any).mock.calls[0][2];
    expect(daysLeft).toBe(2);
  });

  it('continue même si une notification échoue', async () => {
    const expiry = new Date(Date.now() + 86400000);
    const expiring = [
      { _id: 'doc1', status: { subscription: 'elite', subscriptionExpiry: expiry } },
      { _id: 'doc2', status: { subscription: 'premium', subscriptionExpiry: expiry } },
    ];
    (Doctor.find as any).mockReturnValue(mockFind(expiring));
    (notificationService.notifySubscriptionExpiringSoon as any)
      .mockRejectedValueOnce(new Error('oops'))
      .mockResolvedValueOnce(undefined);

    const result = await subscriptionService.notifyExpiringSoon(3);

    expect(result.notified).toBe(2);
    expect(notificationService.notifySubscriptionExpiringSoon).toHaveBeenCalledTimes(2);
  });
});

// ─── isSubscriptionActive ────────────────────────────────────────────────────

describe('subscriptionService.isSubscriptionActive', () => {
  it('retourne false pour un abonnement "free"', () => {
    expect(subscriptionService.isSubscriptionActive({
      status: { subscription: 'free', subscriptionExpiry: new Date(Date.now() + 86400000) },
    })).toBe(false);
  });

  it("retourne false si aucune date d'expiration", () => {
    expect(subscriptionService.isSubscriptionActive({
      status: { subscription: 'premium', subscriptionExpiry: null },
    })).toBe(false);
  });

  it("retourne false si l'abonnement est expiré", () => {
    expect(subscriptionService.isSubscriptionActive({
      status: { subscription: 'premium', subscriptionExpiry: new Date(Date.now() - 1000) },
    })).toBe(false);
  });

  it("retourne true si l'abonnement est actif et non expiré", () => {
    expect(subscriptionService.isSubscriptionActive({
      status: { subscription: 'elite', subscriptionExpiry: new Date(Date.now() + 86400000) },
    })).toBe(true);
  });
});

// ─── getTier ────────────────────────────────────────────────────────────────

describe('subscriptionService.getTier', () => {
  it("retourne 'free' si l'abonnement est inactif", () => {
    expect(subscriptionService.getTier({
      status: { subscription: 'premium', subscriptionExpiry: new Date(Date.now() - 1000) },
    })).toBe('free');
  });

  it("retourne 'premium' pour un abonnement premium actif", () => {
    expect(subscriptionService.getTier({
      status: { subscription: 'premium', subscriptionExpiry: new Date(Date.now() + 86400000) },
    })).toBe('premium');
  });

  it("retourne 'elite' pour un abonnement elite actif", () => {
    expect(subscriptionService.getTier({
      status: { subscription: 'elite', subscriptionExpiry: new Date(Date.now() + 86400000) },
    })).toBe('elite');
  });
});