import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';


// GET /api/appointments/agenda?date=2025-01-15 — agenda du médecin pour un jour donné
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);

    const dateParam = req.nextUrl.searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();

    if (isNaN(date.getTime())) {
      return NextResponse.json({ success: false, message: 'Date invalide.' }, { status: 400 });
    }

    const appointments = await appointmentService.getDoctorAgenda(String(authDoctor._id), date);
    return NextResponse.json({ success: true, data: appointments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' || message === 'Accès réservé aux médecins.' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}