// ============================================================
// store/chatStore.ts — État global Chat
// ============================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { chatService } from "@/app/frontend/services/chatService";
import type { IChatMessage, SendMessagePayload, ConversationSummary } from "@/app/frontend/types/Chat";

// ─── Type "plain object" du message ──────────────────────────
// IChatMessage étend Document (Mongoose) qui contient des méthodes
// internes ($save, $clone...) incompatibles avec un store Zustand.
// On extrait uniquement les données sérialisables.
export type ChatMessageData = {
  _id: string;
  senderId: string;
  receiverId: string;
  appointmentId?: string;
  chatRoomId: string;
  messageType: IChatMessage["messageType"];
  content: string;
  file?: IChatMessage["file"];
  status: {
    delivered: boolean;
    deliveredAt?: Date;
    read: boolean;
    readAt?: Date;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    deletedFor?: string[];
  };
};

// Conversion IChatMessage (Mongoose Document) → ChatMessageData (plain object)
function toPlain(msg: IChatMessage): ChatMessageData {
  return {
    _id:           String(msg._id),
    senderId:      String(msg.senderId),
    receiverId:    String(msg.receiverId),
    appointmentId: msg.appointmentId ? String(msg.appointmentId) : undefined,
    chatRoomId:    msg.chatRoomId,
    messageType:   msg.messageType,
    content:       msg.content,
    file:          msg.file,
    status: {
      delivered:   msg.status.delivered,
      deliveredAt: msg.status.deliveredAt,
      read:        msg.status.read,
      readAt:      msg.status.readAt,
    },
    metadata: {
      createdAt:  msg.metadata.createdAt,
      updatedAt:  msg.metadata.updatedAt,
      deletedFor: msg.metadata.deletedFor?.map(String),
    },
  };
}

// ConversationSummary avec lastMessage en plain object
type PlainConversationSummary = Omit<ConversationSummary, "lastMessage"> & {
  lastMessage: ChatMessageData | null;
};

// ─── State ────────────────────────────────────────────────────

interface ChatState {
  conversations: PlainConversationSummary[];
  messages: ChatMessageData[];
  activeChatRoomId: string | null;
  hasMore: boolean;
  totalUnread: number;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  fetchConversations: () => Promise<void>;
  openRoom: (chatRoomId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (payload: SendMessagePayload) => Promise<void>;
  sendFile: (file: File, meta: Omit<SendMessagePayload, "content" | "file">) => Promise<void>;
  markRoomAsRead: (chatRoomId: string, receiverId: string) => Promise<void>;
  deleteForMe: (messageId: string, userId: string) => Promise<void>;
  deleteForEveryone: (messageId: string, senderId: string) => Promise<void>;
  searchMessages: (keyword: string) => Promise<ChatMessageData[]>;
  getSharedFiles: (chatRoomId: string) => Promise<ChatMessageData[]>;
  receiveMessage: (message: IChatMessage) => void;
  clearRoom: () => void;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      conversations: [],
      messages: [],
      activeChatRoomId: null,
      hasMore: true,
      totalUnread: 0,
      isLoading: false,
      isSending: false,
      error: null,

      // ── Conversations ──────────────────────────────────────
      fetchConversations: async () => {
        set({ isLoading: true, error: null });
        try {
          const raw = await chatService.getConversations();
          const conversations: PlainConversationSummary[] = raw.map((c) => ({
            chatRoomId:  c.chatRoomId,
            unreadCount: c.unreadCount,
            lastMessage: c.lastMessage ? toPlain(c.lastMessage) : null,
          }));
          const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
          set({ conversations, totalUnread, isLoading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur de chargement", isLoading: false });
        }
      },

      // ── Ouvrir une room ────────────────────────────────────
      openRoom: async (chatRoomId) => {
        set({ isLoading: true, error: null, activeChatRoomId: chatRoomId, messages: [], hasMore: true });
        try {
          const raw = await chatService.getMessages({ chatRoomId, limit: 30 });
          set({
            messages: raw.map(toPlain),
            hasMore: raw.length === 30,
            isLoading: false,
          });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur de chargement", isLoading: false });
        }
      },

      // ── Infinite scroll ────────────────────────────────────
      loadMoreMessages: async () => {
        const { activeChatRoomId, messages, hasMore, isLoading } = get();
        if (!activeChatRoomId || !hasMore || isLoading) return;

        set({ isLoading: true });
        try {
          const oldest = messages[messages.length - 1];
          const before = oldest
            ? new Date(oldest.metadata.createdAt).toISOString()
            : undefined;

          const raw = await chatService.getMessages({ chatRoomId: activeChatRoomId, before, limit: 30 });
          set((state) => ({
            messages: [...state.messages, ...raw.map(toPlain)],
            hasMore: raw.length === 30,
            isLoading: false,
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur de chargement", isLoading: false });
        }
      },

      // ── Envoyer texte ──────────────────────────────────────
      sendMessage: async (payload) => {
        set({ isSending: true, error: null });
        try {
          const msg = await chatService.send(payload);
          set((state) => ({ messages: [toPlain(msg), ...state.messages], isSending: false }));
          get().fetchConversations();
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur d'envoi", isSending: false });
          throw err;
        }
      },

      // ── Envoyer fichier ────────────────────────────────────
      sendFile: async (file, meta) => {
        set({ isSending: true, error: null });
        try {
          const msg = await chatService.sendFile(file, meta);
          set((state) => ({ messages: [toPlain(msg), ...state.messages], isSending: false }));
          get().fetchConversations();
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur d'envoi du fichier", isSending: false });
          throw err;
        }
      },

      // ── Marquer room comme lue ─────────────────────────────
      markRoomAsRead: async (chatRoomId, receiverId) => {
        try {
          await chatService.markAllRead(chatRoomId, receiverId);
          set((state) => ({
            // String(m.receiverId) car les IDs sont déjà des strings dans ChatMessageData
            messages: state.messages.map((m) =>
              m.receiverId === receiverId
                ? { ...m, status: { ...m.status, read: true } }
                : m
            ),
            conversations: state.conversations.map((c) =>
              c.chatRoomId === chatRoomId ? { ...c, unreadCount: 0 } : c
            ),
            totalUnread: Math.max(
              0,
              state.totalUnread -
                (state.conversations.find((c) => c.chatRoomId === chatRoomId)?.unreadCount ?? 0)
            ),
          }));
        } catch {
          // silencieux — non bloquant
        }
      },

      // ── Supprimer pour moi ─────────────────────────────────
      deleteForMe: async (messageId, userId) => {
        try {
          await chatService.deleteForMe(messageId, userId);
          set((state) => ({
            messages: state.messages.filter((m) => m._id !== messageId),
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur de suppression" });
          throw err;
        }
      },

      // ── Supprimer pour tout le monde ───────────────────────
      deleteForEveryone: async (messageId, senderId) => {
        try {
          await chatService.deleteForEveryone(messageId, senderId);
          set((state) => ({
            messages: state.messages.filter((m) => m._id !== messageId),
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur de suppression" });
          throw err;
        }
      },

      // ── Recherche ──────────────────────────────────────────
      searchMessages: async (keyword) => {
        const { activeChatRoomId } = get();
        if (!activeChatRoomId) return [];
        const raw = await chatService.searchInRoom(activeChatRoomId, keyword);
        return raw.map(toPlain);
      },

      // ── Fichiers partagés ──────────────────────────────────
      getSharedFiles: async (chatRoomId) => {
        const raw = await chatService.getSharedFiles(chatRoomId);
        return raw.map(toPlain);
      },

      // ── WebSocket — réception temps réel ───────────────────
      // socket.on("new_message", (msg) => useChatStore.getState().receiveMessage(msg))
      receiveMessage: (message) => {
        const plain = toPlain(message);
        const { activeChatRoomId } = get();

        set((state) => {
          const updatedMessages =
            plain.chatRoomId === activeChatRoomId
              ? [plain, ...state.messages]
              : state.messages;

          const updatedConversations = state.conversations.map((c) =>
            c.chatRoomId === plain.chatRoomId
              ? {
                  ...c,
                  lastMessage: plain,
                  unreadCount:
                    plain.chatRoomId !== activeChatRoomId
                      ? c.unreadCount + 1
                      : c.unreadCount,
                }
              : c
          );

          return {
            messages: updatedMessages,
            conversations: updatedConversations,
            totalUnread: updatedConversations.reduce((sum, c) => sum + c.unreadCount, 0),
          };
        });
      },

      clearRoom: () => set({ messages: [], activeChatRoomId: null, hasMore: true }),
      clearError: () => set({ error: null }),
    }),
    { name: "ChatStore" }
  )
);