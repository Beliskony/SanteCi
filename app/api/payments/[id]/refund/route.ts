// app/api/payments/[appointmentId]/refund/route.ts
// POST /api/payments/[appointmentId]/refund — rembourser
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/app/server/services/payment.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { RefundPaymentSchema } from '@/app/server/schemas/payment.schema';
import connectDB from '@/app/server/config/databaseConnect';
import { isValidObjectId } from 'mongoose';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser?.data?._id) {
      return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    }

    if (!['patient', 'doctor'].includes(authUser.role)) {
      return NextResponse.json({ success: false, message: 'Accès non autorisé.' }, { status: 403 });
    }

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: 'ID invalide.' }, { status: 400 });
    }

    // Body optionnel — juste la raison
    const body = await req.json().catch(() => ({}));
    const parsed = RefundPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Données invalides.', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await paymentService.refund(
      id,
      String(authUser.data._id),
      authUser.role as 'patient' | 'doctor'
    );

    return NextResponse.json({ success: true, data: result });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    let status = 500;
    if (message === 'Rendez-vous introuvable.')          status = 404;
    if (message === 'Action non autorisée.')             status = 403;
    if (message.includes('Seul un paiement effectué'))  status = 422;
    return NextResponse.json({ success: false, message }, { status });
  }
}