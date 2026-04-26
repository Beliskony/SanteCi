import { NextRequest, NextResponse } from 'next/server';
import { hospitalClinicService } from '@/app/server/services/hopital.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// POST /api/hospitals/[id]/doctors — affilier un médecin à l'établissement
// body: { doctorId: string }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    await getAuthDoctor(req);

    const { doctorId } = await req.json();
    if (!doctorId) {
      return NextResponse.json({ success: false, message: 'doctorId est requis.' }, { status: 400 });
    }

    const result = await hospitalClinicService.addDoctor(params.id, doctorId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' || message === 'Accès réservé aux médecins.' ? 401
      : message === 'Établissement introuvable.' ? 404
      : message.includes('déjà affilié') ? 409
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// DELETE /api/hospitals/[id]/doctors — retirer un médecin de l'établissement
// body: { doctorId: string }
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    await getAuthDoctor(req);

    const { doctorId } = await req.json();
    if (!doctorId) {
      return NextResponse.json({ success: false, message: 'doctorId est requis.' }, { status: 400 });
    }

    const result = await hospitalClinicService.removeDoctor(params.id, doctorId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' || message === 'Accès réservé aux médecins.' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}