import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/server/config/databaseConnect';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { callService } from '@/app/server/services/Call.service';

// ─── POST /api/calls ───────────────────────────────────────────────────────
// Initier un appel audio ou vidéo
// Body : { receiverId, appointmentId, callType }

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req);

    const body = await req.json();
    const { receiverId, appointmentId, callType } = body;

    if (!receiverId || !appointmentId || !callType) {
      return NextResponse.json(
        { message: 'receiverId, appointmentId et callType sont requis.' },
        { status: 400 }
      );
    }

    if (!['audio', 'video'].includes(callType)) {
      return NextResponse.json(
        { message: 'callType doit être "audio" ou "video".' },
        { status: 400 }
      );
    }

    const callSession = await callService.initiateCall({
      callerId:   String(authUser.data._id),
      callerType: authUser.role,
      receiverId,
      appointmentId,
      callType,
    });

    return NextResponse.json(
      {
        message:       'Appel initié.',
        callSessionId: String(callSession._id),
        agora: {
          appId:       callSession.agora.appId,
          channelName: callSession.agora.channelName,
          token:       callSession.agora.callerToken,
          uid:         callSession.agora.callerUid,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    const status =
      err.message === 'Unauthorized'          ? 401
      : err.message.includes('non autorisée') ? 403
      : err.message.includes('introuvable')   ? 404
      : err.message.includes('déjà en cours') ? 409
      : 500;

    return NextResponse.json({ message: err.message }, { status });
  }
}

// ─── GET /api/calls ────────────────────────────────────────────────────────
// Historique des appels de l'utilisateur connecté
// Query : ?page=1&limit=20

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const authUser = await getAuthUser(req);

    const { searchParams } = new URL(req.url);
    const page  = parseInt(searchParams.get('page')  ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const result = await callService.getHistory(
      String(authUser.data._id),
      { page, limit }
    );

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ message: err.message }, { status });
  }
}