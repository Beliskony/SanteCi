import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import connectDB from '@/app/server/config/databaseConnect';
// GET /api/doctors/[id] — profil public d'un médecin
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise <{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const doctor = await doctorService.getDoctorPublicProfile(id);

    return NextResponse.json({ success: true, data: doctor });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Médecin introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}