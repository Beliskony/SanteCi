import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthPatient} from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// POST /api/patients/[id]/emergency-contacts — ajouter un contact d'urgence
// body: { name: string, phone: string, relationship: string }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authPatient = await getAuthPatient(req);
    if (String(authPatient._id) !== params.id) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const { name, phone, relationship } = await req.json();
    if (!name || !phone || !relationship) {
      return NextResponse.json(
        { success: false, message: 'name, phone et relationship sont requis.' },
        { status: 400 }
      );
    }

    const updated = await patientService.addEmergencyContact(params.id, { name, phone, relationship });
    return NextResponse.json({ success: true, data: updated.contact.emergencyContacts }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message.includes('Maximum') ? 400 : message === 'Patient introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}