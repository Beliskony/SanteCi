// app/api/webhooks/wave/route.ts
// Wave notifie ici après paiement (client_reference = appointmentId)
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/app/server/services/payment.service';
import connectDB from '@/app/server/config/databaseConnect';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    // Wave envoie client_reference = appointmentId qu'on a passé à la création
    const appointmentId  = body.client_reference as string | undefined;
    const checkoutStatus = body.checkout_status  as string | undefined;

    if (!appointmentId) {
      // Event sans référence — ignorer silencieusement
      return NextResponse.json({ received: true });
    }

    if (checkoutStatus === 'complete' || checkoutStatus === 'expired') {
      await paymentService.verifyAndConfirm(appointmentId);
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    // Toujours 200 — Wave ne réessaie pas sur erreur 5xx
    console.error('[Webhook Wave]', err);
    return NextResponse.json({ received: true });
  }
}