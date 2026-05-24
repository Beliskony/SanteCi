import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/config/databaseConnect';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { callService } from '@/app/server/services/Call.service';

// ─── PATCH /api/calls/[callSessionId]/end ─────────────────────────────────
// Terminer un appel (caller ou receiver)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ callSessionId: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req);

    const { callSessionId } = await params;
    const requesterId       = String(authUser.data._id);

    // Déterminer endedBy selon si c'est le caller ou le receiver
    const callSession = await callService.getById(callSessionId);
    const endedBy     = String(callSession.callerId) === requesterId ? 'caller' : 'receiver';

    const ended = await callService.endCall(callSessionId, requesterId, endedBy);

    return NextResponse.json(
      {
        message:       'Appel terminé.',
        callSessionId: String(ended._id),
        duration:      ended.timing.duration ?? 0,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const status =
      err.message === 'Unauthorized'                    ? 401
      : err.message.includes('non autorisée')           ? 403
      : err.message.includes('introuvable')             ? 404
      : err.message.includes('Impossible de terminer')  ? 409
      : 500;

    return NextResponse.json({ message: err.message }, { status });
  }
}