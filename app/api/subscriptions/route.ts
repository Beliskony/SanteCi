// app/api/subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/app/server/services/payment.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { z } from 'zod';

const InitiateSchema = z.object({
  plan:            z.enum(['premium', 'elite']),
  referenceNumber: z.string().min(1),
  amount:          z.number().positive(),
  channel:         z.string().default('WAVE'),
  currency:        z.enum(['XOF', 'EUR', 'USD']).default('XOF'),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser?.data?._id) {
      return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    }
    if (authUser.role !== 'doctor') {
      return NextResponse.json({ success: false, message: 'Réservé aux médecins.' }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = InitiateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const result = await paymentService.initiateSubscription({
      doctorId:        String(authUser.data._id),
      plan:            parsed.data.plan,
      amount:          parsed.data.amount,
      currency:        parsed.data.currency,
      channel:         parsed.data.channel,
      referenceNumber: parsed.data.referenceNumber,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status  = message === 'Médecin introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}