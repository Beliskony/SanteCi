import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// DELETE /api/doctors/[id]/certifications/[certId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; certId: string } }
) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    if (String(authDoctor._id) !== params.id) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const updated = await doctorService.removeCertification(params.id, params.certId);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Médecin introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}