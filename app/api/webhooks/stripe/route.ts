// app/api/webhooks/stripe/route.ts
// Stripe notifie ici après paiement ou expiration
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { paymentService } from '@/app/server/services/payment.service';
import connectDB from '@/app/server/config/databaseConnect';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const sig     = req.headers.get('stripe-signature');
  const rawBody = await req.text(); // raw text obligatoire pour la vérification

  if (!sig) {
    return NextResponse.json({ error: 'Signature manquante.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('[Webhook Stripe] Signature invalide :', err.message);
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 400 });
  }

  try {
    await connectDB();

    const session = event.data.object as Stripe.Checkout.Session;

    // appointmentId stocké dans metadata à la création de la session
    const appointmentId =
      session.metadata?.appointmentId ??
      session.client_reference_id ??
      null;

    if (
      appointmentId &&
      (event.type === 'checkout.session.completed' ||
       event.type === 'checkout.session.expired')
    ) {
      await paymentService.verifyAndConfirm(appointmentId);
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    // Toujours 200 — Stripe réessaie sur 5xx, on veut éviter les boucles
    console.error('[Webhook Stripe]', err);
    return NextResponse.json({ received: true });
  }
}