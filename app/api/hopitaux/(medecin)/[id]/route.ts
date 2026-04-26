import { NextRequest, NextResponse } from 'next/server';
import { hospitalClinicService } from '@/app/server/services/hopital.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import { UpdateHospitalClinicSchema} from '@/app/server/schemas/HospitalClinic.schema';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/hospitals/[id] — détail complet d'un établissement (public)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const facility = await hospitalClinicService.getById(params.id);
    return NextResponse.json({ success: true, data: facility });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Établissement introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// PUT /api/hospitals/[id] — mise à jour (médecin authentifié)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    await getAuthDoctor(req);

    const body = await req.json();

    // Conversion de date si présente
    if (body.certification?.expiryDate) {
      body.certification.expiryDate = new Date(body.certification.expiryDate);
    }

    const parsed = UpdateHospitalClinicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Données invalides.', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await hospitalClinicService.update(params.id, parsed.data);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' || message === 'Accès réservé aux médecins.' ? 401
      : message === 'Établissement introuvable.' ? 404
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// DELETE /api/hospitals/[id] — suppression (médecin authentifié)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    await getAuthDoctor(req);

    const result = await hospitalClinicService.delete(params.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' || message === 'Accès réservé aux médecins.' ? 401
      : message === 'Établissement introuvable.' ? 404
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}