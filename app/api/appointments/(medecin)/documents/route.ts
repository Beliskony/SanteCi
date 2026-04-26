import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// POST /api/appointments/[id]/documents — partager un document
// body: { name: string, url: string }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    const { name, url } = await req.json();

    if (!name || !url) {
      return NextResponse.json({ success: false, message: 'name et url sont requis.' }, { status: 400 });
    }

    const appointment = await appointmentService.shareDocument(
      params.id,
      { name, url, uploadedBy: authUser.role },
      String(authUser.data._id)
    );

    return NextResponse.json({ success: true, data: appointment.communication.sharedDocuments }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401
      : message === 'Action non autorisée.' ? 403
      : message === 'Rendez-vous introuvable.' ? 404
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}