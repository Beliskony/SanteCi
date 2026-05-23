// app/api/patients/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthUser, getAuthPatient } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/patients/[id] — profil public côté médecin ou profil complet côté patient
export async function GET(
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

    // Le patient accède à son propre profil complet
    if (authUser.role === 'patient') {
      if (String(authUser.data._id) !== id) {
        return NextResponse.json(
          { success: false, message: 'Accès non autorisé.' },
          { status: 403 }
        );
      }
      const patient = await patientService.getProfile(id);
      return NextResponse.json({ success: true, data: patient });
    }

    // Le médecin accède à la vue partielle du patient
    const patient = await patientService.getPatientForDoctor(id);
    return NextResponse.json({ success: true, data: patient });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message === 'Patient introuvable.' ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// PATCH /api/patients/[id] - Mettre à jour le profil
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Utilisez getAuthUser au lieu de getAuthPatient
    const authUser = await getAuthUser(req);
    
    if (!authUser || !authUser.data?._id) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié.' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est un patient
    if (authUser.role !== 'patient') {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux patients.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    // Vérifier que le patient modifie son propre profil
    if (String(authUser.data._id) !== id) {
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // Transformer les données pour le service
    const updateData = {
      firstName: body.firstName,
      lastName: body.lastName,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      gender: body.gender,
      bloodGroup: body.bloodGroup,
      city: body.city,
      district: body.district,
      address: body.address,
      coordinates: body.coordinates,
    };
    
    const updated = await patientService.updateProfile(id, updateData);
    
    return NextResponse.json({ 
      success: true, 
      data: updated 
    });
    
  } catch (error: unknown) {
    console.error('Update error:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE /api/patients/[id] - Supprimer le compte
export async function DELETE(
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

    if (authUser.role !== 'patient') {
      return NextResponse.json(
        { success: false, message: 'Accès réservé aux patients.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    if (String(authUser.data._id) !== id) {
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé.' },
        { status: 403 }
      );
    }

    const result = await patientService.deleteAccount(id);
    
    return NextResponse.json({ 
      success: true, 
      message: result.message 
    });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}