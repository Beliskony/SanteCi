import { NextRequest, NextResponse } from 'next/server';
import { hospitalClinicService } from '@/app/server/services/hopital.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/hospitals/[id]/rating — soumettre une note (patient ou médecin)
// body: { rating: number } — entre 0 et 5
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    
    if (!authUser || !authUser.data?._id) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { rating } = await req.json();

    if (rating === undefined || typeof rating !== 'number' || rating < 0 || rating > 5) {
      return NextResponse.json(
        { success: false, message: 'rating est requis et doit être un nombre entre 0 et 5.' },
        { status: 400 }
      );
    }

    await hospitalClinicService.updateRating(id, rating);
    
    return NextResponse.json({ success: true, message: 'Note enregistrée.' });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401
      : message === 'Établissement introuvable.' ? 404
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}