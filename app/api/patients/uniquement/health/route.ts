import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/patients/[id]/health — patient (lui-même) ou médecin
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);

    // Patient : accès à ses propres données uniquement
    if (authUser.role === 'patient' && String(authUser.data._id) !== params.id) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const patient = await patientService.getProfile(params.id);
    return NextResponse.json({ success: true, data: patient.health });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Patient introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// PUT /api/patients/[id]/health — patient uniquement
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);

    if (authUser.role !== 'patient' || String(authUser.data._id) !== params.id) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const body = await req.json();
    const updated = await patientService.updateHealthInfo(params.id, body);

    return NextResponse.json({ success: true, data: updated.health });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Patient introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}