import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/doctor/teleconsultation/slot
// body: { day: string, slotStart: string, isBooked: boolean }
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    
    if (!authDoctor || !authDoctor._id) {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux médecins.' },
        { status: 401 }
      );
    }

    const { day, slotStart, isBooked } = await req.json();

    // Validation des champs requis
    if (!day || !slotStart || isBooked === undefined) {
      return NextResponse.json(
        { success: false, message: 'day, slotStart et isBooked sont requis.' },
        { status: 400 }
      );
    }

    const result = await doctorService.updateSlotStatus(
      String(authDoctor._id), // doctorId
      day,                    // day
      slotStart,              // slotStart
      isBooked                // isBooked
    );
    
    return NextResponse.json({ success: true, ...result });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}