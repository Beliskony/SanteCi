// app/api/payments/simulate/route.ts
// DEV ONLY — à supprimer en prod
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/config/databaseConnect';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { Appointment } from '@/app/server/models/appointement.model';
import { SimulatePaymentSchema } from '@/app/server/schemas/payment.schema';

export async function POST(req: NextRequest) {
  // Bloquer en production
  //if (process.env.NODE_ENV === 'production') {
    //return NextResponse.json({ success: false, message: 'Non disponible en production.' }, { status: 403 });
  //}

  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser?.data?._id) {
      return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = SimulatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { appointmentId, outcome } = parsed.data;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return NextResponse.json({ success: false, message: 'Rendez-vous introuvable.' }, { status: 404 });

    if (String(appointment.patientId) !== String(authUser.data._id)) {
      return NextResponse.json({ success: false, message: 'Action non autorisée.' }, { status: 403 });
    }

    const newStatus = outcome === 'success' ? 'paid' : 'failed';
    await Appointment.findByIdAndUpdate(appointmentId, {
      $set: {
        'status.paymentStatus': newStatus,
        'status.current': outcome === 'success' ? 'confirmed' : 'pending',
        ...(outcome === 'success' ? { 'payment.paidAt': new Date() } : {}),
        'metadata.updatedAt': new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        appointmentId,
        status: newStatus,
        simulatedAt: new Date(),
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}