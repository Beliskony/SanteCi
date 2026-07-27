import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@/app/server/services/review.service';
import { getAuthPatient } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { updateReviewSchema } from '@/app/server/schemas/review.schema';

// PATCH /api/reviews/[id] — modifier son propre avis (fenêtre de 30 jours)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params; // ⚠️ Next.js 15 : params est une Promise, toujours await avant destructuration

    const body = await req.json();
    const parsed = updateReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Données invalides.', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const review = await reviewService.updateReview(id, String(authPatient._id), parsed.data);

    return NextResponse.json({ success: true, data: review }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message.includes('non autorisé') ? 403
      : message.includes('introuvable') ? 404
      : message.includes('modifiés') ? 409
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// DELETE /api/reviews/[id] — supprimer son propre avis
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const result = await reviewService.deleteReview(id, String(authPatient._id));

    return NextResponse.json({ success: true, ...result }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message.includes('non autorisé') ? 403
      : message.includes('introuvable') ? 404
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}