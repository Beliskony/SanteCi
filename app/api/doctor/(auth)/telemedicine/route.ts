import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/doctors/[id]/telemedicine
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    if (String(authDoctor._id) !== params.id) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const doctor = await doctorService.getAvailability(params.id);
    return NextResponse.json({ success: true, data: doctor });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Médecin introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// PUT /api/doctors/[id]/telemedicine
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    if (String(authDoctor._id) !== params.id) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const body = await req.json();
    const updated = await doctorService.updateTelemedicine(params.id, body);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Médecin introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}