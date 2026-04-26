// app/api/doctor/[id]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doctorService } from '@/app/server/services/doctor.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/doctor/[id]/profile — profil complet (authentifié, médecin lui-même)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ← Ajouter Promise
) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    const { id } = await params;  // ← Awaiter params ici
    
    // Comparer avec l'ID du docteur authentifié (MongoDB _id)
    if (String(authDoctor._id) !== id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Accès non autorisé.' 
      }, { status: 403 });
    }

    const doctor = await doctorService.getProfile(id);
    return NextResponse.json({ success: true, data: doctor });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Médecin introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// PUT /api/doctor/[id]/profile — mise à jour du profil
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ← Ajouter Promise ici aussi
) {
  try {
    await connectDB();

    const authDoctor = await getAuthDoctor(req);
    const { id } = await params;  // ← Awaiter params ici aussi
    
    if (String(authDoctor._id) !== id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Accès non autorisé.' 
      }, { status: 403 });
    }

    const body = await req.json();
    const updated = await doctorService.updateProfile(id, body);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Médecin introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}