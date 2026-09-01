// ============================================================
// store/useSocketStore.ts — Connexion Socket.IO partagée
// Une seule connexion pour toute l'app
// Branchée sur useCallStore pour les événements d'appel
// ============================================================

import { create }     from "zustand";
import { devtools }   from "zustand/middleware";
import { io, Socket } from "socket.io-client";
import { useCallStore }  from "@/app/frontend/store/callStore";
import { useAuthStore }  from "@/app/frontend/store/useAuthStore";
import { useChatStore } from "./chatStore";

// ─── State ────────────────────────────────────────────────────────────────────

interface SocketState {
  socket:       Socket | null;
  isConnected:  boolean;
  isConnecting: boolean;
  error:        string | null;

  // ── Actions ───────────────────────────────────────────────
  connect:    () => Promise<void>;
  disconnect: () => void;
  emit: (event: string, data: any) => boolean;

  // ── Appel : émettre via socket ────────────────────────────
  initiateCall: (params: {
    callerId:      string;
    callerType:    "doctor" | "patient";
    receiverId:    string;
    appointmentId: string;
    callType:      "audio" | "video";
  }) => void;

  acceptCall:  (callSessionId: string, receiverId: string) => void;
  declineCall: (callSessionId: string, receiverId: string, reason?: string) => void;
  endCall:     (callSessionId: string, requesterId: string, endedBy: "caller" | "receiver") => void;
  refreshToken:(callSessionId: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSocketStore = create<SocketState>()(
  devtools(
    (set, get) => ({
      socket:       null,
      isConnected:  false,
      isConnecting: false,
      error:        null,

      // ── connect ───────────────────────────────────────────────────────────
      connect: async () => {
        // Guard synchrone et indépendant de l'ordre async : bloque toute
        // connexion concurrente dès le premier appel, y compris pendant le
        // await fetch ci-dessous — avant même que le socket existe. Sans ça,
        // deux appels rapprochés (React Strict Mode double les effets en dev)
        // créaient chacun leur propre socket.io, provoquant des doubles
        // user:register et des faux user:offline quand la connexion
        // fantôme se fermait.
        if (get().socket || get().isConnecting) return;
        set({ isConnecting: true });

        try {
          // IMPORTANT : monter le endpoint Socket.IO côté serveur AVANT de
          // créer le client — sinon le client tente un handshake websocket
          // vers un serveur qui n'existe pas encore (→ timeout / "WebSocket
          // closed before the connection is established").
          await fetch("/api/socket");

          const user = useAuthStore.getState().user;
          if (!user) {
            console.warn('[Socket] Pas d\'utilisateur');
            set({ isConnecting: false });
            return;
          }

          const raw      = user._id;
          const userId   = typeof raw === "string" ? raw : raw;
          const userType = user.role as "doctor" | "patient";

          const socket = io({
            path:                 "/api/socket_io",
            transports:           ["websocket", "polling"],
            reconnectionAttempts: 5,
            reconnectionDelay:    1000,
          });

          set({ socket, isConnecting: false });

          // ── Connexion ──────────────────────────────────────────────────
          socket.on("connect", () => {
            console.log("[Socket] ✅ Connecté :", socket.id);
            set({ isConnected: true, error: null });

            console.log(`[Socket] 📝 Envoi user:register pour ${userId}`);
            socket.emit("user:register", { userId, userType });
          });

          socket.on("disconnect", (reason: any) => {
            console.log("[Socket] Déconnecté :", reason);
            set({ isConnected: false });
          });

          socket.on("connect_error", (err: any) => {
            console.error("[Socket] Erreur connexion :", err.message);
            set({ error: err.message });
          });

          // ── Événements d'appel → useCallStore ─────────────────────────
          const callStore = useCallStore.getState();

          // Caller : appel initié avec succès → tokens Agora reçus
          socket.on("call:initiated", (payload: any) => {
            console.log("[Socket] call:initiated", payload);
            callStore.onCallInitiated(payload);
          });

          // Receiver : appel entrant
          socket.on("call:incoming", (payload: any) => {
            console.log("[Socket] call:incoming", payload);
            callStore.onIncomingCall(payload);
          });

          // Les deux : appel accepté
          socket.on("call:accepted", (payload: any) => {
            console.log("[Socket] call:accepted", payload);
            callStore.onCallAccepted(payload);
          });

          // Caller : appel refusé par le receiver
          socket.on("call:declined", (payload: any) => {
            console.log("[Socket] call:declined", payload);
            callStore.onCallDeclined(payload);
          });

          // Les deux : appel terminé
          socket.on("call:ended", (payload: any) => {
            console.log("[Socket] call:ended", payload);
            callStore.onCallEnded(payload);
          });

          // Caller : appel manqué (timeout 45s)
          socket.on("call:missed", (payload: any) => {
            console.log("[Socket] call:missed", payload);
            callStore.onCallMissed(payload);
          });

          // Erreur technique
          socket.on("call:failed", (payload: any) => {
            // Si le serveur renvoie un payload vide/malformé (ancien build,
            // erreur non standard...), on ne perd plus l'info : au minimum
            // on sait QUEL flux a échoué au lieu d'un {} muet dans la console.
            const message = payload?.message || "Le serveur n'a fourni aucun détail sur l'erreur (payload vide) — vérifie les logs backend.";
            console.error("[Socket] call:failed —", message, payload);
            callStore.onCallFailed({ message });
          });

          // Tokens Agora rafraîchis
          socket.on("call:tokens", (payload: any) => {
            console.log("[Socket] call:tokens rafraîchis");
            callStore.onTokensRefreshed(payload);
          });

          // ── Nouveaux messages en temps réel ─────────────
          socket.on("new_message", (message: any) => {
            console.log("[Socket] new_message reçu :", message);
            useChatStore.getState().receiveMessage(message);
          });

          // ── Statuts de lecture/livraison en temps réel ──────
          socket.on("message:delivered", (payload: { messageId: string; chatRoomId: string }) => {
            console.log("[Socket] message:delivered", payload);
            useChatStore.getState().markMessageDeliveredLocally(payload.messageId);
          });

          socket.on("message:read", (payload: { messageId: string; chatRoomId: string }) => {
            console.log("[Socket] message:read", payload);
            useChatStore.getState().markMessageReadLocally(payload.messageId);
          });

          socket.on("messages:read", (payload: { chatRoomId: string; readBy: string }) => {
            console.log("[Socket] messages:read", payload);
            useChatStore.getState().markRoomMessagesReadLocally(payload.chatRoomId);
          });

          // ── Présence en ligne ──────────────────────────────
          socket.on("user:online",  ({ userId: uid }: any) => {
            console.log("[Socket] user:online reçu :", uid);
            useChatStore.getState().setInterlocutorOnline(uid, true);
          });
          socket.on("user:offline", ({ userId: uid }: any) => {
            console.log("[Socket] user:offline reçu :", uid);
            useChatStore.getState().setInterlocutorOnline(uid, false);
          });

        } catch (err) {
          console.error('[Socket] Erreur initialisation :', err);
          set({
            isConnecting: false,
            error: err instanceof Error ? err.message : 'Erreur inconnue',
          });
        }
      },

      // ── disconnect ────────────────────────────────────────────────────────
      disconnect: () => {
        get().socket?.disconnect();
        set({ socket: null, isConnected: false, isConnecting: false });
      },

      emit: (event: string, data: any) => {
        const { socket, isConnected } = get();
        if (socket && isConnected) {
          socket.emit(event, data);
          console.log(`📤 Socket emit: ${event}`, data);
          return true;
        }
        console.warn(`⚠️ Socket non connecté, emit ${event} ignoré`);
        return false;
      },

      // ── initiateCall ──────────────────────────────────────────────────────
      initiateCall: (params) => {
        const { socket } = get();
        if (!socket?.connected) {
          console.error("[Socket] Non connecté — impossible d'initier l'appel");
          return;
        }
        useCallStore.getState().startCall(params);
        socket.emit("call:initiate", params);
      },

      // ── acceptCall ────────────────────────────────────────────────────────
      acceptCall: (callSessionId, receiverId) => {
        const { socket } = get();
        if (!socket?.connected) return;
        socket.emit("call:accept", { callSessionId, receiverId });
      },

      // ── declineCall ───────────────────────────────────────────────────────
      declineCall: (callSessionId, receiverId, reason) => {
        const { socket } = get();
        if (!socket?.connected) return;
        socket.emit("call:decline", { callSessionId, receiverId, reason });
      },

      // ── endCall ───────────────────────────────────────────────────────────
      endCall: (callSessionId, requesterId, endedBy) => {
        const { socket } = get();
        if (!socket?.connected) return;
        socket.emit("call:end", { callSessionId, requesterId, endedBy });
      },

      // ── refreshToken ──────────────────────────────────────────────────────
      refreshToken: (callSessionId) => {
        const { socket } = get();
        if (!socket?.connected) return;
        socket.emit("call:token-refresh", { callSessionId });
      },
    }),
    { name: "SocketStore", enabled: process.env.NODE_ENV === "development" }
  )
);