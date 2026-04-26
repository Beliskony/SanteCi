import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { Doctor } from '../models/medcin.model';
import { Patient } from '../models/patient.model';
import { IDoctor } from '../interfaces/medecin.interface';
import { IPatient } from '../interfaces/patient.interface';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'doctor' | 'patient';

interface TokenPayload {
  id: string;
  role: Role;
  email: string;
}

export type AuthUser =
  | { role: 'doctor'; data: IDoctor }
  | { role: 'patient'; data: IPatient };

// ─── Helper interne : décoder le token ───────────────────────────────────────

function decodeToken(req: NextRequest): TokenPayload {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) throw new Error('Unauthorized');

  return jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET || "monSuperCodeSecretAxel123456@" as string
  ) as TokenPayload;
}

// ─── getAuthUser : doctor ou patient selon le rôle dans le token ─────────────

export async function getAuthUser(req: NextRequest): Promise<AuthUser> {
  const payload = decodeToken(req);

  if (payload.role === 'doctor') {
    const doctor = await Doctor.findById(payload.id).select('-security.password');
    if (!doctor) throw new Error('Médecin introuvable.');
    if (doctor.status.accountStatus === 'suspended' || doctor.status.accountStatus === 'blocked') {
      throw new Error('Compte suspendu ou bloqué.');
    }
    return { role: 'doctor', data: doctor };
  }

  const patient = await Patient.findById(payload.id).select('-security.password -security.pinCode');
  if (!patient) throw new Error('Patient introuvable.');
  if (patient.status.accountStatus !== 'active' || !patient.security.isActive) {
    throw new Error('Compte inactif ou bloqué.');
  }
  return { role: 'patient', data: patient };
}

// ─── getAuthDoctor : lève une erreur si ce n'est pas un médecin ──────────────

export async function getAuthDoctor(req: NextRequest): Promise<IDoctor> {
  const payload = decodeToken(req);

  if (payload.role !== 'doctor') throw new Error('Accès réservé aux médecins.');

  const doctor = await Doctor.findById(payload.id).select('-security.password');
  if (!doctor) throw new Error('Médecin introuvable.');
  if (doctor.status.accountStatus === 'suspended' || doctor.status.accountStatus === 'blocked') {
    throw new Error('Compte suspendu ou bloqué.');
  }

  return doctor;
}

// ─── getAuthPatient : lève une erreur si ce n'est pas un patient ─────────────

export async function getAuthPatient(req: NextRequest): Promise<IPatient> {
  const payload = decodeToken(req);

  if (payload.role !== 'patient') throw new Error('Accès réservé aux patients.');

  const patient = await Patient.findById(payload.id).select('-security.password -security.pinCode');
  if (!patient) throw new Error('Patient introuvable.');
  if (patient.status.accountStatus !== 'active' || !patient.security.isActive) {
    throw new Error('Compte inactif ou bloqué.');
  }

  return patient;
}