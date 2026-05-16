// ============================================================
// services/chatService.ts — Chat & Messagerie
// ============================================================

import * as api from "@/app/frontend/lib/apiClient";
import type { IChatMessage } from "@/app/server/interfaces/chatMessage.interface";

// ─── Types ────────────────────────────────────────────────────

export interface Interlocutor {
  _id:        string;
  name:       string;
  avatar?:    string;
  role:       "doctor" | "patient";
  isOnline:   boolean;
  specialty?: string;
}

export interface ConversationSummary {
  chatRoomId:   string;
  lastMessage:  IChatMessage | null;
  unreadCount:  number;
  interlocutor: Interlocutor;
}

export interface SendTextPayload {
  receiverId:     string;
  content:        string;
  appointmentId?: string;
}

export interface SendMediaPayload {
  receiverId:     string;
  messageType:    "image" | "video" | "file" | "prescription";
  fileUrl:        string;
  fileName:       string;
  fileSize:       number;
  fileMimeType:   string;
  appointmentId?: string;
}

export interface SendAudioPayload {
  receiverId:        string;
  audioUrl:          string;
  fileName:          string;
  fileSize:          number;
  fileMimeType:      string;
  durationSeconds?:  number;
  appointmentId?:    string;
}

export interface GetMessagesParams {
  roomId:  string;
  before?: string;
  limit?:  number;
}

// ─── Service ──────────────────────────────────────────────────

export const chatService = {

  // ── GET /chat/conversation ────────────────────────────────
  async getConversations(): Promise<ConversationSummary[]> {
    const res = await api.get<{ success: boolean; data: ConversationSummary[] }>(
      "/chat/conversation"
    );
    return res.data;
  },

  // ── GET /chat/rooms/[roomId]/messages ─────────────────────
  async getMessages({ roomId, before, limit = 30 }: GetMessagesParams): Promise<IChatMessage[]> {
    const qs = new URLSearchParams();
    if (before) qs.append("before", before);
    qs.append("limit", String(limit));

    const res = await api.get<{ success: boolean; data: IChatMessage[] }>(
      `/chat/rooms/${roomId}/messages?${qs.toString()}`
    );
    return res.data;
  },

  // ── POST /chat/rooms/[roomId]/messages ────────────────────
  async sendText(roomId: string, payload: SendTextPayload): Promise<IChatMessage> {
    const res = await api.post<{ success: boolean; data: IChatMessage }>(
      `/chat/rooms/${roomId}/messages`,
      payload
    );
    return res.data;
  },

  // ── POST /chat/rooms/[roomId]/media ───────────────────────
  async sendMedia(roomId: string, payload: SendMediaPayload): Promise<IChatMessage> {
    const res = await api.post<{ success: boolean; data: IChatMessage }>(
      `/chat/rooms/${roomId}/media`,
      payload
    );
    return res.data;
  },

  // ── POST /chat/rooms/[roomId]/audio ──────────────────────
  async sendAudio(roomId: string, payload: SendAudioPayload): Promise<IChatMessage> {
    const res = await api.post<{ success: boolean; data: IChatMessage }>(
      `/chat/rooms/${roomId}/audio`,
      payload
    );
    return res.data;
  },

  // ── PATCH /chat/rooms/[roomId]/read ──────────────────────
  async markAllRead(roomId: string): Promise<{ updated: number }> {
    const res = await api.patch<{ success: boolean; updated: number }>(
      `/chat/rooms/${roomId}/read`,
      {}
    );
    return { updated: res.updated };
  },

  // ── DELETE /chat/rooms/[roomId]/messages/[messageId] ─────
  async deleteMessage(
    roomId:    string,
    messageId: string,
    scope:     "me" | "everyone" = "me"
  ): Promise<{ message: string }> {
    const res = await api.del<{ success: boolean; message: string }>(
      `/chat/rooms/${roomId}/messages/${messageId}?scope=${scope}`
    );
    return { message: res.message };
  },

  // ── GET /chat/rooms/[roomId]/files ───────────────────────
  async getSharedFiles(roomId: string): Promise<IChatMessage[]> {
    const res = await api.get<{ success: boolean; data: IChatMessage[] }>(
      `/chat/rooms/${roomId}/files`
    );
    return res.data;
  },

  // ── GET /chat/partages/search?roomId=&q= ─────────────────
  async searchMessages(roomId: string, keyword: string): Promise<IChatMessage[]> {
    const res = await api.get<{ success: boolean; data: IChatMessage[] }>(
      `/chat/partages/search?roomId=${roomId}&q=${encodeURIComponent(keyword)}`
    );
    return res.data;
  },
};