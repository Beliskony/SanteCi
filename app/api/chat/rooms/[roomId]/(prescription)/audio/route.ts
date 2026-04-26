import { NextRequest, NextResponse } from 'next/server';
import { chatMessageService } from '@/app/server/services/chatMessage.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { Appointment } from '@/app/server/models/appointement.model';

const ALLOWED_AUDIO_MIME = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/mp4'];
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_AUDIO_DURATION_SECONDS = 300;  // 5 minutes

async function assertRoomAccess(chatRoomId: string, userId: string): Promise<string> {
  const appointment = await Appointment.findOne({ 'communication.chatRoomId': chatRoomId })
    .select('patientId doctorId');
  if (!appointment) throw new Error('Room introuvable.');

  const isAllowed =
    String(appointment.patientId) === userId ||
    String(appointment.doctorId) === userId;
  if (!isAllowed) throw new Error('Accès non autorisé à cette room.');

  return String(appointment._id);
}

// POST /api/chat/rooms/[roomId]/audio — message vocal
// body JSON: { receiverId, audioUrl, fileName, fileSize, fileMimeType, durationSeconds, appointmentId? }
// Le fichier audio est uploadé côté client (S3, Cloudinary...) avant d'appeler cette route

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    const userId = String(authUser.data._id);

    const appointmentId = await assertRoomAccess(params.roomId, userId);

    const { receiverId, audioUrl, fileName, fileSize, fileMimeType, durationSeconds } = await req.json();

    // Validation champs requis
    if (!receiverId || !audioUrl || !fileName || !fileSize || !fileMimeType) {
      return NextResponse.json(
        { success: false, message: 'receiverId, audioUrl, fileName, fileSize et fileMimeType sont requis.' },
        { status: 400 }
      );
    }

    // Validation MIME audio
    if (!ALLOWED_AUDIO_MIME.includes(fileMimeType)) {
      return NextResponse.json(
        { success: false, message: `Format audio non supporté. Formats acceptés : ${ALLOWED_AUDIO_MIME.join(', ')}.` },
        { status: 415 }
      );
    }

    // Validation taille
    if (fileSize > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { success: false, message: `Audio trop volumineux. Taille max : ${MAX_AUDIO_SIZE / (1024 * 1024)} MB.` },
        { status: 413 }
      );
    }

    // Validation durée
    if (durationSeconds && durationSeconds > MAX_AUDIO_DURATION_SECONDS) {
      return NextResponse.json(
        { success: false, message: `Message vocal trop long. Durée max : ${MAX_AUDIO_DURATION_SECONDS / 60} minutes.` },
        { status: 400 }
      );
    }

    const msg = await chatMessageService.send({
      senderId: userId,
      receiverId,
      chatRoomId: params.roomId,
      messageType: 'audio',
      content: durationSeconds
        ? `Message vocal (${Math.ceil(durationSeconds)}s)`
        : 'Message vocal',
      appointmentId,
      file: {
        url:  audioUrl,
        name: fileName,
        size: fileSize,
        type: fileMimeType,
      },
    });

    return NextResponse.json({ success: true, data: msg }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    const status = message === 'Unauthorized' ? 401
      : message.includes('autorisé') ? 403
      : message === 'Room introuvable.' ? 404
      : message.includes('statut') ? 409
      : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}