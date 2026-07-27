import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@/app/server/services/review.service';
import { getAuthPatient } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/reviews/appointment/[appointmentId]
// Permet au front de savoir s'il doit afficher "Laisser un avis" ou "Modifier mon avis"
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    await connectDB();

    const authPatient = await getAuthPatient(req);
    if (!authPatient || !authPatient._id) {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux patients.' },
        { status: 401 }
      );
    }

    const { appointmentId } = await params;

    const review = await reviewService.getReviewForAppointment(appointmentId, String(authPatient._id));

    return NextResponse.json({ success: true, data: review }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}