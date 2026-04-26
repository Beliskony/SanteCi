import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/doctors/[id]/slot — réserver ou libérer un créneau
// body: { day: string, slotStart: string, isBooked: boolean }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    if (String(authDoctor._id) !== params.id) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const { day, slotStart, isBooked } = await req.json();

    if (!day || !slotStart || isBooked === undefined) {
      return NextResponse.json(
        { success: false, message: 'day, slotStart et isBooked sont requis.' },
        { status: 400 }
      );
    }

    const result = await doctorService.updateSlotStatus(params.id, day, slotStart, isBooked);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}