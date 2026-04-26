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

// GET /api/chat/rooms/[roomId]/files — tous les fichiers partagés dans la room
export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    const userId = String(authUser.data._id);

    await assertRoomAccess(params.roomId, userId);

    const files = await chatMessageService.getSharedFiles(params.roomId);
    return NextResponse.json({ success: true, data: files });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401
      : message.includes('autorisé') ? 403
      : message === 'Room introuvable.' ? 404
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}