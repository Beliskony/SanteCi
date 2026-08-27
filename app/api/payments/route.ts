// app/api/payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/app/server/services/payment.service';
import { Appointment }    from '@/app/server/models/appointement.model';
import { getAuthUser }    from '@/app/server/middleware/auth.middleware';
import { InitiatePaymentSchema } from '@/app/server/schemas/payment.schema';
import connectDB from '@/app/server/config/databaseConnect';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser?.data?._id) {
      return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    }
    if (authUser.role !== 'patient') {
      return NextResponse.json(
        { success: false, message: 'Seuls les patients peuvent initier un paiement.' },
        { status: 403 }
      );
    }

    const body   = await req.json();
    const parsed = InitiatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Données invalides.', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // ── Source de vérité : le RDV en base, jamais le body du client ──────
    const appointment = await Appointment.findById(parsed.data.appointmentId);
    if (!appointment) {
      return NextResponse.json({ success: false, message: 'Rendez-vous introuvable.' }, { status: 404 });
    }
    if (String(appointment.patientId) !== String(authUser.data._id)) {
      return NextResponse.json({ success: false, message: 'Action non autorisée.' }, { status: 403 });
    }

    const referenceNumber = `SANTE-${appointment._id}-${Date.now()}`;

    const result = await paymentService.initiate({
      appointmentId:   parsed.data.appointmentId,
      patientId:       String(authUser.data._id),
      amount:          appointment.payment.amount,             // ← relu en base
      currency:        (appointment.payment.currency ?? 'XOF') as 'XOF' | 'EUR' | 'USD',
      channel:         parsed.data.channel,
      referenceNumber,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    let status = 500;
    if (message === 'Rendez-vous introuvable.')  status = 404;
    if (message === 'Action non autorisée.')     status = 403;
    if (message.includes('déjà payé'))           status = 409;
    if (message.includes('Impossible'))          status = 422;
    return NextResponse.json({ success: false, message }, { status });
  }
}