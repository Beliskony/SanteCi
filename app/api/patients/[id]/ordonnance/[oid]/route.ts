// app/api/patients/[id]/ordonnance/[oid]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { isValidObjectId } from 'mongoose';

// GET /api/patients/[id]/ordonnance/[oid]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; oid: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser?.data?._id) {
      return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    }

    const { id, oid } = await params;

    if (!isValidObjectId(id) || !isValidObjectId(oid)) {
      return NextResponse.json({ success: false, message: 'ID invalide.' }, { status: 400 });
    }

    // Patient : ne peut voir que ses propres ordonnances
    if (authUser.role === 'patient' && String(authUser.data._id) !== id) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const prescription = await patientService.getPrescriptionById(
      oid,
      String(authUser.data._id),
      authUser.role as 'patient' | 'doctor'
    );

    return NextResponse.json({ success: true, data: prescription });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    let status = 500;
    if (message === 'Ordonnance introuvable.') status = 404;
    if (message === 'Accès non autorisé.')     status = 403;
    return NextResponse.json({ success: false, message }, { status });
  }
}