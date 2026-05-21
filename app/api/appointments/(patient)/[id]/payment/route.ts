import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/appointments/[id]/payment
// body: { paymentStatus, transactionId?, paidAt? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    
    if (!authUser || !authUser.data?._id) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Vérifier que l'utilisateur est bien lié à ce RDV
    const existing = await appointmentService.getById(id);
    const isPatient = authUser.role === 'patient' && String(existing.patientId) === String(authUser.data._id);
    const isDoctor = authUser.role === 'doctor' && String(existing.doctorId) === String(authUser.data._id);
    
    if (!isPatient && !isDoctor) {
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé.' },
        { status: 403 }
      );
    }

    const { paymentStatus, transactionId, paidAt } = await req.json();
    
    if (!paymentStatus) {
      return NextResponse.json(
        { success: false, message: 'paymentStatus est requis.' },
        { status: 400 }
      );
    }

    const appointment = await appointmentService.updatePayment(id, {
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