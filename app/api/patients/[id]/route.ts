import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/patients/[id] — profil public côté médecin ou profil complet côté patient
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);

    // Le patient accède à son propre profil complet
    if (authUser.role === 'patient') {
      if (String(authUser.data._id) !== params.id) {
        return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
      }
      const patient = await patientService.getProfile(params.id);
      return NextResponse.json({ success: true, data: patient });
    }

    // Le médecin accède à la vue partielle du patient
    const patient = await patientService.getPatientForDoctor(params.id);
    return NextResponse.json({ success: true, data: patient });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Patient introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}