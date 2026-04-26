import { NextRequest, NextResponse } from 'next/server';
import { chatMessageService } from '@/app/server/services/chatMessage.service';
import { getAuthUser } from '@/app/server/middleware/auth.middleware';
import connectDB from '@/app/server/config/databaseConnect';
import { Appointment } from '@/app/server/models/appointement.model';

type MessageType = 'image' | 'video' | 'file' | 'prescription';

// Types MIME autorisés par catégorie
const ALLOWED_MIME: Record<MessageType, string[]> = {
  image:        ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video:        ['video/mp4', 'video/webm', 'video/quicktime'],
  file:         ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  prescription: ['application/pdf', 'image/jpeg', 'image/png'],
};

// Taille max par type (en octets)
const MAX_SIZE: Record<MessageType, number> = {
  image:        5 * 1024 * 1024,   // 5 MB
  video:        50 * 1024 * 1024,  // 50 MB
  file:         10 * 1024 * 1024,  // 10 MB
  prescription: 5 * 1024 * 1024,   // 5 MB
};

async function assertRoomAccess(chatRoomId: string, userId: string): Promise<string> {
  const appointment = await Appointment.findOne({ 'communication.chatRoomId': chatRoomId })
    .select('patientId doctorId');
  if (!appointment) throw new Error('Room introuvable.');

  const isAllowed =
    String(appointment.patientId) === userId ||
    String(appointment.doctorId) === userId;
  if (!isAllowed) throw new Error('Accès non autorisé à cette room.');

  // Retourne l'appointmentId pour le passer au service
  return String(appointment._id);
}

// POST /api/chat/rooms/[roomId]/media
// multipart/form-data: file, receiverId, messageType (image|video|file|prescription), appointmentId?
// Note : le stockage réel du fichier (S3, Cloudinary, etc.) est géré en amont côté client
// Cette route attend une URL déjà uploadée — body JSON: { receiverId, messageType, fileUrl, fileName, fileSize, fileMimeType, appointmentId? }

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    await connectDB();

    const authUser = await getAuthUser(req);
    const userId = String(authUser.data._id);

    const appointmentId = await assertRoomAccess(params.roomId, userId);

    const body = await req.json();
    const { receiverId, messageType, fileUrl, fileName, fileSize, fileMimeType } = body;

    // Validation champs requis
    if (!receiverId || !messageType || !fileUrl || !fileName || !fileSize || !fileMimeType) {
      return NextResponse.json(
        { success: false, message: 'receiverId, messageType, fileUrl, fileName, fileSize et fileMimeType sont requis.' },
        { status: 400 }
      );
    }

    // Validation messageType
    const validTypes: MessageType[] = ['image', 'video', 'file', 'prescription'];
    if (!validTypes.includes(messageType)) {
      return NextResponse.json(
        { success: false, message: `messageType invalide. Valeurs acceptées : ${validTypes.join(', ')}.` },
        { status: 400 }
      );
    }

    // Validation MIME type
    if (!ALLOWED_MIME[messageType as MessageType].includes(fileMimeType)) {
      return NextResponse.json(
        { success: false, message: `Type de fichier non autorisé pour "${messageType}". Types acceptés : ${ALLOWED_MIME[messageType as MessageType].join(', ')}.` },
        { status: 415 }
      );
    }

    // Validation taille
    if (fileSize > MAX_SIZE[messageType as MessageType]) {
      const maxMB = MAX_SIZE[messageType as MessageType] / (1024 * 1024);
      return NextResponse.json(
        { success: false, message: `Fichier trop volumineux. Taille max pour "${messageType}" : ${maxMB} MB.` },
        { status: 413 }
      );
    }

    const msg = await chatMessageService.send({
      senderId: userId,
      receiverId,
      chatRoomId: params.roomId,
      messageType: messageType as MessageType,
      content: fileName, // Le nom du fichier comme contenu textuel
      appointmentId,
      file: {
        url:  fileUrl,
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