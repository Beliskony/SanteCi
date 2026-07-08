// app/api/webhooks/paiementpro/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/app/server/services/payment.service';
import connectDB from '@/app/server/config/databaseConnect';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body            = await req.json().catch(() => ({}));
    const referenceNumber = body.referenceNumber as string | undefined;
    const status          = body.status          as string | undefined;

    if (!referenceNumber || !status) {
      return NextResponse.json({ received: true });
    }

    const outcome = status === 'SUCCESS' ? 'success' : 'failed';

    if (referenceNumber.startsWith('SUB-')) {
      await paymentService.confirmSubscription(referenceNumber, outcome);
    } else {
      await paymentService.confirm(referenceNumber, outcome);
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    console.error('[Webhook PaiementPro]', err);
    return NextResponse.json({ received: true });
  }
}