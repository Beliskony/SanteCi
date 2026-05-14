// ============================================================
// services/chatService.ts — Messages chat
// Miroir exact du ChatMessageService backend
// ============================================================

import * as api from "@/app/frontend/lib/apiClient";
import type {
  IChatMessage,
  SendMessagePayload,
  GetMessagesParams,
  ConversationSummary,
} from "@/app/frontend/types/Chat";
import type { ApiResponse } from "@/app/frontend/types";

export const chatService = {

  // ── Envoyer un message ─────────────────────────────────────

  /**
   * Envoyer un message texte, image, fichier, audio, vidéo ou ordonnance
   * → send() du backend
   *
   * Si messageType !== "text", le champ `file` est obligatoire
   * Si appointmentId fourni, le chatRoomId doit correspondre
   *     au rendez-vous (vérifié côté serveur)
   */
  async send(payload: SendMessagePayload): Promise<IChatMessage> {
    const res = await api.post<ApiResponse<IChatMessage>>(
      "/api/chat/messages",
      payload
    );
    return res.data;
  },

  /**
   * Envoyer un fichier (image, audio, document...)
   * Upload multipart puis appel send() avec le file retourné
   */
  async sendFile(
    file: File,
    meta: Omit<SendMessagePayload, "content" | "file">
  ): Promise<IChatMessage> {
    // 1. Upload du fichier
    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await api.uploadFile<ApiResponse<{
      url: string;
      name: string;
      size: number;
      type: string;
    }>>("/api/chat/upload", formData);

    // 2. Envoi du message avec les infos du fichier
    return chatService.send({
      ...meta,
      content: uploadRes.data.name, // contenu = nom du fichier
      file: uploadRes.data,
    });
  },

  // ── Lire les messages ──────────────────────────────────────

  /**
   * Messages d'une room — pagination par curseur (infinite scroll)
   * → getMessages() du backend
   *
   * Utilisation :
   *   1er appel  : getMessages({ chatRoomId })
   *   Page suiv. : getMessages({ chatRoomId, before: messages[last].metadata.createdAt })
   */
  async getMessages(params: GetMessagesParams): Promise<IChatMessage[]> {
    const qs = new URLSearchParams();
    qs.append("chatRoomId", params.chatRoomId);
    if (params.before) qs.append("before", params.before);
    if (params.limit)  qs.append("limit",  String(params.limit));

    const res = await api.get<ApiResponse<IChatMessage[]>>(
      `/api/chat/messages?${qs.toString()}`
    );
    return res.data;
  },

  /**
   * Dernier message d'une room
   * → getLastMessage() du backend
   */
  async getLastMessage(chatRoomId: string): Promise<IChatMessage | null> {
    const res = await api.get<ApiResponse<IChatMessage | null>>(
      `/api/chat/messages/last?chatRoomId=${chatRoomId}`
    );
    return res.data;
  },

  /**
   * Résumé de toutes les conversations de l'utilisateur connecté
   * → getConversationSummaries() du backend
   */
  async getConversations(): Promise<ConversationSummary[]> {
    const res = await api.get<ApiResponse<ConversationSummary[]>>(
      "/api/chat/conversations"
    );
    return res.data;
  },

  // ── Statuts de lecture ─────────────────────────────────────

  /**
   * Marquer un message comme délivré
   * → markDelivered() du backend
   */
  async markDelivered(messageId: string): Promise<IChatMessage> {
    const res = await api.patch<ApiResponse<IChatMessage>>(
      `/api/chat/messages/${messageId}/delivered`,
      {}
    );
    return res.data;
  },

  /**
   * Marquer un message comme lu (receiverId validé côté serveur)
   * → markRead() du backend
   */
  async markRead(messageId: string, receiverId: string): Promise<IChatMessage> {
    const res = await api.patch<ApiResponse<IChatMessage>>(
      `/api/chat/messages/${messageId}/read`,
      { receiverId }
    );
    return res.data;
  },

  /**
   * Marquer tous les messages d'une room comme lus
   * → markAllRead() du backend
   */
  async markAllRead(
    chatRoomId: string,
    receiverId: string
  ): Promise<{ updated: number }> {
    const res = await api.patch<ApiResponse<{ updated: number }>>(
      "/api/chat/messages/read-all",
      { chatRoomId, receiverId }
    );
    return res.data;
  },

  /**
   * Nombre de messages non lus dans une room
   * → getUnreadCount() du backend
   */
  async getUnreadCount(
    chatRoomId: string,
    receiverId: string
  ): Promise<number> {
    const res = await api.get<ApiResponse<{ count: number }>>(
      `/api/chat/messages/unread?chatRoomId=${chatRoomId}&receiverId=${receiverId}`
    );
    return res.data.count;
  },

  // ── Suppression ────────────────────────────────────────────

  /**
   * Supprimer pour moi uniquement (soft delete — deletedFor[])
   * → deleteForMe() du backend
   */
  async deleteForMe(
    messageId: string,
    userId: string
  ): Promise<{ message: string }> {
    const res = await api.patch<ApiResponse<{ message: string }>>(
      `/api/chat/messages/${messageId}/delete-for-me`,
      { userId }
    );
    return res.data;
  },

  /**
   * Supprimer pour tout le monde (expéditeur seulement, dans les 5 min)
   * → deleteForEveryone() du backend
   */
  async deleteForEveryone(
    messageId: string,
    senderId: string
  ): Promise<{ message: string }> {
    const res = await api.del<ApiResponse<{ message: string }>>(
      `/api/chat/messages/${messageId}?senderId=${senderId}`
    );
    return res.data;
  },

  // ── Recherche & fichiers ───────────────────────────────────

  /**
   * Rechercher dans les messages texte d'une room
   * → searchInRoom() du backend
   */
  async searchInRoom(
    chatRoomId: string,
    keyword: string
  ): Promise<IChatMessage[]> {
    const res = await api.get<ApiResponse<IChatMessage[]>>(
      `/api/chat/messages/search?chatRoomId=${chatRoomId}&keyword=${encodeURIComponent(keyword)}`
    );
    return res.data;
  },

  /**
   * Fichiers partagés dans une room (images, docs, audio, ordonnances...)
   * → getSharedFiles() du backend
   */
  async getSharedFiles(chatRoomId: string): Promise<IChatMessage[]> {
    const res = await api.get<ApiResponse<IChatMessage[]>>(
      `/api/chat/messages/files?chatRoomId=${chatRoomId}`
    );
    return res.data;
  },

  /**
   * Nombre total de messages dans une room
   * → countMessages() du backend
   */
  async countMessages(chatRoomId: string): Promise<number> {
    const res = await api.get<ApiResponse<{ count: number }>>(
      `/api/chat/messages/count?chatRoomId=${chatRoomId}`
    );
    return res.data.count;
  },
};