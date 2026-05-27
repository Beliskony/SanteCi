// app/api/payments/simulate/route.ts
// POST /api/payments/simulate — simuler succès ou échec
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/app/server/services/payment.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { SimulatePaymentSchema } from '@/app/server/schemas/payment.schema';
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
        { success: false, message: 'Accès non autorisé.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = SimulatePaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Données invalides.', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { appointmentId, outcome } = parsed.data;
    const patientId = String(authUser.data._id);

    const result = outcome === 'success'
      ? await paymentService.simulateSuccess(appointmentId, patientId)
      : await paymentService.simulateFailure(appointmentId, patientId);

    return NextResponse.json({ success: true, data: result });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    let status = 500;
    if (message === 'Rendez-vous introuvable.')   status = 404;
    if (message === 'Action non autorisée.')      status = 403;
    if (message.includes('déjà payé'))            status = 409;
    if (message.includes('pas été initié'))       status = 422;
    return NextResponse.json({ success: false, message }, { status });
  }
}