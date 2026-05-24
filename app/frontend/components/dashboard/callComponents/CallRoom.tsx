"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic, MicOff, Video, VideoOff, MessageSquare,
  PhoneOff, Settings, Shield, Subtitles,
  FileText, Paperclip, Send, Loader2, Phone,
} from "lucide-react";
import { useCallStore, formatCallDuration } from "@/app/frontend/store/callStore";
import { useSocketStore }                   from "@/app/frontend/store/soketStore";
import { useAuthStore, isDoctor, isPatient } from "@/app/frontend/store/useAuthStore";

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelTab = "chat" | "dossier";

interface ChatMessage {
  id:        string;
  sender:    "me" | "other";
  content:   string;
  time:      string;
  type:      "text" | "file";
  fileName?: string;
  fileSize?: string;
}

// ─── Bouton de contrôle ───────────────────────────────────────────────────────

function ControlBtn({
  onClick, active = true, danger = false, badge = false,
  children, label,
}: {
  onClick:  () => void;
  active?:  boolean;
  danger?:  boolean;
  badge?:   boolean;
  children: React.ReactNode;
  label:    string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
        danger
          ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/40"
          : active
          ? "bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm"
          : "bg-white/10 hover:bg-white/20 text-white/50 backdrop-blur-sm"
      }`}
    >
      {children}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900" />
      )}
    </button>
  );
}

// ─── Message chat ─────────────────────────────────────────────────────────────

function ChatMsg({ msg }: { msg: ChatMessage }) {
  const isMe = msg.sender === "me";
  return (
    <div className={`flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
      {msg.type === "file" ? (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl max-w-[80%] text-sm ${
          isMe ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-800"
        }`}>
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <FileText size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{msg.fileName}</p>
            <p className={`text-[10px] ${isMe ? "text-white/60" : "text-slate-400"}`}>{msg.fileSize}</p>
          </div>
        </div>
      ) : (
        <div className={`px-3 py-2 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
          isMe
            ? "bg-[#1e3a8a] text-white rounded-br-sm"
            : "bg-slate-100 text-slate-800 rounded-bl-sm"
        }`}>
          {msg.content}
        </div>
      )}
      <span className="text-[10px] text-slate-400 px-1">{msg.time}</span>
    </div>
  );
}

// ─── Écran d'appel entrant ────────────────────────────────────────────────────

function IncomingCallScreen({ onEnd }: { onEnd?: () => void }) {
  const incomingPayload = useCallStore((s) => s.incomingPayload);
  const acceptCall      = useSocketStore((s) => s.acceptCall);
  const declineCall     = useSocketStore((s) => s.declineCall);
  const user            = useAuthStore((s) => s.user);

  const userId = user
    ? (typeof user._id === "string" ? user._id : user._id.toString())
    : "";

  const callerLabel = incomingPayload?.callType === "video"
    ? "Appel vidéo entrant"
    : "Appel audio entrant";

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-950 gap-8">
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-slate-700 border-4 border-[#1e3a8a] flex items-center justify-center text-3xl font-bold text-white animate-pulse">
          ?
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-lg">{callerLabel}</p>
          <p className="text-white/50 text-sm mt-1">Appel entrant...</p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        {/* Refuser */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => {
              if (incomingPayload) {
                declineCall(incomingPayload.callSessionId, userId, "Occupé");
              }
              onEnd?.();
            }}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors shadow-lg shadow-red-500/40"
          >
            <PhoneOff size={24} className="text-white" />
          </button>
          <span className="text-xs text-white/50">Refuser</span>
        </div>

        {/* Accepter */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => {
              if (incomingPayload) {
                acceptCall(incomingPayload.callSessionId, userId);
              }
            }}
            className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors shadow-lg shadow-emerald-500/40"
          >
            <Phone size={24} className="text-white" />
          </button>
          <span className="text-xs text-white/50">Accepter</span>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface CallRoomProps {
  onEnd?: () => void;
}

export default function CallRoom({ onEnd }: CallRoomProps) {
  const user        = useAuthStore((s) => s.user);
  const phase       = useCallStore((s) => s.phase);
  const session     = useCallStore((s) => s.session);
  const isMuted     = useCallStore((s) => s.isMuted);
  const isCameraOff = useCallStore((s) => s.isCameraOff);
  const elapsed     = useCallStore((s) => s.elapsedSeconds);
  const agoraTokens = useCallStore((s) => s.agoraTokens);

  const toggleMute   = useCallStore((s) => s.toggleMute);
  const toggleCamera = useCallStore((s) => s.toggleCamera);

  const socketEndCall = useSocketStore((s) => s.endCall);
  const isConnected   = useSocketStore((s) => s.isConnected);

  const [activePanel, setActivePanel] = useState<PanelTab>("chat");
  const [chatMsg,     setChatMsg]     = useState("");
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [hasNewMsg,   setHasNewMsg]   = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Nom de l'autre participant
  const myName = (() => {
    if (!user) return "Vous";
    if (isDoctor(user))  return `${user.profile.title ?? "Dr"} ${user.profile.firstName}`;
    if (isPatient(user)) return user.profile.firstName;
    return "Vous";
  })();

  const userId = user
    ? (typeof user._id === "string" ? user._id : user._id.toString())
    : "";

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fin d'appel auto
  useEffect(() => {
    if (phase === "idle" || phase === "ended" || phase === "missed" || phase === "declined") {
      onEnd?.();
    }
  }, [phase, onEnd]);

  // Badge nouveau message si panneau fermé
  useEffect(() => {
    if (activePanel !== "chat" && messages.some((m) => m.sender === "other")) {
      setHasNewMsg(true);
    }
  }, [messages, activePanel]);

  const handleSend = useCallback(() => {
    if (!chatMsg.trim()) return;
    const now = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, {
      id: Date.now().toString(), sender: "me",
      type: "text", content: chatMsg.trim(), time: now,
    }]);
    setChatMsg("");
  }, [chatMsg]);

  const handleEnd = useCallback(() => {
    if (session) {
      const endedBy = phase === "calling" ? "caller" : "receiver";
      socketEndCall(session._id, userId, endedBy);
    }
    onEnd?.();
  }, [session, phase, socketEndCall, userId, onEnd]);

  // ── Écran appel entrant ────────────────────────────────────────────────────
  if (phase === "ringing") {
    return <IncomingCallScreen onEnd={onEnd} />;
  }

  // ── Écran connecting ───────────────────────────────────────────────────────
  if (phase === "connecting" || phase === "calling") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 gap-4">
        <Loader2 size={40} className="text-[#1e3a8a] animate-spin" />
        <p className="text-white font-medium">
          {phase === "calling" ? "Appel en cours..." : "Connexion..."}
        </p>
        <button
          onClick={handleEnd}
          className="mt-4 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
        >
          <PhoneOff size={22} className="text-white" />
        </button>
      </div>
    );
  }

  // ── Salle d'appel principale ───────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden">

      {/* ══ Zone vidéo ══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col relative">

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-3.5 bg-linear-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] flex items-center justify-center">
              <Video size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Téléconsultation</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[11px] text-white/70">
                  En cours ({formatCallDuration(elapsed)})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Shield size={12} className="text-emerald-400" />
              <span className="text-[11px] text-white/80 font-medium">Connexion chiffrée E2E</span>
            </div>
            <button className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors">
              <Settings size={13} className="text-white/80" />
              <span className="text-[11px] text-white/80 font-medium">Paramètres</span>
            </button>
          </div>
        </div>

        {/* Vidéo principale — placeholder Agora */}
        <div className="flex-1 relative flex items-center justify-center bg-slate-900">
          {/* 
            🔌 ICI : brancher le flux vidéo Agora
            Une fois le compte créé :
            import AgoraRTC from "agora-rtc-sdk-ng";
            const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            await client.join(agoraTokens.appId, agoraTokens.channelName, token, uid);
            → remplacer ce div par <div id="remote-video" />
          */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-slate-700 border-4 border-slate-600 flex items-center justify-center">
                  <span className="text-3xl font-bold text-slate-400">Dr</span>
                </div>
                {isMuted && (
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                    <MicOff size={14} className="text-white" />
                  </div>
                )}
              </div>
              <p className="text-white font-bold text-lg">Médecin</p>
              <p className="text-white/50 text-sm">
                {isConnected ? "Connecté" : "Reconnexion..."}
              </p>
            </div>
          </div>

          {/* Miniature "Vous" */}
          <div className="absolute top-5 right-5 z-10">
            <div className="relative w-36 h-28 rounded-2xl bg-slate-700 border-2 border-slate-600 overflow-hidden shadow-2xl">
              {/*
                🔌 ICI : brancher la caméra locale Agora
                const localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                → remplacer ce div par <div id="local-video" />
              */}
              {isCameraOff ? (
                <div className="w-full h-full flex items-center justify-center">
                  <VideoOff size={20} className="text-slate-500" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <span className="text-slate-500 text-xs">{myName}</span>
                </div>
              )}
              <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded-md">
                Vous
              </span>
            </div>
          </div>
        </div>

        {/* Barre de contrôles */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-8 bg-linear-to-t from-black/60 to-transparent">
          <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-2xl">

            <ControlBtn onClick={toggleMute} active={!isMuted} label={isMuted ? "Activer micro" : "Couper micro"}>
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </ControlBtn>

            <ControlBtn onClick={toggleCamera} active={!isCameraOff} label={isCameraOff ? "Activer caméra" : "Couper caméra"}>
              {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
            </ControlBtn>

            <ControlBtn onClick={() => {}} active label="Sous-titres">
              <Subtitles size={18} />
            </ControlBtn>

            <ControlBtn
              onClick={() => { setActivePanel("chat"); setHasNewMsg(false); }}
              active
              badge={hasNewMsg}
              label="Chat"
            >
              <MessageSquare size={18} />
            </ControlBtn>

            <div className="w-px h-8 bg-white/20 mx-1" />

            <ControlBtn onClick={handleEnd} danger label="Raccrocher">
              <PhoneOff size={18} />
            </ControlBtn>
          </div>
        </div>
      </div>

      {/* ══ Panneau latéral ═════════════════════════════════════════════════ */}
      <div className="w-80 shrink-0 bg-white flex flex-col border-l border-slate-200">

        {/* Tabs */}
        <div className="flex items-center border-b border-slate-200 shrink-0">
          {(["chat", "dossier"] as PanelTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActivePanel(tab); if (tab === "chat") setHasNewMsg(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold transition-all border-b-2 ${
                activePanel === tab
                  ? "text-[#1e3a8a] border-[#1e3a8a]"
                  : "text-slate-400 border-transparent hover:text-slate-600"
              }`}
            >
              {tab === "chat"
                ? <><MessageSquare size={14} /> Chat</>
                : <><FileText size={14} /> Dossier</>}
            </button>
          ))}
        </div>

        {/* Chat */}
        {activePanel === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              <p className="text-center text-[10px] text-slate-400 py-1">
                La consultation a commencé à{" "}
                {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
              {messages.map((msg) => <ChatMsg key={msg.id} msg={msg} />)}
              {messages.length === 0 && (
                <p className="text-center text-xs text-slate-400 mt-8">
                  Aucun message pour l&apos;instant
                </p>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="shrink-0 p-3 border-t border-slate-100 flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-[#1e3a8a] transition-colors">
                <Paperclip size={16} />
              </button>
              <input
                type="text"
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Taper un message..."
                className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!chatMsg.trim()}
                className="p-2 text-slate-400 hover:text-[#1e3a8a] disabled:opacity-40 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        )}

        {/* Dossier */}
        {activePanel === "dossier" && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <p className="text-xs text-slate-400 text-center py-4">
              Le dossier patient s&apos;affichera ici pendant la consultation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}