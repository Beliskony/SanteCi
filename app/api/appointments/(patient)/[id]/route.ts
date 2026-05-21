// app/api/appointments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/appointments/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    
    //Vérifier l'authentification
    if (!authUser || !authUser.data?._id) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié.' },
        { status: 401 }
      );
    }

    //Attendre les params
    const { id } = await params;
    
    const appointment = await appointmentService.getById(id);

    // Vérifier que l'utilisateur est bien le patient ou le médecin du RDV
    const isPatient = authUser.role === 'patient' && String(appointment.patientId) === String(authUser.data._id);
    const isDoctor = authUser.role === 'doctor' && String(appointment.doctorId) === String(authUser.data._id);

    if (!isPatient && !isDoctor) {
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: appointment });
    
  } catch (error: unknown) {
    console.error('Error in GET /api/appointments/[id]:', error);
    
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    
    let status = 500;
    if (message === 'Non authentifié.') status = 401;
    else if (message === 'Rendez-vous introuvable.') status = 404;
    else if (message === 'Accès non autorisé.') status = 403;
    
    return NextResponse.json({ success: false, message }, { status });
  }
}