import { NextRequest, NextResponse } from 'next/server';
import { chatMessageService } from '@/app/server/services/chatMessage.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// GET /api/chat/conversation — toutes les conversations enrichies de l'utilisateur connecté
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    const userId   = String(authUser.data._id);
    const userRole = authUser.role; // 'doctor' | 'patient'

    const summaries = await chatMessageService.getConversationSummaries(userId, userRole);
    return NextResponse.json({ success: true, data: summaries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status  = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}