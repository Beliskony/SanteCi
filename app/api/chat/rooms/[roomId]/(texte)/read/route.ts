import { NextRequest, NextResponse } from 'next/server';
import { chatMessageService } from '@/app/server/services/chatMessage.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { Appointment } from '@/app/server/models/appointement.model';

async function assertRoomAccess(chatRoomId: string, userId: string): Promise<void> {
  const appointment = await Appointment.findOne({ 'communication.chatRoomId': chatRoomId })
    .select('patientId doctorId');
  if (!appointment) throw new Error('Room introuvable.');

  const isAllowed =
    String(appointment.patientId) === userId ||
    String(appointment.doctorId) === userId;
  if (!isAllowed) throw new Error('Accès non autorisé à cette room.');
}

// PATCH /api/chat/rooms/[roomId]/read — marquer tous les messages de la room comme lus
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
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

    const { roomId } = await params;
    const userId = String(authUser.data._id);

    await assertRoomAccess(roomId, userId);

    const result = await chatMessageService.markAllRead(roomId, userId);
    
    return NextResponse.json({ success: true, ...result });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401
      : message.includes('autorisé') ? 403
      : message === 'Room introuvable.' ? 404
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}