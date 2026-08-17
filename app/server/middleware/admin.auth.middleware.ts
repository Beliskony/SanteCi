// app/server/middleware/Admin.Auth.middleware.ts
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/admin.model';
import { IAdmin, AdminPermission } from '../interfaces/admin.interface';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminTokenPayload {
  id: string;
  role: 'admin';
  email: string;
}

// ─── Helper interne : décoder le token ───────────────────────────────────────

function decodeToken(req: NextRequest): AdminTokenPayload {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) throw new Error('Unauthorized');

  let payload: AdminTokenPayload;
  try {
    payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || "monSuperCodeSecretAxel123456@" as string
    ) as AdminTokenPayload;
  } catch {
    throw new Error('Unauthorized');
  }

  // Un token doctor/patient valide mais mal aiguillé ne doit jamais passer ici
  if (payload.role !== 'admin') throw new Error('Accès réservé aux administrateurs.');

  return payload;
}

// ─── getAuthAdmin : admin OU superadmin, avec permission optionnelle ─────────

export async function getAuthAdmin(
  req: NextRequest,
  requiredPermission?: AdminPermission
): Promise<IAdmin> {
  const payload = decodeToken(req);

  const admin = await Admin.findById(payload.id).select('-security.password');
  if (!admin) throw new Error('Administrateur introuvable.');

  if (admin.status.accountStatus !== 'active') {
    throw new Error('Compte administrateur suspendu ou bloqué.');
  }

  // Cohérence email : détecte un token émis avant un changement d'email
  // resté valide (edge case rare mais évite une désynchronisation silencieuse)
  if (admin.contact.email !== payload.email) {
    throw new Error('Session invalide. Merci de vous reconnecter.');
  }

  const isSuperAdmin = admin.role === 'superadmin';
  if (!isSuperAdmin && requiredPermission && !admin.permissions.includes(requiredPermission)) {
    throw new Error('Permission insuffisante.');
  }

  return admin;
}

// ─── getAuthSuperAdmin : lève une erreur si ce n'est pas un superadmin ───────
// Raccourci pour les routes de gestion des admins — plus explicite dans le
// code de la route qu'un `if (admin.role !== 'superadmin') throw ...` répété.

export async function getAuthSuperAdmin(req: NextRequest): Promise<IAdmin> {
  const admin = await getAuthAdmin(req);
  if (admin.role !== 'superadmin') throw new Error('Réservé au superadmin.');
  return admin;
}