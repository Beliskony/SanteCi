import { NextRequest, NextResponse } from 'next/server';
import { chatMessageService } from '@/app/server/services/chatMessage.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';

// DELETE /api/chat/messages/[messageId]?scope=me|everyone
// scope=me       → soft delete pour l'utilisateur connecté uniquement
// scope=everyone → suppression pour tout le monde (expéditeur seulement, dans les 5 min)

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    
    if (!authUser || !authUser.data?._id) {
      return NextResponse.json(
        { success: false, message: 'Non authentifié.' },
        { status: 401 }
      );
    }

    const { messageId } = await params;
    const userId = String(authUser.data._id);

    const scope = req.nextUrl.searchParams.get('scope') ?? 'me';

    if (scope !== 'me' && scope !== 'everyone') {
      return NextResponse.json(
        { success: false, message: 'scope invalide. Valeurs acceptées : "me" ou "everyone".' },
        { status: 400 }
      );
    }

    const result = scope === 'everyone'
      ? await chatMessageService.deleteForEveryone(messageId, userId)
      : await chatMessageService.deleteForMe(messageId, userId);

    return NextResponse.json({ success: true, ...result });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401
      : message.includes('expéditeur') || message.includes('5 minutes') ? 403
      : message === 'Message introuvable.' ? 404
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}