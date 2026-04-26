import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/appointments/[id]/confirm — médecin uniquement
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    const appointment = await appointmentService.confirm(params.id, String(authDoctor._id));

    return NextResponse.json({ success: true, data: appointment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' || message === 'Accès réservé aux médecins.' ? 401
      : message === 'Action non autorisée.' ? 403
      : message === 'Rendez-vous introuvable.' ? 404
      : message.includes('statut') ? 409
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}