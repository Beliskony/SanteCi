"use client";

import { useEffect, useCallback, useState } from "react";
import { Phone, AlertCircle, ChevronLeft } from "lucide-react";
import { useChatStore }    from "@/app/frontend/store/chatStore";
import { useAuthStore }    from "@/app/frontend/store/useAuthStore";
import { useSocketStore }  from "@/app/frontend/store/soketStore";
import { appointmentService } from "@/app/frontend/services/consultationService";
import ConversationList    from "./ConversationList";
import ConversationHeader  from "./ConversationHeader";
import ConversationBody    from "./ConversationBody";
import MessageInput        from "./MessageInput";

// ── Résoudre le rendez-vous appelable entre ce patient et ce médecin ─────────
// Priorité au RDV "ongoing", sinon le "confirmed" le plus proche de maintenant.
// Un chatRoomId n'est PAS un appointmentId. Seuls video/audio sont appelables.

interface CallableAppointment {
  appointmentId: string;
  callType:      "audio" | "video";
  status:        "confirmed" | "ongoing";
}

async function resolveCallableAppointment(
  doctorId: string,
  patientId: string
): Promise<CallableAppointment | null> {
  const res = await appointmentService.list({ doctorId, patientId, limit: 20 });

  const eligible = res.appointments.filter((a) =>
    (a.status.current === "ongoing" || a.status.current === "confirmed") &&
    (a.details.type === "video" || a.details.type === "audio")
  );

  if (eligible.length === 0) return null;

  const ongoing = eligible.find((a) => a.status.current === "ongoing");
  const chosen = ongoing ?? (() => {
    const now = Date.now();
    return [...eligible].sort((a, b) =>
      Math.abs(new Date(a.details.scheduledFor).getTime() - now) -
      Math.abs(new Date(b.details.scheduledFor).getTime() - now)
    )[0];
  })();

  return {
    appointmentId: chosen._id,
    callType:      chosen.details.type as "audio" | "video",
    status:        chosen.status.current as "confirmed" | "ongoing",
  };
}

export default function MessagerieLayout() {
  const { activeChatRoomId, activeInterlocutor, closeRoom, openRoom } = useChatStore();
  const user = useAuthStore((s) => s.user);

  const initiateCall = useSocketStore((s) => s.initiateCall);
  const isConnected  = useSocketStore((s) => s.isConnected);

  const [callableAppointment, setCallableAppointment] = useState<CallableAppointment | null>(null);
  const [isResolvingCall, setIsResolvingCall] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  // Résoudre le RDV appelable dès qu'on ouvre une conversation
  useEffect(() => {
    if (!user || !activeInterlocutor) {
      setCallableAppointment(null);
      return;
    }

    let cancelled = false;
    setIsResolvingCall(true);
    setCallError(null);

    resolveCallableAppointment(
      activeInterlocutor._id, // le médecin, côté patient
      String(user._id)
    )
      .then((info) => { if (!cancelled) setCallableAppointment(info); })
      .catch(() => { if (!cancelled) setCallableAppointment(null); })
      .finally(() => { if (!cancelled) setIsResolvingCall(false); });

    return () => { cancelled = true; };
  }, [user, activeInterlocutor]);

  const handleStartCall = useCallback(() => {
    if (!user || !activeInterlocutor || !callableAppointment) return;

    setCallError(null);
    initiateCall({
      callerId:      String(user._id),
      callerType:    user.role as "doctor" | "patient",
      receiverId:    activeInterlocutor._id,
      appointmentId: callableAppointment.appointmentId,
      callType:      callableAppointment.callType,
    });
  }, [user, activeInterlocutor, callableAppointment, initiateCall]);

  return (
    <div className="flex h-full w-full bg-[#f4f6fb] overflow-hidden">

      <ConversationList
        className={activeChatRoomId ? "hidden md:flex" : "flex"}
        onSelectRoom={(roomId) => {
          if (roomId !== activeChatRoomId) {
            openRoom(roomId);
          }
        }}
      />

      {activeChatRoomId && activeInterlocutor ? (
        <div className="flex flex-col flex-1 min-w-0 w-full">
          {/* Bouton retour, mobile uniquement */}
          <button
            onClick={closeRoom}
            className="md:hidden flex items-center gap-2 px-4 py-2 text-sm text-[#1e3a8a] border-b border-gray-100"
          >
            <ChevronLeft size={16} />
            Retour aux conversations
          </button>

          {callError && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
              <AlertCircle size={14} className="shrink-0" />
              <span className="flex-1">{callError}</span>
              <button onClick={() => setCallError(null)} className="font-semibold hover:underline">
                Fermer
              </button>
            </div>
          )}
          <ConversationHeader
            interlocutor={activeInterlocutor}
            callType={callableAppointment?.callType ?? null}
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