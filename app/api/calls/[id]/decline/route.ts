import { NextRequest, NextResponse } from 'next/server';
import connectDB  from '@/app/server/config/databaseConnect';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { callService } from '@/app/server/services/Call.service';

// ─── PATCH /api/calls/[callSessionId]/decline ─────────────────────────────
// Refuser un appel entrant
// Body (optionnel) : { reason }

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ callSessionId: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req);

    const { callSessionId } = await params;
    const body   = await req.json().catch(() => ({}));
    const reason = body?.reason as string | undefined;

    const callSession = await callService.declineCall(
      callSessionId,
      String(authUser.data._id),
      reason
    );

    return NextResponse.json(
      { message: 'Appel refusé.', callSessionId: String(callSession._id) },
      { status: 200 }
    );
  } catch (err: any) {
    const status =
      err.message === 'Unauthorized'                   ? 401
      : err.message.includes('non autorisée')          ? 403
      : err.message.includes('introuvable')            ? 404
      : err.message.includes('Impossible de refuser')  ? 409
      : 500;

    return NextResponse.json({ message: err.message }, { status });
  }
}