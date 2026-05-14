export type { IChatMessage } from "@/app/server/interfaces/chatMessage.interface";
import { IChatMessage } from "@/app/server/interfaces/chatMessage.interface";

// ─── Types propres au frontend ────────────────────────────────

export type MessageType =
  | "text"
  | "image"
  | "file"
  | "audio"
  | "video"
  | "prescription";

export interface SendMessagePayload {
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

export interface GetMessagesParams {
  chatRoomId: string;
  before?: string; // ISO date — curseur pour l'infinite scroll
  limit?: number;
}

export interface ConversationSummary {
  chatRoomId: string;
  lastMessage: IChatMessage | null;
  unreadCount: number;
}