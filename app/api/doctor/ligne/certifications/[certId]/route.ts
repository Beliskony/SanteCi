import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// DELETE /api/doctor/ligne/certifications/[certId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ certId: string }> }
) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    
    if (!authDoctor || !authDoctor._id) {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux médecins.' },
        { status: 401 }
      );
    }

    const { certId } = await params;
    const doctorId = String(authDoctor._id);

    const updated = await doctorService.removeCertification(doctorId, certId);
    
    return NextResponse.json({ success: true, data: updated });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Médecin introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}