import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/config/databaseConnect';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { callService } from '@/app/server/services/Call.service';

// ─── GET /api/appointments/[appointmentId]/calls ──────────────────────────
// Récupérer toutes les sessions d'appel d'un rendez-vous

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    await connectDB();
    await getAuthUser(req);

    const { appointmentId } = await params;
    const calls = await callService.getByAppointment(appointmentId);

    return NextResponse.json({ calls }, { status: 200 });
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ message: err.message }, { status });
  }
}