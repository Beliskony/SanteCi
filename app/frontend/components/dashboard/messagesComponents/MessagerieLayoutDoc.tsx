"use client";

import { useEffect, useCallback } from "react";
import { Phone } from "lucide-react";
import { useChatStore }   from "@/app/frontend/store/chatStore";
import { useAuthStore }   from "@/app/frontend/store/useAuthStore";
import { useCallStore }   from "@/app/frontend/store/callStore";
import { useSocketStore } from "@/app/frontend/store/soketStore";
import ConversationList   from "@/app/frontend/components/dashboard/messagesComponents/ConversationList";
import ConversationHeader from "@/app/frontend/components/dashboard/messagesComponents/ConversationHeader";
import ConversationBody   from "@/app/frontend/components/dashboard/messagesComponents/ConversationBody";
import MessageInput       from "@/app/frontend/components/dashboard/messagesComponents/MessageInput";
import CallRoom           from "@/app/frontend/components/dashboard/callComponents/CallRoom";

export default function MessagerieLayoutDoc() {
  const { activeChatRoomId, activeInterlocutor, openRoom } = useChatStore();
  const user = useAuthStore((s) => s.user);

  const connect      = useSocketStore((s) => s.connect);
  const initiateCall = useSocketStore((s) => s.initiateCall);
  const phase        = useCallStore((s) => s.phase);

  useEffect(() => {
    connect();
  }, [connect]);

  const handleStartCall = useCallback((type: "audio" | "video") => {
    if (!user || !activeInterlocutor) return;
    initiateCall({
      callerId:      String(user._id),
      callerType:    "doctor",           // ← doctor ici, patient dans l'autre layout
      receiverId:    activeInterlocutor._id,
      appointmentId: activeChatRoomId ?? "",
      callType:      type,
    });
  }, [user, activeInterlocutor, activeChatRoomId, initiateCall]);

  const isInCall = phase !== "idle" && phase !== "ended" &&
                   phase !== "declined" && phase !== "missed" && phase !== "failed";

  if (isInCall) {
    return <CallRoom onEnd={() => {}} />;
  }

  return (
    <div className="flex h-full w-full bg-[#f4f6fb] overflow-hidden">

      <ConversationList
        onSelectRoom={(roomId) => {
          if (roomId !== activeChatRoomId) openRoom(roomId);
        }}
      />

      {activeChatRoomId && activeInterlocutor ? (
        <div className="flex flex-col flex-1 min-w-0 w-full h-full">
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