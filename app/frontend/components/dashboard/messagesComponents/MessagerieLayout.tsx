"use client";

import { useEffect, useCallback } from "react";
import { Phone } from "lucide-react";
import { useChatStore }    from "@/app/frontend/store/chatStore";
import { useAuthStore }    from "@/app/frontend/store/useAuthStore";
import { useCallStore }    from "@/app/frontend/store/callStore";
import { useSocketStore }  from "@/app/frontend/store/soketStore";
import ConversationList    from "./ConversationList";
import ConversationHeader  from "./ConversationHeader";
import ConversationBody    from "./ConversationBody";
import MessageInput        from "./MessageInput";
import CallRoom            from "@/app/frontend/components/dashboard/callComponents/CallRoom";

// ─── Layout principal ─────────────────────────────────────────────────────────

export default function MessagerieLayout() {
  const { activeChatRoomId, activeInterlocutor, closeRoom } = useChatStore();
  const user = useAuthStore((s) => s.user);

  //  Socket — connexion partagée
  const connect      = useSocketStore((s) => s.connect);
  const initiateCall = useSocketStore((s) => s.initiateCall);
  const isConnected  = useSocketStore((s) => s.isConnected);

  //  Call — phase UI
  const phase = useCallStore((s) => s.phase);

  // ── Connecter le socket au montage ────────────────────────────────────────
  useEffect(() => {
    connect();
  }, [connect]);

  // ── Démarrer un appel ─────────────────────────────────────────────────────
  const handleStartCall = useCallback((type: "audio" | "video") => {
    if (!user || !activeInterlocutor) return;

    const callerId = typeof user._id === "string"
      ? user._id
      : user._id.toString();

    initiateCall({
      callerId,
      callerType:    user.role as "doctor" | "patient",
      receiverId:    activeInterlocutor._id,
      appointmentId: activeChatRoomId ?? "", // la room = le RDV
      callType:      type,
    });
  }, [user, activeInterlocutor, activeChatRoomId, initiateCall]);

  // ── Afficher CallRoom si appel en cours ───────────────────────────────────
  const isInCall = phase !== "idle" && phase !== "ended" &&
                   phase !== "declined" && phase !== "missed" && phase !== "failed";

  if (isInCall) {
    return (
      <CallRoom
        onEnd={() => {
          // Le store repasse en idle automatiquement via onCallEnded/socket
        }}
      />
    );
  }

  return (
    <div className="flex h-full w-full bg-[#f4f6fb] overflow-hidden">

      {/* ── Liste des conversations ── */}
      <ConversationList
        onSelectRoom={(roomId) => {
          if (roomId !== activeChatRoomId) closeRoom();
        }}
      />

      {/* ── Zone de conversation ── */}
      {activeChatRoomId && activeInterlocutor ? (
        <div className="flex flex-col flex-1 min-w-0 w-full">
          <ConversationHeader
            interlocutor={activeInterlocutor}
            onStartCall={handleStartCall}
          />
          <ConversationBody roomId={activeChatRoomId} />
          <MessageInput
            roomId={activeChatRoomId}
            receiverId={activeInterlocutor._id}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-[#1e3a8a]/5 flex items-center justify-center">
            <Phone size={28} className="text-[#1e3a8a]/40" />
          </div>
          <p className="text-sm font-medium text-gray-500">
            Sélectionnez une conversation pour commencer
          </p>
        </div>
      )}
    </div>
  );
}