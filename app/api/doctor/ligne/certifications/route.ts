import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { cloudinaryService } from '@/app/server/services/cloudinary.service';

// POST /api/doctor/ligne/certifications — ajouter une certification avec document
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

    const formData = await req.formData();
    const name = formData.get('name') as string | null;
    const year = formData.get('year') as string | null;
    const issuer = formData.get('issuer') as string | null;
    const file = formData.get('document') as File | null;

    if (!name || !year || !issuer) {
      return NextResponse.json(
        { success: false, message: 'name, year et issuer sont requis.' },
        { status: 400 }
      );
    }

    let documentUrl: string | undefined;
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const doctorId = String(authDoctor._id);
      const { url } = await cloudinaryService.uploadCertificationDocument(
        buffer,
        doctorId,
        file.name
      );
      documentUrl = url;
    }

    const updated = await doctorService.addCertification(String(authDoctor._id), {
      name,
      year: parseInt(year, 10),
      issuer,
      documentUrl,
    });

    return NextResponse.json({ success: true, data: updated }, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Médecin introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}