// ============================================================
// store/chatStore.ts — État global Chat
// ============================================================

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  chatService,
  type ConversationSummary,
  type Interlocutor,
  type SendTextPayload,
  type SendMediaPayload,
  type SendAudioPayload,
} from "@/app/frontend/services/chatService";
import type { IChatMessage } from "@/app/server/interfaces/chatMessage.interface";

// ─── Plain object sérialisable ────────────────────────────────

export type ChatMessageData = {
  _id:            string;
  senderId:       string;
  receiverId:     string;
  appointmentId?: string;
  chatRoomId:     string;
  messageType:    IChatMessage["messageType"];
  content:        string;
  file?:          IChatMessage["file"];
  status: {
    delivered:    boolean;
    deliveredAt?: Date;
    read:         boolean;
    readAt?:      Date;
  };
  metadata: {
    createdAt:   Date;
    updatedAt:   Date;
    deletedFor?: string[];
  };
};

function toPlain(msg: IChatMessage): ChatMessageData {
  return {
    _id:            String(msg._id),
    senderId:       String(msg.senderId),
    receiverId:     String(msg.receiverId),
    appointmentId:  msg.appointmentId ? String(msg.appointmentId) : undefined,
    chatRoomId:     msg.chatRoomId,
    messageType:    msg.messageType,
    content:        msg.content,
    file:           msg.file,
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

// ConversationSummary avec lastMessage sérialisé + interlocuteur enrichi
export type PlainConversationSummary = {
  chatRoomId:   string;
  unreadCount:  number;
  lastMessage:  ChatMessageData | null;
  interlocutor: Interlocutor;
};

// ─── State ────────────────────────────────────────────────────

interface ChatState {
  conversations:    PlainConversationSummary[];
  messages:         ChatMessageData[];
  activeChatRoomId: string | null;
  activeInterlocutor: Interlocutor | null;
  sharedFiles:      ChatMessageData[];
  searchResults:    ChatMessageData[];
  hasMore:          boolean;
  totalUnread:      number;
  isLoading:        boolean;
  isSending:        boolean;
  error:            string | null;

  // ── Conversations ──────────────────────────────────────────
  fetchConversations: () => Promise<void>;

  // ── Room ──────────────────────────────────────────────────
  openRoom:         (roomId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  markRoomAsRead:   (roomId: string) => Promise<void>;
  closeRoom:        () => void;

  // ── Envoi ─────────────────────────────────────────────────
  sendText:  (roomId: string, payload: SendTextPayload)  => Promise<void>;
  sendMedia: (roomId: string, payload: SendMediaPayload) => Promise<void>;
  sendAudio: (roomId: string, payload: SendAudioPayload) => Promise<void>;

  // ── Suppression ───────────────────────────────────────────
  deleteMessage: (roomId: string, messageId: string, scope?: "me" | "everyone") => Promise<void>;

  // ── Fichiers & recherche ──────────────────────────────────
  fetchSharedFiles:   (roomId: string) => Promise<void>;
  searchMessages:     (roomId: string, keyword: string) => Promise<void>;
  clearSearchResults: () => void;

  // ── WebSocket ─────────────────────────────────────────────
  receiveMessage:       (message: IChatMessage) => void;
  setInterlocutorOnline:(interlocutorId: string, isOnline: boolean) => void;

  // ── Utilitaires ───────────────────────────────────────────
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      conversations:      [],
      messages:           [],
      activeChatRoomId:   null,
      activeInterlocutor: null,
      sharedFiles:        [],
      searchResults:      [],
      hasMore:            true,
      totalUnread:        0,
      isLoading:          false,
      isSending:          false,
      error:              null,

      // ── fetchConversations ─────────────────────────────────
      fetchConversations: async () => {
        set({ isLoading: true, error: null });
        try {
          const raw = await chatService.getConversations();
          const conversations: PlainConversationSummary[] = raw.map((c) => ({
            chatRoomId:   c.chatRoomId,
            unreadCount:  c.unreadCount,
            lastMessage:  c.lastMessage ? toPlain(c.lastMessage) : null,
            interlocutor: c.interlocutor,
          }));
          const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
          set({ conversations, totalUnread, isLoading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur de chargement", isLoading: false });
        }
      },

      // ── openRoom ──────────────────────────────────────────
      openRoom: async (roomId) => {
        set({ isLoading: true, error: null, activeChatRoomId: roomId, messages: [], hasMore: true });
        try {
          // Récupérer l'interlocuteur depuis la conversation déjà chargée
          const conv = get().conversations.find((c) => c.chatRoomId === roomId);
          const activeInterlocutor = conv?.interlocutor ?? null;

          const raw = await chatService.getMessages({ roomId, limit: 30 });
          set({
            messages:           raw.map(toPlain),
            activeInterlocutor,
            hasMore:            raw.length === 30,
            isLoading:          false,
          });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur de chargement", isLoading: false });
        }
      },

      // ── loadMoreMessages ───────────────────────────────────
      loadMoreMessages: async () => {
        const { activeChatRoomId, messages, hasMore, isLoading } = get();
        if (!activeChatRoomId || !hasMore || isLoading) return;

        set({ isLoading: true });
        try {
          const oldest = messages[messages.length - 1];
          const before = oldest
            ? new Date(oldest.metadata.createdAt).toISOString()
            : undefined;

          const raw = await chatService.getMessages({ roomId: activeChatRoomId, before, limit: 30 });
          set((state) => ({
            messages:  [...state.messages, ...raw.map(toPlain)],
            hasMore:   raw.length === 30,
            isLoading: false,
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur de chargement", isLoading: false });
        }
      },

      // ── markRoomAsRead ─────────────────────────────────────
      markRoomAsRead: async (roomId) => {
        try {
          await chatService.markAllRead(roomId);
          set((state) => ({
            messages: state.messages.map((m) =>
              m.chatRoomId === roomId
                ? { ...m, status: { ...m.status, read: true } }
                : m
            ),
            conversations: state.conversations.map((c) =>
              c.chatRoomId === roomId ? { ...c, unreadCount: 0 } : c
            ),
            totalUnread: Math.max(
              0,
              state.totalUnread -
                (state.conversations.find((c) => c.chatRoomId === roomId)?.unreadCount ?? 0)
            ),
          }));
        } catch {
          // silencieux — non bloquant
        }
      },

      // ── closeRoom ─────────────────────────────────────────
      closeRoom: () => set({
        messages:           [],
        activeChatRoomId:   null,
        activeInterlocutor: null,
        hasMore:            true,
        sharedFiles:        [],
        searchResults:      [],
      }),

      // ── sendText ──────────────────────────────────────────
      sendText: async (roomId, payload) => {
        set({ isSending: true, error: null });
          try {
            const msg = await chatService.sendText(roomId, payload);
            const plainMsg = toPlain(msg);
    
          set((state) => {
            // Met à jour les messages
            const newMessages = [plainMsg, ...state.messages];
      
            // Met à jour la conversation localement
            const updatedConversations = state.conversations.map(c =>
              c.chatRoomId === roomId
                ? { ...c, lastMessage: plainMsg, unreadCount: 0 }
                : c
            );
      
          return {
            messages: newMessages,
            conversations: updatedConversations,
            isSending: false
          };
        });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Erreur d'envoi", isSending: false });
      throw err;
      }
    },

      // ── sendMedia ─────────────────────────────────────────
      sendMedia: async (roomId, payload) => {
        set({ isSending: true, error: null });
        try {
          const msg = await chatService.sendMedia(roomId, payload);
          set((state) => ({ messages: [toPlain(msg), ...state.messages], isSending: false }));
          get().fetchConversations();
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur d'envoi du fichier", isSending: false });
          throw err;
        }
      },

      // ── sendAudio ─────────────────────────────────────────
      sendAudio: async (roomId, payload) => {
        set({ isSending: true, error: null });
        try {
          const msg = await chatService.sendAudio(roomId, payload);
          set((state) => ({ messages: [toPlain(msg), ...state.messages], isSending: false }));
          get().fetchConversations();
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur d'envoi audio", isSending: false });
          throw err;
        }
      },

      // ── deleteMessage ─────────────────────────────────────
      deleteMessage: async (roomId, messageId, scope = "me") => {
        try {
          await chatService.deleteMessage(roomId, messageId, scope);
          set((state) => ({
            messages: state.messages.filter((m) => m._id !== messageId),
          }));
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur de suppression" });
          throw err;
        }
      },

      // ── fetchSharedFiles ──────────────────────────────────
      fetchSharedFiles: async (roomId) => {
        set({ isLoading: true });
        try {
          const raw = await chatService.getSharedFiles(roomId);
          set({ sharedFiles: raw.map(toPlain), isLoading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur de chargement", isLoading: false });
        }
      },

      // ── searchMessages ────────────────────────────────────
      searchMessages: async (roomId, keyword) => {
        set({ isLoading: true });
        try {
          const raw = await chatService.searchMessages(roomId, keyword);
          set({ searchResults: raw.map(toPlain), isLoading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erreur de recherche", isLoading: false });
        }
      },

      clearSearchResults: () => set({ searchResults: [] }),

      // ── receiveMessage (WebSocket) ────────────────────────
      // Appel : socket.on("new_message", (msg) => useChatStore.getState().receiveMessage(msg))
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
            messages:      updatedMessages,
            conversations: updatedConversations,
            totalUnread:   updatedConversations.reduce((sum, c) => sum + c.unreadCount, 0),
          };
        });
      },

      // ── setInterlocutorOnline (WebSocket presence) ────────
      // Appel : socket.on("user_online", ({ userId, isOnline }) => store.setInterlocutorOnline(userId, isOnline))
      setInterlocutorOnline: (interlocutorId, isOnline) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.interlocutor._id === interlocutorId
              ? { ...c, interlocutor: { ...c.interlocutor, isOnline } }
              : c
          ),
          activeInterlocutor:
            state.activeInterlocutor?._id === interlocutorId
              ? { ...state.activeInterlocutor, isOnline }
              : state.activeInterlocutor,
        }));
      },

      clearError: () => set({ error: null }),
    }),
    { name: "ChatStore" }
  )
);