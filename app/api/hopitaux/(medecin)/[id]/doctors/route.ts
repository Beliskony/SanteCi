import { NextRequest, NextResponse } from 'next/server';
import { hospitalClinicService } from '@/app/server/services/hopital.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// POST /api/hospitals/[id]/doctors — affilier un médecin à l'établissement
// body: { doctorId: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const { doctorId } = await req.json();
    
    if (!doctorId) {
      return NextResponse.json(
        { success: false, message: 'doctorId est requis.' },
        { status: 400 }
      );
    }

    const result = await hospitalClinicService.addDoctor(id, doctorId);
    
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
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const { doctorId } = await req.json();
    
    if (!doctorId) {
      return NextResponse.json(
        { success: false, message: 'doctorId est requis.' },
        { status: 400 }
      );
    }

    const result = await hospitalClinicService.removeDoctor(id, doctorId);
    
    return NextResponse.json({ success: true, ...result });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' || message === 'Accès réservé aux médecins.' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}