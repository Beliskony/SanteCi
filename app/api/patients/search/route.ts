import { NextRequest, NextResponse } from 'next/server';
import { patientService } from '@/app/server/services/patient.service';
import { getAuthDoctor } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/patients/search?city=&bloodGroup=&accountStatus=&page=&limit=
// Réservé aux médecins
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    await getAuthDoctor(req);

    const { searchParams } = req.nextUrl;

    const filters = {
      city:          searchParams.get('city') ?? undefined,
      bloodGroup:    searchParams.get('bloodGroup') ?? undefined,
      accountStatus: searchParams.get('accountStatus') ?? undefined,
      page:          searchParams.has('page') ? Number(searchParams.get('page')) : 1,
      limit:         searchParams.has('limit') ? Number(searchParams.get('limit')) : 10,
    };

    const result = await patientService.searchPatients(filters);

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' || message === 'Accès réservé aux médecins.' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}