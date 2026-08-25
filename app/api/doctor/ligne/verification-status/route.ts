// app/api/doctor/ligne/verification-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/config/databaseConnect';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import { doctorService } from '@/app/server/services/doctor.service';

// GET /doctor/ligne/verification-status
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

    const status = await doctorService.getVerificationStatus(String(authDoctor._id));

    return NextResponse.json({ success: true, data: status }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}