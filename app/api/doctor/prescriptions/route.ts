import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import { CreatePrescriptionSchema } from '@/app/server/schemas/prescription.schema';
import connectDB from '@/app/server/config/databaseConnect';

// POST /api/doctor/prescriptions — créer une ordonnance
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    if (!authDoctor || !authDoctor._id) {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux médecins.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = CreatePrescriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Données invalides.', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const prescription = await doctorService.createPrescription(
      String(authDoctor._id),
      parsed.data
    );

    return NextResponse.json({ success: true, data: prescription }, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401
      : message.includes('introuvable') ? 404
      : message.includes('inactif') ? 403
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}