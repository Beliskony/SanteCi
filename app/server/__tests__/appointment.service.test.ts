/**
 * appointment.service.test.ts
 *
 * Tests unitaires purs : Appointment, Doctor, Patient et notificationService
 * sont mockés. Structure supposée identique à auth.service.test.ts :
 * app/server/services/appointment.service.ts, app/server/models/*.ts,
 * app/server/__tests__/appointment.service.test.ts (ce fichier).
 *
 * Point important : contrairement à auth.service, beaucoup de méthodes ici
 * font `Appointment.findById(...)` puis MUTENT le document retourné et
 * appellent `.save()`. Le mock doit donc simuler un vrai document Mongoose
 * (objet mutable + méthode .save()), pas juste une valeur statique.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../models/appointement.model', () => ({
  Appointment: {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.mock('../models/medcin.model', () => ({
  Doctor: {
    findById: jest.fn(),
  },
}));

jest.mock('../models/patient.model', () => ({
  Patient: {
    findById: jest.fn(),
  },
}));

jest.mock('../services/notification.service', () => ({
  notificationService: {
    notifySystem: jest.fn(async () => undefined),
    notifyAppointmentConfirmed: jest.fn(async () => undefined),
    notifyAppointmentCancelled: jest.fn(async () => undefined),
    notifyAppointmentReminder: jest.fn(async () => undefined),
    notifyPaymentReceived: jest.fn(async () => undefined),
  },
}));

import { appointmentService } from '../services/appointement.service';
import { Appointment } from '../models/appointement.model';
import { Doctor } from '../models/medcin.model';
import { Patient } from '../models/patient.model';
import { notificationService } from '../services/notification.service';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Simule un curseur Mongoose chaînable (.select/.populate/.lean/...) qui
 *  résout toujours vers la même valeur, quel que soit le nombre de maillons
 *  de chaîne utilisés avant le await. */
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

/** Simule un document Mongoose Appointment mutable, avec .save(). */
function mockAppointmentDoc(overrides: any = {}) {
  const doc: any = {
    _id: '507f1f77bcf86cd799439013',
    patientId: '507f1f77bcf86cd799439011',
    doctorId: '507f1f77bcf86cd799439012',
    details: {
      type: 'video',
      scheduledFor: new Date('2026-08-10T10:00:00Z'),
      duration: 30,
      reason: 'Douleur',
      symptoms: [],
      priority: 'medium',
    },
    status: { current: 'pending', paymentStatus: 'pending' },
    payment: { amount: 5000, currency: 'XOF', method: 'mobile_money' },
    communication: { chatRoomId: 'ROOM-1', recordings: [], sharedDocuments: [] },
    consultation: {},
    notifications: { remindersSent: 0 },
    metadata: { createdAt: new Date(), updatedAt: new Date() },
    ...overrides,
  };
  doc.save = jest.fn(async () => doc);
  return doc;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── create ─────────────────────────────────────────────────────────────────

describe('appointmentService.create', () => {
  const dto = {
    patientId: '507f1f77bcf86cd799439011',
    doctorId: '507f1f77bcf86cd799439012',
    type: 'video' as const,
    scheduledFor: new Date('2026-08-10T10:00:00Z'),
    duration: 30,
    reason: 'Douleur au dos',
    priority: 'medium' as const,
    payment: { amount: 5000, currency: 'XOF' as const, method: 'mobile_money' as const },
  };

  const activeDoctor = {
    status: { accountStatus: 'active' },
    telemedicine: { isAvailable: true },
  };
  const activePatient = { status: { accountStatus: 'active' } };

  it('rejette si le médecin est introuvable', async () => {
    (Doctor.findById as any).mockReturnValue(mockQuery(null));

    await expect(appointmentService.create(dto)).rejects.toThrow('Médecin introuvable.');
  });

  it("rejette si le médecin n'est pas actif", async () => {
    (Doctor.findById as any).mockReturnValue(
      mockQuery({ status: { accountStatus: 'suspended' }, telemedicine: { isAvailable: true } })
    );

    await expect(appointmentService.create(dto)).rejects.toThrow("Ce médecin n'est pas disponible.");
  });

  it('rejette si le médecin ne propose pas la téléconsultation', async () => {
    (Doctor.findById as any).mockReturnValue(
      mockQuery({ status: { accountStatus: 'active' }, telemedicine: { isAvailable: false } })
    );

    await expect(appointmentService.create(dto)).rejects.toThrow(
      'Ce médecin ne propose pas de téléconsultation actuellement.'
    );
  });

  it('rejette si le patient est introuvable', async () => {
    (Doctor.findById as any).mockReturnValue(mockQuery(activeDoctor));
    (Patient.findById as any).mockReturnValue(mockQuery(null));

    await expect(appointmentService.create(dto)).rejects.toThrow('Patient introuvable.');
  });

  it('rejette si le compte patient est inactif', async () => {
    (Doctor.findById as any).mockReturnValue(mockQuery(activeDoctor));
    (Patient.findById as any).mockReturnValue(mockQuery({ status: { accountStatus: 'suspended' } }));

    await expect(appointmentService.create(dto)).rejects.toThrow('Compte patient inactif.');
  });

  it('rejette si le créneau est déjà réservé (conflit)', async () => {
    (Doctor.findById as any).mockReturnValue(mockQuery(activeDoctor));
    (Patient.findById as any).mockReturnValue(mockQuery(activePatient));
    (Appointment.findOne as any).mockResolvedValue({ _id: 'existing-apt' });

    await expect(appointmentService.create(dto)).rejects.toThrow(
      'Ce créneau est déjà réservé pour ce médecin.'
    );
  });

  it('crée le rendez-vous et notifie le médecin quand tout est valide', async () => {
    (Doctor.findById as any).mockReturnValue(mockQuery(activeDoctor));
    (Patient.findById as any)
      .mockReturnValueOnce(mockQuery(activePatient)) // vérification du compte
      .mockReturnValueOnce(mockQuery({ profile: { firstName: 'Yao', lastName: 'Brou' } })); // pour la notif
    (Appointment.findOne as any).mockResolvedValue(null);

    const created = mockAppointmentDoc();
    (Appointment.create as any).mockResolvedValue(created);

    const result = await appointmentService.create(dto);

    expect(result).toBe(created);
    expect(notificationService.notifySystem).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      'doctor',
      'Nouvelle demande de rendez-vous',
      expect.any(String),
      'high'
    );
  });
});

// ─── confirm ────────────────────────────────────────────────────────────────

describe('appointmentService.confirm', () => {
  it('rejette si le rendez-vous est introuvable', async () => {
    (Appointment.findById as any).mockResolvedValue(null);

    await expect(appointmentService.confirm('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439012')).rejects.toThrow(
      'Rendez-vous introuvable.'
    );
  });

  it("rejette si le médecin n'est pas celui du rendez-vous", async () => {
    (Appointment.findById as any).mockResolvedValue(mockAppointmentDoc({ doctorId: '507f1f77bcf86cd799439099' }));

    await expect(appointmentService.confirm('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439012')).rejects.toThrow(
      'Action non autorisée.'
    );
  });

  it('rejette si le rendez-vous n\'est pas en attente', async () => {
    (Appointment.findById as any).mockResolvedValue(
      mockAppointmentDoc({ doctorId: '507f1f77bcf86cd799439012', status: { current: 'confirmed' } })
    );

    await expect(appointmentService.confirm('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439012')).rejects.toThrow(
      'Impossible de confirmer un rendez-vous en statut "confirmed".'
    );
  });

  it('confirme le rendez-vous et notifie le patient', async () => {
    const appt = mockAppointmentDoc({ doctorId: '507f1f77bcf86cd799439012', status: { current: 'pending' } });
    (Appointment.findById as any).mockResolvedValue(appt);
    (Doctor.findById as any).mockReturnValue(
      mockQuery({ profile: { firstName: 'Awa', lastName: 'Koffi', title: 'Dr' } })
    );

    const result = await appointmentService.confirm('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439012');

    expect(result.status.current).toBe('confirmed');
    expect(appt.save).toHaveBeenCalled();
    expect(notificationService.notifyAppointmentConfirmed).toHaveBeenCalled();
  });
});

// ─── startConsultation ───────────────────────────────────────────────────────

describe('appointmentService.startConsultation', () => {
  it("rejette si le rendez-vous n'est pas confirmé", async () => {
    (Appointment.findById as any).mockResolvedValue(
      mockAppointmentDoc({ doctorId: '507f1f77bcf86cd799439012', status: { current: 'pending' } })
    );

    await expect(appointmentService.startConsultation('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439012')).rejects.toThrow(
      'Le rendez-vous doit être confirmé avant de démarrer.'
    );
  });

  it('démarre la consultation et enregistre startedAt', async () => {
    const appt = mockAppointmentDoc({ doctorId: '507f1f77bcf86cd799439012', status: { current: 'confirmed' } });
    (Appointment.findById as any).mockResolvedValue(appt);

    const result = await appointmentService.startConsultation('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439012');

    expect(result.status.current).toBe('ongoing');
    expect(result.consultation.startedAt).toBeInstanceOf(Date);
    expect(notificationService.notifySystem).toHaveBeenCalled();
  });
});

// ─── endConsultation ──────────────────────────────────────────────────────────

describe('appointmentService.endConsultation', () => {
  it("rejette si la consultation n'est pas en cours", async () => {
    (Appointment.findById as any).mockResolvedValue(
      mockAppointmentDoc({ doctorId: '507f1f77bcf86cd799439012', status: { current: 'confirmed' } })
    );

    await expect(
      appointmentService.endConsultation('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439012', {})
    ).rejects.toThrow("La consultation n'est pas en cours.");
  });

  it("rejette si consultation.startedAt est manquant malgré le statut ongoing", async () => {
    (Appointment.findById as any).mockResolvedValue(
      mockAppointmentDoc({ doctorId: '507f1f77bcf86cd799439012', status: { current: 'ongoing' }, consultation: {} })
    );

    await expect(
      appointmentService.endConsultation('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439012', {})
    ).rejects.toThrow("La consultation n'a pas été démarrée correctement.");
  });

  it('termine la consultation, calcule la durée réelle et enregistre les notes', async () => {
    const startedAt = new Date(Date.now() - 15 * 60000); // il y a 15 minutes
    const appt = mockAppointmentDoc({
      doctorId: '507f1f77bcf86cd799439012',
      status: { current: 'ongoing' },
      consultation: { startedAt },
    });
    (Appointment.findById as any).mockResolvedValue(appt);

    const result = await appointmentService.endConsultation('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439012', {
      notes: 'RAS',
      diagnosis: 'Lombalgie',
    });

    expect(result.status.current).toBe('completed');
    expect(result.consultation.actualDuration).toBeGreaterThanOrEqual(14);
    expect(result.consultation.notes).toBe('RAS');
    expect(result.consultation.diagnosis).toBe('Lombalgie');
    expect(notificationService.notifySystem).toHaveBeenCalled();
  });
});

// ─── cancel ─────────────────────────────────────────────────────────────────

describe('appointmentService.cancel', () => {
  it('rejette si le statut ne permet plus l\'annulation', async () => {
    (Appointment.findById as any).mockResolvedValue(
      mockAppointmentDoc({ status: { current: 'completed' } })
    );

    await expect(
      appointmentService.cancel('507f1f77bcf86cd799439013', 'patient', 'Empêchement', '507f1f77bcf86cd799439011')
    ).rejects.toThrow('Impossible d\'annuler un rendez-vous en statut "completed".');
  });

  it("rejette si le requester n'est pas le patient concerné", async () => {
    (Appointment.findById as any).mockResolvedValue(
      mockAppointmentDoc({ patientId: '507f1f77bcf86cd799439099', status: { current: 'pending' } })
    );

    await expect(
      appointmentService.cancel('507f1f77bcf86cd799439013', 'patient', 'Empêchement', '507f1f77bcf86cd799439011')
    ).rejects.toThrow('Action non autorisée.');
  });

  it('annule et repasse paymentStatus à "refunded" si déjà payé', async () => {
    const appt = mockAppointmentDoc({
      patientId: '507f1f77bcf86cd799439011',
      status: { current: 'confirmed', paymentStatus: 'paid' },
    });
    (Appointment.findById as any).mockResolvedValue(appt);

    const result = await appointmentService.cancel('507f1f77bcf86cd799439013', 'patient', 'Empêchement', '507f1f77bcf86cd799439011');

    expect(result.status.current).toBe('cancelled');
    expect(result.status.paymentStatus).toBe('refunded');
    expect(result.status.cancelledBy).toBe('patient');
    expect(notificationService.notifyAppointmentCancelled).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      'doctor',
      '507f1f77bcf86cd799439013',
      'Empêchement'
    );
  });
});

// ─── markNoShow ───────────────────────────────────────────────────────────────

describe('appointmentService.markNoShow', () => {
  it("rejette si le rendez-vous n'est pas confirmé", async () => {
    (Appointment.findById as any).mockResolvedValue(
      mockAppointmentDoc({ doctorId: '507f1f77bcf86cd799439012', status: { current: 'pending' } })
    );

    await expect(appointmentService.markNoShow('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439012')).rejects.toThrow(
      'Seul un rendez-vous confirmé peut être marqué comme absent.'
    );
  });

  it('marque le rendez-vous comme "no_show" et notifie le patient', async () => {
    const appt = mockAppointmentDoc({ doctorId: '507f1f77bcf86cd799439012', status: { current: 'confirmed' } });
    (Appointment.findById as any).mockResolvedValue(appt);

    const result = await appointmentService.markNoShow('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439012');

    expect(result.status.current).toBe('no_show');
    expect(notificationService.notifySystem).toHaveBeenCalled();
  });
});

// ─── reschedule ───────────────────────────────────────────────────────────────

describe('appointmentService.reschedule', () => {
  const newDate = new Date('2026-08-15T14:00:00Z');

  it("rejette si le patient n'est pas celui du rendez-vous", async () => {
    (Appointment.findById as any).mockResolvedValue(
      mockAppointmentDoc({ patientId: '507f1f77bcf86cd799439099' })
    );

    await expect(
      appointmentService.reschedule('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439011', newDate)
    ).rejects.toThrow('Action non autorisée.');
  });

  it('rejette si le statut ne permet pas la reprogrammation', async () => {
    (Appointment.findById as any).mockResolvedValue(
      mockAppointmentDoc({ patientId: '507f1f77bcf86cd799439011', status: { current: 'ongoing' } })
    );

    await expect(
      appointmentService.reschedule('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439011', newDate)
    ).rejects.toThrow('Impossible de reprogrammer un rendez-vous en statut "ongoing".');
  });

  it('rejette si le nouveau créneau est en conflit', async () => {
    (Appointment.findById as any).mockResolvedValue(
      mockAppointmentDoc({ patientId: '507f1f77bcf86cd799439011', status: { current: 'pending' } })
    );
    (Appointment.findOne as any).mockResolvedValue({ _id: 'conflit' });

    await expect(
      appointmentService.reschedule('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439011', newDate)
    ).rejects.toThrow('Ce créneau est déjà réservé pour ce médecin.');
  });

  it('reprogramme le rendez-vous et repasse le statut à "confirmed"', async () => {
    const appt = mockAppointmentDoc({ patientId: '507f1f77bcf86cd799439011', status: { current: 'pending' } });
    (Appointment.findById as any).mockResolvedValue(appt);
    (Appointment.findOne as any).mockResolvedValue(null);

    const result = await appointmentService.reschedule('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439011', newDate);

    expect(result.details.scheduledFor).toBe(newDate);
    expect(result.status.current).toBe('confirmed');
    expect(notificationService.notifySystem).toHaveBeenCalled();
  });
});

// ─── autoMarkMissedAppointments ────────────────────────────────────────────────

describe('appointmentService.autoMarkMissedAppointments', () => {
  it("ne fait rien s'il n'y a aucun rendez-vous manqué", async () => {
    (Appointment.find as any).mockResolvedValue([]);

    const count = await appointmentService.autoMarkMissedAppointments();

    expect(count).toBe(0);
    expect(Appointment.updateMany).not.toHaveBeenCalled();
  });

  it('marque les rendez-vous manqués en "no_show" et notifie chaque patient', async () => {
    const missed = [
      { _id: '507f1f77bcf86cd799439013', patientId: '507f1f77bcf86cd799439011' },
      { _id: '507f1f77bcf86cd799439014', patientId: '507f1f77bcf86cd799439022' },
    ];
    (Appointment.find as any).mockResolvedValue(missed);
    (Appointment.updateMany as any).mockResolvedValue({ modifiedCount: 2 });

    const count = await appointmentService.autoMarkMissedAppointments();

    expect(count).toBe(2);
    expect(Appointment.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'] } },
      expect.objectContaining({ $set: expect.objectContaining({ 'status.current': 'no_show' }) })
    );
    expect(notificationService.notifySystem).toHaveBeenCalledTimes(2);
  });
});