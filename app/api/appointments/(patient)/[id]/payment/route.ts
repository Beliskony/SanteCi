import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/appointments/[id]/payment
// body: { paymentStatus, transactionId?, paidAt? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);

    // Vérifier que l'utilisateur est bien lié à ce RDV
    const existing = await appointmentService.getById(params.id);
    const isPatient = authUser.role === 'patient' && String(existing.patientId) === String(authUser.data._id);
    const isDoctor  = authUser.role === 'doctor'  && String(existing.doctorId)  === String(authUser.data._id);
    if (!isPatient && !isDoctor) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const { paymentStatus, transactionId, paidAt } = await req.json();
    if (!paymentStatus) {
      return NextResponse.json({ success: false, message: 'paymentStatus est requis.' }, { status: 400 });
    }

    const appointment = await appointmentService.updatePayment(params.id, {
      paymentStatus,
      transactionId,
      paidAt: paidAt ? new Date(paidAt) : undefined,
    });

    return NextResponse.json({ success: true, data: appointment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Rendez-vous introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}