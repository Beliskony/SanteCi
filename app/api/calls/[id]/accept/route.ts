import { NextRequest, NextResponse } from 'next/server';
import connectDB  from '@/app/server/config/databaseConnect';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { callService } from '@/app/server/services/Call.service';

// ─── PATCH /api/calls/[callSessionId]/accept ──────────────────────────────
// Accepter un appel entrant (receiver uniquement)
// Retourne les tokens Agora pour rejoindre le channel

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ callSessionId: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req);

    const { callSessionId } = await params;
    const receiverId        = String(authUser.data._id);
    const callSession       = await callService.acceptCall(callSessionId, receiverId);

    return NextResponse.json(
      {
        message:       'Appel accepté.',
        callSessionId: String(callSession._id),
        agora: {
          appId:       callSession.agora.appId,
          channelName: callSession.agora.channelName,
          token:       callSession.agora.receiverToken,
          uid:         callSession.agora.receiverUid,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    const status =
      err.message === 'Unauthorized'                    ? 401
      : err.message.includes('non autorisée')           ? 403
      : err.message.includes('introuvable')             ? 404
      : err.message.includes("Impossible d'accepter")   ? 409
      : 500;

    return NextResponse.json({ message: err.message }, { status });
  }
}