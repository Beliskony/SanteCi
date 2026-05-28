import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthPatient} from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// DELETE /api/patients/[id]/emergency-contacts/[contactId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; contactId: string } }
) {
  try {
    await connectDB();

    const authPatient = await getAuthPatient(req);
    if (String(authPatient._id) !== params.id) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const updated = await patientService.removeEmergencyContact(params.id, params.contactId);
    return NextResponse.json({ success: true, data: updated.contact.emergencyContacts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Patient introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}