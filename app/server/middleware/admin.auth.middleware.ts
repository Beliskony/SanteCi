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

// ─── Helper interne : lève une erreur avec un status HTTP attaché ───────────
// Pas de classe/lib dédiée : juste une Error normale avec .status en plus,
// que les routes lisent dans leur catch (error.status ?? 400).

function authError(message: string, status: number): Error {
  return Object.assign(new Error(message), { status });
}

// ─── Helper interne : décoder le token ───────────────────────────────────────

function decodeToken(req: NextRequest): AdminTokenPayload {
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) throw authError('Non authentifié.', 401);

  let payload: AdminTokenPayload;
  try {
    payload = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || "monSuperCodeSecretAxel123456@" as string
    ) as AdminTokenPayload;
  } catch {
    throw authError('Token invalide ou expiré.', 401);
  }

  // Un token doctor/patient valide mais mal aiguillé ne doit jamais passer ici
  if (payload.role !== 'admin') throw authError('Accès réservé aux administrateurs.', 401);

  return payload;
}

// ─── getAuthAdmin : admin OU superadmin, avec permission optionnelle ─────────

export async function getAuthAdmin(
  req: NextRequest,
  requiredPermission?: AdminPermission
): Promise<IAdmin> {
  const payload = decodeToken(req);

  const admin = await Admin.findById(payload.id).select('-security.password');
  if (!admin) throw authError('Administrateur introuvable.', 401);

  if (admin.status.accountStatus !== 'active') {
    // Identité authentifiée mais accès refusé — 403, pas 401 : rafraîchir
    // le token ne changera rien, ce n'est pas un problème de session.
    throw authError('Compte administrateur suspendu ou bloqué.', 403);
  }

  // Cohérence email : détecte un token émis avant un changement d'email
  // resté valide. C'est un problème de session (401), pas de permission.
  if (admin.contact.email !== payload.email) {
    throw authError('Session invalide. Merci de vous reconnecter.', 401);
  }

  const isSuperAdmin = admin.role === 'superadmin';
  if (!isSuperAdmin && requiredPermission && !admin.permissions.includes(requiredPermission)) {
    throw authError('Permission insuffisante.', 403);
  }

  return admin;
}

// ─── getAuthSuperAdmin : lève une erreur si ce n'est pas un superadmin ───────

export async function getAuthSuperAdmin(req: NextRequest): Promise<IAdmin> {
  const admin = await getAuthAdmin(req);
  if (admin.role !== 'superadmin') throw authError('Réservé au superadmin.', 403);
  return admin;
}