import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/appointments?patientId=&doctorId=&status=&type=&from=&to=&page=&limit=
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    const {id} = await params
  

    const appointment = await appointmentService.getById(id);

    // Récupérer l'ID utilisateur
    const userId = authUser.data._id || authUser.data?._id;
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'ID utilisateur introuvable' },
        { status: 401 }
      );
    }

        // Vérifier que l'utilisateur est bien le patient ou le médecin du RDV
    const isPatient = authUser.role === 'patient' && String(appointment.patientId) === String(authUser.data._id || authUser.data?._id);
    const isDoctor = authUser.role === 'doctor' && String(appointment.doctorId) === String(authUser.data._id || authUser.data?._id);

    if (!isPatient && !isDoctor) {
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé.' },
        { status: 403 }
      );
    }
   



    return NextResponse.json({ success: true, data: appointment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// POST /api/appointments — créer un rendez-vous (patient uniquement)
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (authUser.role !== 'patient') {
      return NextResponse.json({ success: false, message: 'Seul un patient peut créer un rendez-vous.' }, { status: 403 });
    }

    const body = await req.json();

    // Forcer patientId depuis le token
    const userId = authUser.data._id || authUser.data?._id;
    body.patientId = userId;

    const appointment = await appointmentService.create(body);
    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message.includes('introuvable') ? 404 : message.includes('créneau') ? 409 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}