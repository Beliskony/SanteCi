import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/config/databaseConnect';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { callService } from '@/app/server/services/Call.service';

// ─── POST /api/calls/[callSessionId]/refresh-token ────────────────────────
// Rafraîchir les tokens Agora avant expiration (~10 min avant 1h)
// Retourne uniquement le token de l'utilisateur connecté

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ callSessionId: string }> }
) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req);

    const { callSessionId } = await params;
    const userId            = String(authUser.data._id);
    const callSession       = await callService.getById(callSessionId);

    const isCaller   = String(callSession.callerId)   === userId;
    const isReceiver = String(callSession.receiverId) === userId;

    if (!isCaller && !isReceiver) {
      return NextResponse.json(
        { message: 'Action non autorisée.' },
        { status: 403 }
      );
    }

    const tokens = await callService.refreshTokens(callSessionId);

    return NextResponse.json(
      {
        message:     'Token rafraîchi.',
        token:       isCaller ? tokens.callerToken : tokens.receiverToken,
        uid:         isCaller ? callSession.agora.callerUid : callSession.agora.receiverUid,
        channelName: callSession.agora.channelName,
        appId:       callSession.agora.appId,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const status =
      err.message === 'Unauthorized'        ? 401
      : err.message.includes('introuvable') ? 404
      : err.message.includes('non actif')   ? 409
      : 500;

    return NextResponse.json({ message: err.message }, { status });
  }
}