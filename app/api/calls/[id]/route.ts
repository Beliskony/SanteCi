import { NextRequest, NextResponse } from 'next/server';
import connectDB  from '@/app/server/config/databaseConnect';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import { callService } from '@/app/server/services/Call.service';

// ─── GET /api/calls/[callSessionId] ───────────────────────────────────────
// Récupérer les détails d'une session d'appel

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ callSessionId: string }> }
) {
  try {
    await connectDB();
    await getAuthUser(req);

    const { callSessionId } = await params;
    const callSession = await callService.getById(callSessionId);

    return NextResponse.json(callSession, { status: 200 });
  } catch (err: any) {
    const status =
      err.message === 'Unauthorized'       ? 401
      : err.message.includes('introuvable') ? 404
      : 500;

    return NextResponse.json({ message: err.message }, { status });
  }
}