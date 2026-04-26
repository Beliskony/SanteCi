import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/appointments/stats — stats globales du médecin connecté
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    const stats = await appointmentService.getDoctorStats(String(authDoctor._id));

    return NextResponse.json({ success: true, data: stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' || message === 'Accès réservé aux médecins.' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}