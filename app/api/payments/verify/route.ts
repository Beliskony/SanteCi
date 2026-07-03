// app/api/payments/verify/route.ts
// POST /api/payments/verify — confirmer un paiement après redirect Wave ou Stripe
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/app/server/services/payment.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';

const VerifySchema = z.object({
  appointmentId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser?.data?._id) {
      return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = VerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'appointmentId requis.', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { appointmentId } = parsed.data;

    if (!isValidObjectId(appointmentId)) {
      return NextResponse.json({ success: false, message: 'ID invalide.' }, { status: 400 });
    }

    const result = await paymentService.verifyAndConfirm(appointmentId);

    return NextResponse.json({ success: true, data: result });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    let status = 500;
    if (message === 'Rendez-vous introuvable.')          status = 404;
    if (message.includes('session Wave'))                status = 422;
    return NextResponse.json({ success: false, message }, { status });
  }
}