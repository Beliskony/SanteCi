import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthPatient } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// POST /api/patients/[id]/pin — définir le code PIN
// body: { pin: string }
export async function POST(
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

    const { pin } = await req.json();
    if (!pin) {
      return NextResponse.json(
        { success: false, message: 'pin est requis.' },
        { status: 400 }
      );
    }

    const result = await patientService.setPinCode(id, pin);
    
    return NextResponse.json({ success: true, ...result });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message.includes('PIN') ? 400 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// PATCH /api/patients/[id]/pin — vérifier le code PIN
// body: { pin: string }
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

    const { id } = await params;
    
    if (String(authPatient._id) !== id) {
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé.' },
        { status: 403 }
      );
    }

    const { pin } = await req.json();
    if (!pin) {
      return NextResponse.json(
        { success: false, message: 'pin est requis.' },
        { status: 400 }
      );
    }

    const result = await patientService.verifyPinCode(id, pin);
    
    return NextResponse.json({ success: true, ...result });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message.includes('PIN') ? 400 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}