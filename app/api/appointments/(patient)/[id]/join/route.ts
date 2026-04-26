import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/appointments/[id]/join — enregistre que le patient ou médecin a rejoint la salle
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);

    // Vérifier que l'utilisateur est bien lié à ce RDV
    const existing = await appointmentService.getById(params.id);
    const isPatient = authUser.role === 'patient' && String(existing.patientId) === String(authUser.data._id);
    const isDoctor  = authUser.role === 'doctor'  && String(existing.doctorId)  === String(authUser.data._id);
    if (!isPatient && !isDoctor) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const result = await appointmentService.recordJoin(params.id, authUser.role);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Rendez-vous introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}