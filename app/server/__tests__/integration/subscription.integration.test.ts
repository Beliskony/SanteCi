/*
 * subscription.integration.test.ts
 *
 * Tests d'intégration pour subscription.service.ts.
 * On teste notamment :
 *  - downgradeExpired : la requête MongoDB réelle sur subscriptionExpiry < now
 *  - notifyExpiringSoon : la requête sur subscriptionExpiry dans l'intervalle
 *  - isSubscriptionActive / getTier : logique pure (pas de DB, mais exercée
 *    avec des documents réels récupérés depuis la DB)
 *
 * notificationService reste mocké — pas de vraies notifications en test.
 *
 * À placer dans : app/server/__tests__/integration/subscription.integration.test.ts
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

jest.mock('../../services/notification.service', () => ({
  notificationService: {
    notifySubscriptionDowngraded: jest.fn(async () => undefined),
    notifySubscriptionExpiringSoon: jest.fn(async () => undefined),
  },
}));

import { setupTestDB, clearDB, teardownTestDB } from './setup';
import { subscriptionService } from '../../services/subscription.service';
import { Doctor } from '../../models/medcin.model';
import { notificationService } from '../../services/notification.service';

beforeAll(async () => { await setupTestDB(); });
afterAll(async () => { await teardownTestDB(); });
beforeEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

let doctorCounter = 0;

async function createDoctorWithSubscription(
  subscription: 'free' | 'premium' | 'elite',
  subscriptionExpiry: Date | null = null
) {
  doctorCounter++;
  return Doctor.create({
    doctorId: `DOC-SUB-${doctorCounter}`,
    profile:  { firstName: 'Awa', lastName: 'Koffi', title: 'Dr', specialty: 'Cardiologie' },
    professional: {
      licenseNumber: `LIC-SUB-${doctorCounter}`,
      university: 'UFHB',
      graduationYear: 2015,
      certifications: [],
    },
    contact:  { phone: `+2250700${String(doctorCounter).padStart(5, '0')}`, email: `doc${doctorCounter}@test.ci` },
    location: { city: 'Abidjan' },
    security: { password: 'hashed', isMedcin: true, twoFactorEnabled: false, devices: [] },
    telemedicine: { isAvailable: true },
    status: {
      accountStatus:       'active',
      subscription,
      subscriptionExpiry,
      subscriptionStatus:  subscription === 'free' ? null : 'active',
    },
    analytics: {
      patientSatisfaction: 0, reviewCount: 0, totalConsultations: 0,
      totalPatients: 0, monthlyEarnings: 0, cancellationRate: 0,
    },
  });
}

// ─── downgradeExpired ─────────────────────────────────────────────────────────

describe('[intégration] subscriptionService.downgradeExpired', () => {
  it('dégrade les abonnements expirés vers "free" en DB', async () => {
    // Médecin premium expiré depuis hier
    const expiredDoc = await createDoctorWithSubscription(
      'premium',
      new Date(Date.now() - 86400000)
    );
    // Médecin elite expiré depuis 2 jours
    const expiredElite = await createDoctorWithSubscription(
      'elite',
      new Date(Date.now() - 2 * 86400000)
    );
    // Médecin premium valide (expire dans 10 jours) — ne doit PAS être dégradé
    const activeDoc = await createDoctorWithSubscription(
      'premium',
      new Date(Date.now() + 10 * 86400000)
    );
    // Médecin free — ne doit PAS être touché
    const freeDoc = await createDoctorWithSubscription('free', null);

    const result = await subscriptionService.downgradeExpired();

    expect(result.downgraded).toBe(2);

    // Les expirés sont passés en free
    const doc1 = await Doctor.findById(expiredDoc._id);
    expect(doc1!.status.subscription).toBe('free');
    expect(doc1!.status.subscriptionStatus).toBe('expired');

    const doc2 = await Doctor.findById(expiredElite._id);
    expect(doc2!.status.subscription).toBe('free');
    expect(doc2!.status.subscriptionStatus).toBe('expired');

    // L'abonnement valide reste intact
    const doc3 = await Doctor.findById(activeDoc._id);
    expect(doc3!.status.subscription).toBe('premium');

    // Le médecin free reste free
    const doc4 = await Doctor.findById(freeDoc._id);
    expect(doc4!.status.subscription).toBe('free');
  });

  it('notifie chaque médecin dégradé avec son ancien tier', async () => {
    await createDoctorWithSubscription('premium', new Date(Date.now() - 86400000));
    await createDoctorWithSubscription('elite',   new Date(Date.now() - 86400000));

    await subscriptionService.downgradeExpired();

    expect(notificationService.notifySubscriptionDowngraded).toHaveBeenCalledTimes(2);
    // Vérifier que les deux tiers corrects ont été notifiés
    const calls = (notificationService.notifySubscriptionDowngraded as any).mock.calls;
    const tiers = calls.map((c: any) => c[1]).sort();
    expect(tiers).toEqual(['elite', 'premium']);
  });

  it('retourne 0 et ne touche rien si aucun abonnement n\'est expiré', async () => {
    await createDoctorWithSubscription('premium', new Date(Date.now() + 10 * 86400000));
    await createDoctorWithSubscription('free', null);

    const result = await subscriptionService.downgradeExpired();

    expect(result.downgraded).toBe(0);
    expect(notificationService.notifySubscriptionDowngraded).not.toHaveBeenCalled();
  });
});

// ─── notifyExpiringSoon ───────────────────────────────────────────────────────

describe('[intégration] subscriptionService.notifyExpiringSoon', () => {
  it('notifie uniquement les médecins dont l\'expiration est dans le délai', async () => {
    // Expire dans 2 jours → dans le délai de 3 jours
    await createDoctorWithSubscription('premium', new Date(Date.now() + 2 * 86400000));
    // Expire dans 5 jours → hors délai de 3 jours
    await createDoctorWithSubscription('elite', new Date(Date.now() + 5 * 86400000));
    // Déjà expiré → hors délai (pas encore dégradé mais expiré)
    await createDoctorWithSubscription('premium', new Date(Date.now() - 86400000));

    const result = await subscriptionService.notifyExpiringSoon(3);

    expect(result.notified).toBe(1);
    expect(notificationService.notifySubscriptionExpiringSoon).toHaveBeenCalledTimes(1);
    const call = (notificationService.notifySubscriptionExpiringSoon as any).mock.calls[0];
    expect(call[1]).toBe('premium');
    expect(call[2]).toBe(2); // daysLeft
  });

  it('retourne 0 si aucun abonnement n\'expire bientôt', async () => {
    await createDoctorWithSubscription('premium', new Date(Date.now() + 30 * 86400000));
    await createDoctorWithSubscription('free', null);

    const result = await subscriptionService.notifyExpiringSoon(3);

    expect(result.notified).toBe(0);
    expect(notificationService.notifySubscriptionExpiringSoon).not.toHaveBeenCalled();
  });
});

// ─── isSubscriptionActive / getTier avec documents réels ─────────────────────

describe('[intégration] subscriptionService — isSubscriptionActive / getTier', () => {
  it('retourne true pour un abonnement premium actif récupéré depuis la DB', async () => {
    const doc = await createDoctorWithSubscription(
      'premium',
      new Date(Date.now() + 10 * 86400000)
    );
    const fromDb = await Doctor.findById(doc._id).lean();

    expect(subscriptionService.isSubscriptionActive(fromDb)).toBe(true);
    expect(subscriptionService.getTier(fromDb)).toBe('premium');
  });

  it('retourne false pour un abonnement expiré récupéré depuis la DB', async () => {
    const doc = await createDoctorWithSubscription(
      'elite',
      new Date(Date.now() - 86400000)
    );
    const fromDb = await Doctor.findById(doc._id).lean();

    expect(subscriptionService.isSubscriptionActive(fromDb)).toBe(false);
    expect(subscriptionService.getTier(fromDb)).toBe('free');
  });

  it('retourne false pour un médecin free récupéré depuis la DB', async () => {
    const doc    = await createDoctorWithSubscription('free', null);
    const fromDb = await Doctor.findById(doc._id).lean();

    expect(subscriptionService.isSubscriptionActive(fromDb)).toBe(false);
    expect(subscriptionService.getTier(fromDb)).toBe('free');
  });
});