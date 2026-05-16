"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, Video, PhoneOff, MicOff, Mic, VideoOff, VideoIcon } from "lucide-react";
import { useChatStore } from "@/app/frontend/store/chatStore";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import ConversationList from "./ConversationList";
import ConversationHeader from "./ConversationHeader";
import ConversationBody from "./ConversationBody";
import MessageInput from "./MessageInput";

// ─── WebRTC Call Overlay ──────────────────────────────────────

interface CallState {
  type:        "audio" | "video";
  status:      "calling" | "connected" | "ended";
  isMuted:     boolean;
  isVideoOff:  boolean;
}

function CallOverlay({
  callState,
  interlocutorName,
  localVideoRef,
  remoteVideoRef,
  onToggleMute,
  onToggleVideo,
  onHangUp,
}: {
  callState:        CallState;
  interlocutorName: string;
  localVideoRef:    React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef:   React.RefObject<HTMLVideoElement | null>;
  onToggleMute:     () => void;
  onToggleVideo:    () => void;
  onHangUp:         () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-900/95 flex flex-col items-center justify-center gap-6">
      {/* Vidéo distante */}
      {callState.type === "video" && (
        <div className="relative w-full max-w-2xl aspect-video bg-gray-800 rounded-2xl overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Vidéo locale (pip) */}
          <div className="absolute bottom-3 right-3 w-32 aspect-video bg-gray-700 rounded-xl overflow-hidden border-2 border-white/20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Audio only */}
      {callState.type === "audio" && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-[#1e3a8a]/30 flex items-center justify-center">
            <Phone size={40} className="text-white" />
          </div>
          <p className="text-white text-xl font-semibold">{interlocutorName}</p>
          <p className="text-gray-400 text-sm">
            {callState.status === "calling" ? "Appel en cours..." : "Connecté"}
          </p>
        </div>
      )}

      {/* Contrôles */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleMute}
          className={`p-4 rounded-full transition-colors ${
            callState.isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title={callState.isMuted ? "Activer le micro" : "Couper le micro"}
        >
          {callState.isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {callState.type === "video" && (
          <button
            onClick={onToggleVideo}
            className={`p-4 rounded-full transition-colors ${
              callState.isVideoOff ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title={callState.isVideoOff ? "Activer la caméra" : "Couper la caméra"}
          >
            {callState.isVideoOff ? <VideoOff size={22} /> : <VideoIcon size={22} />}
          </button>
        )}

        <button
          onClick={onHangUp}
          className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
          title="Raccrocher"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}

// ─── Layout principal ──────────────────────────────────────────

export default function MessagerieLayout() {
  const { activeChatRoomId, activeInterlocutor, closeRoom } = useChatStore();
  const currentUser = useAuthStore((s) => s.user);

  const [callState, setCallState] = useState<CallState | null>(null);

  // WebRTC refs
  const localVideoRef   = useRef<HTMLVideoElement>(null);
  const remoteVideoRef  = useRef<HTMLVideoElement>(null);
  const peerRef         = useRef<RTCPeerConnection | null>(null);
  const localStreamRef  = useRef<MediaStream | null>(null);

  // ── Démarrer un appel WebRTC ─────────────────────────────────
  const startCall = useCallback(async (type: "audio" | "video") => {
    setCallState({ type, status: "calling", isMuted: false, isVideoOff: false });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });

      localStreamRef.current = stream;

      if (localVideoRef.current && type === "video") {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerRef.current = pc;

      // Ajouter les tracks locaux
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Réception flux distant
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
        setCallState((prev) => prev ? { ...prev, status: "connected" } : prev);
      };

      // ICE candidates — à envoyer via WebSocket à l'interlocuteur
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          // TODO: socket.emit("ice_candidate", { candidate: e.candidate, to: activeInterlocutor?._id })
          console.log("ICE candidate:", e.candidate);
        }
      };

      // Créer l'offre SDP
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // TODO: socket.emit("call_offer", { offer, to: activeInterlocutor?._id, type })
      console.log("SDP Offer créé — à envoyer via WebSocket");

    } catch (err) {
      console.error("Erreur WebRTC:", err);
      hangUp();
    }
  }, [activeInterlocutor]);

  // ── Raccrocher ───────────────────────────────────────────────
  const hangUp = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    peerRef.current        = null;
    localStreamRef.current = null;
    setCallState(null);
  }, []);

  // ── Toggle micro ─────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setCallState((prev) => prev ? { ...prev, isMuted: !prev.isMuted } : prev);
    }
  }, []);

  // ── Toggle vidéo ─────────────────────────────────────────────
  const toggleVideo = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCallState((prev) => prev ? { ...prev, isVideoOff: !prev.isVideoOff } : prev);
    }
  }, []);

  // Cleanup à la fermeture
  useEffect(() => () => { hangUp(); }, [hangUp]);

  // Déduire receiverId et appointmentId depuis la room active
  const receiverId    = activeInterlocutor?._id ?? "";

  return (
    <div className="flex h-full w-full bg-[#f4f6fb] overflow-hidden">

      {/* ── Overlay appel WebRTC ── */}
      {callState && activeInterlocutor && (
        <CallOverlay
          callState={callState}
          interlocutorName={activeInterlocutor.name}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onHangUp={hangUp}
        />
      )}

      {/* ── Liste des conversations ── */}
      <ConversationList onSelectRoom={(roomId) => {
        if (roomId !== activeChatRoomId) closeRoom();
      }} />

      {/* ── Zone de conversation ── */}
      {activeChatRoomId && activeInterlocutor ? (
        <div className="flex flex-col flex-1 min-w-0 w-full">
          <ConversationHeader
            interlocutor={activeInterlocutor}
            onStartCall={startCall}
          />
          <ConversationBody roomId={activeChatRoomId} />
          <MessageInput
            roomId={activeChatRoomId}
            receiverId={receiverId}
          />
        </div>
      ) : (
        // État vide
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