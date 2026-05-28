import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthUser} from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/patients/[id]/stats — patient (lui-même) ou médecin
export async function GET(
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

    const { id } = await params;
    
    if (authUser.role === 'patient' && String(authUser.data._id) !== id) {
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé.' },
        { status: 403 }
      );
    }

    const stats = await patientService.getStats(id);
    
    return NextResponse.json({ success: true, data: stats });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Patient introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}