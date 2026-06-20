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


// PATCH /api/appointments/[id] — Reprogrammer un rendez-vous
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);

    if (!authUser || !authUser.data?._id) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié.' },
        { status: 401 }
      );
    }

    // Seul un patient peut reprogrammer son rendez-vous
    if (authUser.role !== 'patient') {
      return NextResponse.json(
        { success: false, message: 'Seuls les patients peuvent reprogrammer un rendez-vous.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    if (!body.scheduledFor) {
      return NextResponse.json(
        { success: false, message: 'La nouvelle date est requise.' },
        { status: 400 }
      );
    }

    const appointment = await appointmentService.reschedule(
      id,
      String(authUser.data._id),
      new Date(body.scheduledFor)
    );

    return NextResponse.json({ success: true, data: appointment });

  } catch (error: unknown) {
    console.error('Error in PATCH /api/appointments/[id]:', error);

    const message = error instanceof Error ? error.message : 'Erreur serveur.';

    let status = 500;
    if (message === 'Unauthorized') status = 401;
    else if (message === 'Rendez-vous introuvable.') status = 404;
    else if (message === 'Action non autorisée.') status = 403;
    else if (message.includes('Impossible de reprogrammer')) status = 409;
    else if (message.includes('déjà réservé')) status = 409;

    return NextResponse.json({ success: false, message }, { status });
  }
}