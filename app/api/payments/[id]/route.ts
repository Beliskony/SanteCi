// app/api/payments/[id]/route.ts
// GET /api/payments/[id] — statut du paiement
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/app/server/services/payment.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { isValidObjectId } from 'mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (!authUser?.data?._id) {
      return NextResponse.json({ success: false, message: 'Non authentifié.' }, { status: 401 });
    }

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: 'ID invalide.' }, { status: 400 });
    }

    const result = await paymentService.getStatus(id);

    return NextResponse.json({ success: true, data: result });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status  = message === 'Rendez-vous introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}