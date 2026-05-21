import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/doctor/creneau/status — passer en ligne / hors ligne
// body: { isOnline: boolean }
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    
    if (!authDoctor || !authDoctor._id) {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux médecins.' },
        { status: 401 }
      );
    }

    const { isOnline } = await req.json();
    
    if (isOnline === undefined) {
      return NextResponse.json(
        { success: false, message: 'isOnline est requis.' },
        { status: 400 }
      );
    }

    // Utiliser l'ID du médecin authentifié
    const result = await doctorService.toggleOnlineStatus(String(authDoctor._id), isOnline);
    
    return NextResponse.json({ success: true, ...result });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}