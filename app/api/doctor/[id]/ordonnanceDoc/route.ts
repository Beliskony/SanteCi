// app/api/prescriptions/route.ts
// POST /api/prescriptions — médecin crée une ordonnance
import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { CreatePrescriptionSchema } from '@/app/server/schemas/prescription.schema';
import connectDB from '@/app/server/config/databaseConnect';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser?.data?._id) {
      return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    }

    if (authUser.role !== 'doctor') {
      return NextResponse.json(
        { success: false, message: 'Seuls les médecins peuvent créer une ordonnance.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CreatePrescriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Données invalides.', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const prescription = await doctorService.createPrescription(
      String(authUser.data._id),
      parsed.data
    );

    return NextResponse.json({ success: true, data: prescription }, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    let status = 500;
    if (message.includes('introuvable')) status = 404;
    if (message.includes('inactif'))     status = 403;
    return NextResponse.json({ success: false, message }, { status });
  }
}