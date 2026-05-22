// app/api/patients/[id]/ordonnance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { isValidObjectId } from 'mongoose';

// GET /api/patients/[id]/ordonnance?page=1&limit=10
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser?.data?._id) {
      return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    }

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: 'ID invalide.' }, { status: 400 });
    }

    // Un patient ne peut voir que ses propres ordonnances
    if (authUser.role === 'patient' && String(authUser.data._id) !== id) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const page  = Math.max(1, parseInt(sp.get('page')  ?? '1'));
    const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') ?? '10')));

    const result = await patientService.getMyPrescriptions(id, { page, limit });

    return NextResponse.json({ success: true, ...result });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}