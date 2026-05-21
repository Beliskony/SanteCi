import { NextRequest, NextResponse } from 'next/server';
import { appointmentService } from '@/app/server/services/appointement.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/appointments?patientId=xxx&doctorId=xxx&status=xxx&page=1&limit=10
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    
    if (!authUser || !authUser.data?._id) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié.' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    
    // Construire les filtres selon le rôle
    const filters: any = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
    };

    if (authUser.role === 'patient') {
      filters.patientId = String(authUser.data._id);
    } else if (authUser.role === 'doctor') {
      filters.doctorId = String(authUser.data._id);
    }

    // Filtres optionnels
    if (searchParams.has('status')) {
      filters.status = searchParams.get('status') as any;
    }
    if (searchParams.has('type')) {
      filters.type = searchParams.get('type') as any;
    }
    if (searchParams.has('from')) {
      filters.from = new Date(searchParams.get('from')!);
    }
    if (searchParams.has('to')) {
      filters.to = new Date(searchParams.get('to')!);
    }

    const result = await appointmentService.list(filters);
    
    return NextResponse.json({ success: true, ...result });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// POST /api/appointments - Créer un rendez-vous
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    
    if (!authUser || !authUser.data?._id) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié.' },
        { status: 401 }
      );
    }

    // Seul un patient peut créer un rendez-vous
    if (authUser.role !== 'patient') {
      return NextResponse.json(
        { success: false, message: 'Seuls les patients peuvent créer un rendez-vous.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    const appointment = await appointmentService.create({
      patientId: String(authUser.data._id),
      doctorId: body.doctorId,
      type: body.type,
      scheduledFor: new Date(body.scheduledFor),
      duration: body.duration,
      reason: body.reason,
      symptoms: body.symptoms || [],
      priority: body.priority || 'medium',
      payment: body.payment,
    });

    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    let status = 500;
    if (message === 'Unauthorized') status = 401;
    else if (message.includes('introuvable')) status = 404;
    else if (message.includes('disponible') || message.includes('réservé')) status = 409;
    
    return NextResponse.json({ success: false, message }, { status });
  }
}