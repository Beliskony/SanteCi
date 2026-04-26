import { NextRequest, NextResponse } from 'next/server';
import { hospitalClinicService } from '@/app/server/services/hopital.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/hospitals/[id]/verify — vérifier un établissement (admin/médecin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    await getAuthDoctor(req);

    const result = await hospitalClinicService.verify(params.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' || message === 'Accès réservé aux médecins.' ? 401
      : message === 'Établissement introuvable.' ? 404
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}