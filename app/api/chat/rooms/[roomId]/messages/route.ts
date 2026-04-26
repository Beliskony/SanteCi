import { NextRequest, NextResponse } from 'next/server';
import { chatMessageService } from '@/app/server/services/chatMessage.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { Appointment } from '@/app/server/models/appointement.model';

// ─── Helper : vérifier que l'utilisateur appartient à la room ────────────────

async function assertRoomAccess(chatRoomId: string, userId: string): Promise<void> {
  const appointment = await Appointment.findOne({ 'communication.chatRoomId': chatRoomId })
    .select('patientId doctorId');

  if (!appointment) throw new Error('Room introuvable.');

  const isAllowed =
    String(appointment.patientId) === userId ||
    String(appointment.doctorId) === userId;

  if (!isAllowed) throw new Error('Accès non autorisé à cette room.');
}

// ─── GET /api/chat/rooms/[roomId]/messages ────────────────────────────────────
// Query params: before (date cursor), limit

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    const userId = String(authUser.data._id);

    await assertRoomAccess(params.roomId, userId);

    const { searchParams } = req.nextUrl;
    const before = searchParams.has('before') ? new Date(searchParams.get('before')!) : undefined;
    const limit  = searchParams.has('limit') ? Number(searchParams.get('limit')) : 30;

    const messages = await chatMessageService.getMessages({
      chatRoomId: params.roomId,
      before,
      limit,
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401
      : message.includes('autorisé') ? 403
      : message === 'Room introuvable.' ? 404
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

// ─── POST /api/chat/rooms/[roomId]/messages ───────────────────────────────────
// Envoyer un message texte
// body: { receiverId, content, appointmentId? }

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    const userId = String(authUser.data._id);

    await assertRoomAccess(params.roomId, userId);

    const { receiverId, content, appointmentId } = await req.json();

    if (!receiverId || !content) {
      return NextResponse.json(
        { success: false, message: 'receiverId et content sont requis.' },
        { status: 400 }
      );
    }

    const msg = await chatMessageService.send({
      senderId: userId,
      receiverId,
      chatRoomId: params.roomId,
      messageType: 'text',
      content,
      appointmentId,
    });

    return NextResponse.json({ success: true, data: msg }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401
      : message.includes('autorisé') ? 403
      : message === 'Room introuvable.' ? 404
      : message.includes('statut') || message.includes('Room de chat') ? 409
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}