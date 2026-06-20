import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthPatient } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// DELETE /api/patients/emergency-contacts/[contactId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    await connectDB();

    const authPatient = await getAuthPatient(req);
    if (!authPatient || !authPatient._id) {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux patients.' },
        { status: 401 }
      );
    }

    const { contactId } = await params;

    const updated = await patientService.removeEmergencyContact(
      String(authPatient._id),
      contactId
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Patient introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}