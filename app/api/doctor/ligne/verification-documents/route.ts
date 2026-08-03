import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/config/databaseConnect';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import { doctorService } from '@/app/server/services/doctor.service';
import { cloudinaryService } from '@/app/server/services/cloudinary.service';

// POST /doctor/ligne/verification-documents
// FormData attendu :
//   - diploma?              (PDF)
//   - licenseCertificate?   (PDF)
//   - practiceAttestation?  (PDF)
//   - practiceName          (string)
//   - practiceType          ("hospital" | "clinic" | "private" | "other")
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
    const practiceName = String(formData.get('practiceName') ?? '');
    const practiceType = String(formData.get('practiceType') ?? 'private');

    const fileFields: Array<{ field: string; type: string }> = [
      { field: 'diploma',              type: 'diploma' },
      { field: 'licenseCertificate',   type: 'license_certificate' },
      { field: 'practiceAttestation',  type: 'practice_attestation' },
    ];

    const documents: Array<{ type: string; url: string; fileName: string }> = [];

    for (const { field, type } of fileFields) {
      const file = formData.get(field) as File | null;
      if (!file || file.size === 0) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      // cloudinaryService.uploadDocument n'existe probablement pas encore —
      // à ajouter sur le même modèle que uploadProfilePhoto, mais avec
      // resource_type: 'raw' (ou 'auto') pour accepter les PDF, pas seulement des images.
      const { url } = await cloudinaryService.uploadDocument(buffer, String(authDoctor._id), type);
      documents.push({ type, url, fileName: file.name });
    }

    if (documents.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Aucun document fourni.' },
        { status: 400 }
      );
    }

    const updated = await doctorService.submitVerificationDocuments(
      String(authDoctor._id),
      documents,
      { name: practiceName, type: practiceType }
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}