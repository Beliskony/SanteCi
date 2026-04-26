import { Types, QueryFilter } from 'mongoose';
import { ChatMessage } from '../models/chatMessage.model';
import { Appointment } from '../models/appointement.model';
import { IChatMessage } from '../interfaces/chatMessage.interface';

// ─── Types ───────────────────────────────────────────────────────────────────

type MessageType = 'text' | 'image' | 'file' | 'audio' | 'video' | 'prescription';
type SenderRole = 'patient' | 'doctor';

interface SendMessageDTO {
  senderId: string;
  receiverId: string;
  chatRoomId: string;
  messageType: MessageType;
  content: string;
  appointmentId?: string;
  file?: {
    url: string;
    name: string;
    size: number;
    type: string;
  };
}

interface MessageFilters {
  chatRoomId: string;
  before?: Date;
  limit?: number;
}

// ─── ChatMessage Service ──────────────────────────────────────────────────────

class ChatMessageService {

  // ── Send message ───────────────────────────────────────────────────────────

  async send(dto: SendMessageDTO): Promise<IChatMessage> {
    // Si appointmentId fourni, vérifier que la room correspond bien
    if (dto.appointmentId) {
      const appointment = await Appointment.findById(dto.appointmentId).select('communication.chatRoomId status.current');
      if (!appointment) throw new Error('Rendez-vous introuvable.');

      if (appointment.communication.chatRoomId !== dto.chatRoomId) {
        throw new Error('Room de chat invalide pour ce rendez-vous.');
      }

      const allowedStatuses = ['confirmed', 'ongoing'];
      if (!allowedStatuses.includes(appointment.status.current)) {
        throw new Error('Les messages ne sont autorisés que pour les rendez-vous confirmés ou en cours.');
      }
    }

    // Validation : fichier requis si type non-text
    if (['image', 'file', 'audio', 'video'].includes(dto.messageType) && !dto.file) {
      throw new Error(`Un fichier est requis pour le type de message "${dto.messageType}".`);
    }

    const message = await ChatMessage.create({
      senderId: new Types.ObjectId(dto.senderId),
      receiverId: new Types.ObjectId(dto.receiverId),
      appointmentId: dto.appointmentId ? new Types.ObjectId(dto.appointmentId) : undefined,
      chatRoomId: dto.chatRoomId,
      messageType: dto.messageType,
      content: dto.content,
      file: dto.file,
      status: {
        delivered: false,
        read: false,
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedFor: [],
      },
    });

    return message;
  }

  // ── Get messages for a room (pagination curseur) ───────────────────────────

  async getMessages(filters: MessageFilters): Promise<IChatMessage[]> {
    const { chatRoomId, before, limit = 30 } = filters;

    const query: QueryFilter<IChatMessage> = { chatRoomId };

    // Pagination par curseur : messages avant une date donnée (infinite scroll)
    if (before) {
      query['metadata.createdAt'] = { $lt: before };
    }

    return ChatMessage.find(query)
      .sort({ 'metadata.createdAt': -1 })
      .limit(limit)
      .lean();
  }

  // ── Mark as delivered ──────────────────────────────────────────────────────

  async markDelivered(messageId: string): Promise<IChatMessage> {
    const message = await ChatMessage.findByIdAndUpdate(
      messageId,
      {
        $set: {
          'status.delivered': true,
          'status.deliveredAt': new Date(),
          'metadata.updatedAt': new Date(),
        },
      },
      { new: true }
    );

    if (!message) throw new Error('Message introuvable.');
    return message;
  }

  // ── Mark as read ───────────────────────────────────────────────────────────

  async markRead(messageId: string, receiverId: string): Promise<IChatMessage> {
    const message = await ChatMessage.findById(messageId);
    if (!message) throw new Error('Message introuvable.');

    if (String(message.receiverId) !== receiverId) {
      throw new Error('Action non autorisée : vous n\'êtes pas le destinataire.');
    }

    message.status.read = true;
    message.status.readAt = new Date();
    message.metadata.updatedAt = new Date();
    await message.save();

    return message;
  }

  // ── Mark all messages in a room as read ────────────────────────────────────

  async markAllRead(chatRoomId: string, receiverId: string): Promise<{ updated: number }> {
    const result = await ChatMessage.updateMany(
      {
        chatRoomId,
        receiverId: new Types.ObjectId(receiverId),
        'status.read': false,
      },
      {
        $set: {
          'status.read': true,
          'status.readAt': new Date(),
          'status.delivered': true,
          'status.deliveredAt': new Date(),
          'metadata.updatedAt': new Date(),
        },
      }
    );

    return { updated: result.modifiedCount };
  }

  // ── Soft delete for user ───────────────────────────────────────────────────

  async deleteForMe(messageId: string, userId: string): Promise<{ message: string }> {
    const msg = await ChatMessage.findById(messageId);
    if (!msg) throw new Error('Message introuvable.');

    const alreadyDeleted = msg.metadata.deletedFor?.some(
      (id) => String(id) === userId
    );
    if (alreadyDeleted) return { message: 'Message déjà supprimé.' };

    await ChatMessage.findByIdAndUpdate(messageId, {
      $push: { 'metadata.deletedFor': new Types.ObjectId(userId) },
      $set: { 'metadata.updatedAt': new Date() },
    });

    return { message: 'Message supprimé pour vous.' };
  }

  // ── Delete for everyone (expéditeur seulement, dans les 5 min) ────────────

  async deleteForEveryone(messageId: string, senderId: string): Promise<{ message: string }> {
    const msg = await ChatMessage.findById(messageId);
    if (!msg) throw new Error('Message introuvable.');

    if (String(msg.senderId) !== senderId) {
      throw new Error('Seul l\'expéditeur peut supprimer un message pour tout le monde.');
    }

    const fiveMinutes = 5 * 60 * 1000;
    const elapsed = Date.now() - msg.metadata.createdAt.getTime();
    if (elapsed > fiveMinutes) {
      throw new Error('Vous ne pouvez plus supprimer ce message (délai de 5 minutes dépassé).');
    }

    await ChatMessage.findByIdAndDelete(messageId);
    return { message: 'Message supprimé pour tout le monde.' };
  }

  // ── Get unread count for a user in a room ─────────────────────────────────

  async getUnreadCount(chatRoomId: string, receiverId: string): Promise<number> {
    return ChatMessage.countDocuments({
      chatRoomId,
      receiverId: new Types.ObjectId(receiverId),
      'status.read': false,
    });
  }

  // ── Get last message of a room (pour liste de conversations) ──────────────

  async getLastMessage(chatRoomId: string): Promise<IChatMessage | null> {
    return ChatMessage.findOne({ chatRoomId })
      .sort({ 'metadata.createdAt': -1 })
      .lean();
  }

  // ── Get conversation summary for all rooms of a user ──────────────────────

  async getConversationSummaries(userId: string): Promise<Array<{
    chatRoomId: string;
    lastMessage: IChatMessage | null;
    unreadCount: number;
  }>> {
    // Récupérer toutes les rooms où l'utilisateur est impliqué
    const rooms = await ChatMessage.distinct('chatRoomId', {
      $or: [
        { senderId: new Types.ObjectId(userId) },
        { receiverId: new Types.ObjectId(userId) },
      ],
    });

    const summaries = await Promise.all(
      rooms.map(async (chatRoomId) => {
        const [lastMessage, unreadCount] = await Promise.all([
          this.getLastMessage(chatRoomId),
          this.getUnreadCount(chatRoomId, userId),
        ]);
        return { chatRoomId, lastMessage, unreadCount };
      })
    );

    // Trier par date du dernier message (plus récent en premier)
    return summaries.sort((a, b) => {
      const dateA = a.lastMessage?.metadata.createdAt?.getTime() ?? 0;
      const dateB = b.lastMessage?.metadata.createdAt?.getTime() ?? 0;
      return dateB - dateA;
    });
  }

  // ── Search messages in a room ──────────────────────────────────────────────

  async searchInRoom(chatRoomId: string, keyword: string): Promise<IChatMessage[]> {
    return ChatMessage.find({
      chatRoomId,
      messageType: 'text',
      content: { $regex: keyword, $options: 'i' },
    })
      .sort({ 'metadata.createdAt': -1 })
      .limit(20)
      .lean();
  }

  // ── Get shared files in a room ─────────────────────────────────────────────

  async getSharedFiles(chatRoomId: string): Promise<IChatMessage[]> {
    return ChatMessage.find({
      chatRoomId,
      messageType: { $in: ['image', 'file', 'audio', 'video', 'prescription'] },
    })
      .sort({ 'metadata.createdAt': -1 })
      .lean();
  }

  // ── Count total messages in a room ─────────────────────────────────────────

  async countMessages(chatRoomId: string): Promise<number> {
    return ChatMessage.countDocuments({ chatRoomId });
  }
}

export const chatMessageService = new ChatMessageService();