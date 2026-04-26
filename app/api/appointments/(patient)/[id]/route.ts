import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/appointments/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    const appointment = await appointmentService.getById(params.id);

    // Vérifier que l'utilisateur est bien le patient ou le médecin du RDV
    const isPatient = authUser.role === 'patient' && String(appointment.patientId) === String(authUser.data._id);
    const isDoctor  = authUser.role === 'doctor'  && String(appointment.doctorId)  === String(authUser.data._id);

    if (!isPatient && !isDoctor) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: appointment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Rendez-vous introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}