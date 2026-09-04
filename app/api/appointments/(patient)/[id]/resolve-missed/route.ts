// app/api/appointments/[id]/resolve-missed/route.ts

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/config/databaseConnect';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { appointmentService } from '@/app/server/services/appointement.service';

// ─── PATCH /api/appointments/[id]/resolve-missed ───────────────────────────
// Trancher un rendez-vous payé et manqué (missed_review → no_show)
// Réservé au médecin concerné ou à un admin.

const ALLOWED_DECISIONS = ['refund', 'keep_payment', 'reschedule_credit'] as const;
type Decision = typeof ALLOWED_DECISIONS[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req);

    const { id } = await params;
    const body    = await req.json();
    const decision: Decision = body.decision;

    if (!ALLOWED_DECISIONS.includes(decision)) {
      return NextResponse.json(
        { message: `Décision invalide. Attendu : ${ALLOWED_DECISIONS.join(', ')}.` },
        { status: 400 }
      );
    }

    const role = authUser.role as 'doctor' | 'patient' | 'admin';
    if (role !== 'doctor' && role !== 'admin') {
      return NextResponse.json(
        { message: 'Action réservée aux médecins et administrateurs.' },
        { status: 403 }
      );
    }

    const resolverId   = String(authUser.data._id);
    const resolverType = role === 'admin' ? 'admin' : 'doctor';

    const appointment = await appointmentService.resolveMissedAppointment(
      id,
      resolverId,
      resolverType,
      decision
    );

    return NextResponse.json(
      {
        message: 'Rendez-vous manqué résolu.',
        data: appointment,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const status =
      err.message === 'Unauthorized'                     ? 401
      : err.message.includes('non autorisée')            ? 403
      : err.message.includes('introuvable')               ? 404
      : err.message.includes('n\'est pas en attente')      ? 409
      : 500;

    return NextResponse.json({ message: err.message }, { status });
  }
}