import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@/app/server/services/review.service';
import { getAuthPatient } from '@/app/server/middleware/auth.middleware';


import connectDB from '@/app/server/config/databaseConnect';
import { createReviewSchema } from '@/app/server/schemas/review.schema';

// POST /api/reviews — créer un avis (patient uniquement)
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authPatient = await getAuthPatient(req);
    if (!authPatient || !authPatient._id) {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux patients.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Données invalides.', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const review = await reviewService.createReview(String(authPatient._id), parsed.data);

    return NextResponse.json({ success: true, data: review }, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message.includes('non autorisé') ? 403
      : message.includes('introuvable') ? 404
      : message.includes('déjà') || message.includes('terminée') ? 409
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// GET /api/reviews?doctorId=...&page=1&limit=10 — avis publiés d'un médecin (public)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const doctorId = searchParams.get('doctorId');
    if (!doctorId) {
      return NextResponse.json(
        { success: false, message: 'doctorId requis.' },
        { status: 400 }
      );
    }

    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10')));

    const result = await reviewService.getDoctorReviews(doctorId, { page, limit });

    return NextResponse.json({ success: true, ...result }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}