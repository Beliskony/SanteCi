/**
 * mail.service.test.ts
 *
 * Tests unitaires pour mail.service.ts.
 * nodemailer est mocké — on ne teste pas le rendu HTML ni le transport SMTP
 * réel, mais on vérifie que :
 *  1. chaque méthode publique appelle sendMail avec les bons paramètres
 *     (destinataire, objet, présence du contenu attendu dans le HTML)
 *  2. le transporter est créé une seule fois (pattern singleton)
 *  3. les données dynamiques passées (OTP, nom, etc.) apparaissent bien
 *     dans le HTML généré
 *
 * Structure : app/server/services/mail.service.ts
 * app/server/__tests__/mail.service.test.ts (ce fichier)
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ─── Mock nodemailer AVANT l'import du service ────────────────────────────

const mockSendMail = jest.fn(async () => ({ messageId: 'test-id' }));
const mockTransporter = { sendMail: mockSendMail };
const mockCreateTestAccount = jest.fn(async () => ({
  user: 'test@ethereal.email',
  pass: 'secret',
}));
const mockCreateTransport = jest.fn(() => mockTransporter);
const mockGetTestMessageUrl = jest.fn(() => 'https://ethereal.email/message/test-id');

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTestAccount: mockCreateTestAccount,
    createTransport: mockCreateTransport,
    getTestMessageUrl: mockGetTestMessageUrl,
  },
}));

import { mailService } from '../services/mail.service';

// Helper pour récupérer les arguments du premier appel de sendMail
function getFirstCallArg(): any {
  const calls = mockSendMail.mock.calls as any[][];
  if (calls.length === 0 || !calls[0] || !calls[0][0]) {
    throw new Error('No calls to sendMail found');
  }
  return calls[0][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  // Réinitialiser le singleton transporter entre chaque test
  (mailService as any).transporter = null;
});

// ─── sendOtp ────────────────────────────────────────────────────────────────

describe('mailService.sendOtp', () => {
  it('envoie un email au bon destinataire avec un objet contenant "vérification"', async () => {
    await mailService.sendOtp('patient@test.ci', '123456', 'patient');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const callArg = getFirstCallArg();
    expect(callArg.to).toBe('patient@test.ci');
    expect(callArg.subject).toMatch(/vérification/i);
  });

  it('inclut le code OTP dans le HTML généré', async () => {
    await mailService.sendOtp('doc@test.ci', '654321', 'doctor');

    const callArg = getFirstCallArg();
    expect(callArg.html).toContain('654321');
  });

  it('mentionne le rôle "Médecin" dans le contenu pour un docteur', async () => {
    await mailService.sendOtp('doc@test.ci', '111111', 'doctor');

    const callArg = getFirstCallArg();
    expect(callArg.html).toContain('Médecin');
  });

  it('mentionne le rôle "Patient" dans le contenu pour un patient', async () => {
    await mailService.sendOtp('pat@test.ci', '222222', 'patient');

    const callArg = getFirstCallArg();
    expect(callArg.html).toContain('Patient');
  });
});

// ─── sendWelcome ────────────────────────────────────────────────────────────

describe('mailService.sendWelcome', () => {
  it('inclut le prénom du destinataire dans le HTML', async () => {
    await mailService.sendWelcome('yao@test.ci', 'Yao', 'patient');

    const callArg = getFirstCallArg();
    expect(callArg.html).toContain('Yao');
  });

  it('adapte le contenu selon le rôle (médecin vs patient)', async () => {
    await mailService.sendWelcome('doc@test.ci', 'Awa', 'doctor');

    const callArg = getFirstCallArg();
    // Les emails de bienvenue médecin mentionnent la configuration du profil pro
    expect(callArg.html).toMatch(/profil|patient|configur/i);
  });
});

// ─── sendPasswordReset ───────────────────────────────────────────────────────

describe('mailService.sendPasswordReset', () => {
  it('inclut le lien de reset dans le HTML', async () => {
    const resetLink = 'https://esante.ci/reset?token=abc123';
    await mailService.sendPasswordReset('user@test.ci', resetLink);

    const callArg = getFirstCallArg();
    expect(callArg.html).toContain(resetLink);
    expect(callArg.subject).toMatch(/réinitialisation/i);
  });
});

// ─── sendEmailVerification ───────────────────────────────────────────────────

describe('mailService.sendEmailVerification', () => {
  it('inclut le lien de vérification dans le HTML', async () => {
    const verificationLink = 'https://esante.ci/verify?token=xyz789';
    await mailService.sendEmailVerification('user@test.ci', verificationLink);

    const callArg = getFirstCallArg();
    expect(callArg.html).toContain(verificationLink);
  });
});

// ─── sendAppointmentConfirmation ─────────────────────────────────────────────

describe('mailService.sendAppointmentConfirmation', () => {
  it('inclut les détails du rendez-vous dans le HTML', async () => {
    await mailService.sendAppointmentConfirmation(
      'pat@test.ci',
      'Yao',
      { doctorName: 'Dr Koffi', date: 'Lundi 10 août 2026', type: 'Vidéo' }
    );

    const callArg = getFirstCallArg();
    expect(callArg.html).toContain('Dr Koffi');
    expect(callArg.html).toContain('Lundi 10 août 2026');
    expect(callArg.html).toContain('Vidéo');
    expect(callArg.html).toContain('Yao');
  });
});

// ─── Singleton transporter ───────────────────────────────────────────────────

describe('mailService — singleton transporter', () => {
  it('ne crée le transporter qu\'une seule fois pour plusieurs envois', async () => {
    await mailService.sendOtp('a@test.ci', '111111', 'patient');
    await mailService.sendOtp('b@test.ci', '222222', 'patient');
    await mailService.sendOtp('c@test.ci', '333333', 'patient');

    // createTestAccount et createTransport doivent être appelés une seule fois
    expect(mockCreateTestAccount).toHaveBeenCalledTimes(1);
    expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledTimes(3);
  });
});