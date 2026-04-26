import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/appointments/[id]/cancel — patient ou médecin
// body: { reason: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    const { reason } = await req.json();

    if (!reason) {
      return NextResponse.json({ success: false, message: 'La raison d\'annulation est requise.' }, { status: 400 });
    }

    const cancelledBy = authUser.role; // 'patient' | 'doctor'
    const requesterId = String(authUser.data._id);

    const appointment = await appointmentService.cancel(params.id, cancelledBy, reason, requesterId);
    return NextResponse.json({ success: true, data: appointment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401
      : message === 'Action non autorisée.' ? 403
      : message === 'Rendez-vous introuvable.' ? 404
      : message.includes('statut') ? 409
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}