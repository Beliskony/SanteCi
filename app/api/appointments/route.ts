import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/appointments?patientId=&doctorId=&status=&type=&from=&to=&page=&limit=
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    const { searchParams } = req.nextUrl;

    const filters: Record<string, unknown> = {
      status:  searchParams.get('status') ?? undefined,
      type:    searchParams.get('type') ?? undefined,
      from:    searchParams.has('from') ? new Date(searchParams.get('from')!) : undefined,
      to:      searchParams.has('to') ? new Date(searchParams.get('to')!) : undefined,
      page:    searchParams.has('page') ? Number(searchParams.get('page')) : 1,
      limit:   searchParams.has('limit') ? Number(searchParams.get('limit')) : 10,
    };

    // Forcer le filtre sur l'utilisateur connecté (sécurité)
    if (authUser.role === 'patient') {
      filters.patientId = String(authUser.data._id);
    } else {
      filters.doctorId = String(authUser.data._id);
    }

    const result = await appointmentService.list(filters as Parameters<typeof appointmentService.list>[0]);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// POST /api/appointments — créer un rendez-vous (patient uniquement)
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    if (authUser.role !== 'patient') {
      return NextResponse.json({ success: false, message: 'Seul un patient peut créer un rendez-vous.' }, { status: 403 });
    }

    const body = await req.json();

    // Forcer patientId depuis le token
    body.patientId = String(authUser.data._id);

    const appointment = await appointmentService.create(body);
    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : message.includes('introuvable') ? 404 : message.includes('créneau') ? 409 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}