"use client";

import { useEffect, useCallback, useState } from "react";
import { Phone, AlertCircle, ChevronLeft } from "lucide-react";
import { useChatStore }   from "@/app/frontend/store/chatStore";
import { useAuthStore }   from "@/app/frontend/store/useAuthStore";
import { useCallStore }   from "@/app/frontend/store/callStore";
import { useSocketStore } from "@/app/frontend/store/soketStore";
import { appointmentService } from "@/app/frontend/services/consultationService";
import ConversationList   from "@/app/frontend/components/dashboard/messagesComponents/ConversationList";
import ConversationHeader from "@/app/frontend/components/dashboard/messagesComponents/ConversationHeader";
import ConversationBody   from "@/app/frontend/components/dashboard/messagesComponents/ConversationBody";
import MessageInput       from "@/app/frontend/components/dashboard/messagesComponents/MessageInput";
import CallRoom           from "@/app/frontend/components/dashboard/callComponents/CallRoom";

// ── Résoudre le rendez-vous appelable entre ce médecin et ce patient ─────────
// Un appel a besoin d'un vrai Appointment "confirmed" ou "ongoing" — pas du
// chatRoomId de la conversation. On va chercher le RDV le plus pertinent :
// priorité à celui "ongoing", sinon le "confirmed" le plus proche de maintenant.
async function resolveCallableAppointmentId(
  doctorId: string,
  patientId: string
): Promise<string | null> {
  const res = await appointmentService.list({ doctorId, patientId, limit: 20 });

  const eligible = res.appointments.filter((a) =>
    a.status.current === "ongoing" || a.status.current === "confirmed"
  );

  if (eligible.length === 0) return null;

  const ongoing = eligible.find((a) => a.status.current === "ongoing");
  if (ongoing) return ongoing._id;

  const now = Date.now();
  eligible.sort((a, b) =>
    Math.abs(new Date(a.details.scheduledFor).getTime() - now) -
    Math.abs(new Date(b.details.scheduledFor).getTime() - now)
  );

  return eligible[0]._id;
}

export default function MessagerieLayoutDoc() {
  const { activeChatRoomId, activeInterlocutor, closeRoom, openRoom } = useChatStore();
  const user = useAuthStore((s) => s.user);

  const connect      = useSocketStore((s) => s.connect);
  const initiateCall = useSocketStore((s) => s.initiateCall);
  const phase        = useCallStore((s) => s.phase);

  const [isResolvingCall, setIsResolvingCall] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  useEffect(() => {
    connect();
  }, [connect]);

  const handleStartCall = useCallback(async (type: "audio" | "video") => {
    if (!user || !activeInterlocutor) return;

    setCallError(null);
    setIsResolvingCall(true);
    try {
      const appointmentId = await resolveCallableAppointmentId(
        String(user._id),
        activeInterlocutor._id
      );

      if (!appointmentId) {
        setCallError("Aucun rendez-vous confirmé ou en cours avec ce patient — impossible de démarrer l'appel.");
        return;
      }

      initiateCall({
        callerId:      String(user._id),
        callerType:    "doctor",
        receiverId:    activeInterlocutor._id,
        appointmentId,
        callType:      type,
      });
    } catch (err: any) {
      setCallError(err.message ?? "Impossible de vérifier le rendez-vous.");
    } finally {
      setIsResolvingCall(false);
    }
  }, [user, activeInterlocutor, initiateCall]);

  const isInCall = phase !== "idle" && phase !== "ended" &&
                   phase !== "declined" && phase !== "missed" && phase !== "failed";

  if (isInCall) {
    return <CallRoom onEnd={() => {}} />;
  }

  return (
    <div className="flex h-full w-full bg-[#f4f6fb] overflow-hidden">

      <ConversationList
        className={activeChatRoomId ? "hidden md:flex" : "flex"}
        onSelectRoom={(roomId) => {
          if (roomId !== activeChatRoomId) openRoom(roomId);
        }}
      />

      {activeChatRoomId && activeInterlocutor ? (
        <div className="flex flex-col flex-1 min-w-0 w-full h-full">
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