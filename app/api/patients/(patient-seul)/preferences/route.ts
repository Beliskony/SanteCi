// app/api/patients/preferences/route.ts (sans ID dans l'URL)
import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthPatient } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PATCH /api/patients/preferences (sans ID - on prend l'ID du token)
export async function PATCH(req: NextRequest) {
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
    
    // Utiliser l'ID du patient authentifié
    const updatedPatient = await patientService.updatePreferences(
      String(authPatient._id), 
      body
    );

    // Retourner le patient complet (comme attendu par le frontend)
    return NextResponse.json({ 
      success: true, 
      data: updatedPatient // Patient complet, pas seulement preferences
    });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : 
                   message === 'Patient introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}