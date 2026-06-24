import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/doctor/performance — pilotage de l'activité du médecin connecté
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    if (!authDoctor || !authDoctor._id) {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux médecins.' },
        { status: 401 }
      );
    }

    const performance = await doctorService.getDoctorPerformance(String(authDoctor._id));

    return NextResponse.json({ success: true, data: performance }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}