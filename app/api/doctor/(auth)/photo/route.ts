import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PUT /api/doctors/[id]/photo
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

    const { photoUrl } = await req.json();
    if (!photoUrl) {
      return NextResponse.json({ success: false, message: 'photoUrl est requis.' }, { status: 400 });
    }

    const result = await doctorService.updatePhoto(params.id, photoUrl);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}