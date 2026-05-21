import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/appointments/[id]/confirm — médecin uniquement
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    
    if (!authDoctor || !authDoctor._id) {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux médecins.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const appointment = await appointmentService.confirm(id, String(authDoctor._id));

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