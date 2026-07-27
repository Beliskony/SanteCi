import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /doctor/ligne/patients/:[id]/dossier
export async function GET(
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

    const { id: patientId } = await params;

    const dossier = await doctorService.getPatientDossier(String(authDoctor._id), patientId);
    return NextResponse.json({ success: true, data: dossier }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message.includes('non autorisé') ? 403
      : message === 'Unauthorized' ? 401
      : message.includes('introuvable') ? 404
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}