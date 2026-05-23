// app/api/patients/[id]/photo/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthPatient } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// PUT /api/patients/[id]/photo
export async function PUT(
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
    
    if (String(authPatient._id) !== id) {
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé.' },
        { status: 403 }
      );
    }

    // Récupérer le fichier depuis FormData
    const formData = await req.formData();
    const file = formData.get('photo') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Aucun fichier fourni.' },
        { status: 400 }
      );
    }

    // Validation du fichier
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Format non supporté. Utilisez JPG, PNG ou WEBP.' },
        { status: 400 }
      );
    }

    // Appeler le service avec le fichier
    const result = await patientService.updatePhoto(id, file);
    
    return NextResponse.json({ 
      success: true, 
      data: { photoUrl: result.url },
      message: result.message 
    });
    
  } catch (error: unknown) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}