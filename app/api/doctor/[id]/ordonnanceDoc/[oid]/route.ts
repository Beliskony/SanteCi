// app/api/prescriptions/[id]/route.ts
// PATCH /api/prescriptions/[id] — médecin met à jour
// DELETE /api/prescriptions/[id] — médecin supprime
import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { UpdatePrescriptionSchema } from '@/app/server/schemas/prescription.schema';
import connectDB from '@/app/server/config/databaseConnect';
import { isValidObjectId } from 'mongoose';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser?.data?._id) {
      return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    }

    if (authUser.role !== 'doctor') {
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: 'ID invalide.' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdatePrescriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Données invalides.', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await doctorService.updatePrescription(
      id,
      String(authUser.data._id),
      parsed.data
    );

    return NextResponse.json({ success: true, data: updated });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    let status = 500;
    if (message === 'Ordonnance introuvable.')  status = 404;
    if (message === 'Action non autorisée.')    status = 403;
    if (message.includes('Impossible'))         status = 422;
    return NextResponse.json({ success: false, message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser?.data?._id) {
      return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    }

    if (authUser.role !== 'doctor') {
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: 'ID invalide.' }, { status: 400 });
    }

    const result = await doctorService.deletePrescription(
      id,
      String(authUser.data._id)
    );

    return NextResponse.json({ success: true, message: result.message });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    let status = 500;
    if (message === 'Ordonnance introuvable.')               status = 404;
    if (message === 'Action non autorisée.')                 status = 403;
    if (message.includes('déjà reçue'))                     status = 422;
    return NextResponse.json({ success: false, message }, { status });
  }
}