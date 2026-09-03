
// ============================================================
// components/notifications/NotificationToast.tsx
// Une carte de notification individuelle. Style aligné sur
// IncomingCallModal (rounded-2xl/3xl, #1e3a8a, shadow-lg).
//
// Cas particulier "call" avec data.isLiveIncomingCall === true :
// c'est une alerte d'appel entrant en direct (poussée par
// CallGlobalListener). Dans ce cas seulement : sonnerie en boucle,
// pas d'auto-fermeture, boutons Accepter/Refuser au lieu du body
// standard. Les autres notifications de type "call" (appel manqué,
// appel terminé...) restent des toasts informatifs classiques.
//
// ⚠️ Ce toast et l'écran plein écran de CallRoom.tsx (IncomingCallScreen)
// affichent tous les deux un appel entrant. Pour éviter que l'un reste
// affiché alors que l'autre a déjà avancé (accepté/refusé/raccroché
// ailleurs), ce toast :
//   1. Accepte/refuse via useSocketStore (socket.emit "call:accept" /
//      "call:decline") — c'est le SEUL chemin qui déclenche réellement
//      CallGateway côté backend et fait avancer l'appel pour les deux
//      participants. callStore.acceptCall()/declineCall() ne font QUE
//      des appels REST de repli (cf. leur JSDoc) et ne doivent pas être
//      utilisés ici — les utiliser directement ne fait rien avancer
//      côté serveur, l'appel reste bloqué.
//   2. Se ferme automatiquement dès que `callStore.phase` quitte "ringing"
//      (peuplé par NotificationGlobalListener via onIncomingCall), quelle
//      que soit la raison : action ici, action dans CallRoom, ou event
//      serveur (call:accepted / call:missed / call:ended) reçu par
//      useSocketStore et répercuté dans callStore.
// ============================================================
 
"use client";
 
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Calendar,
  Pill,
  MessageCircle,
  Bell,
  CreditCard,
  Info,
  AlertTriangle,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import type {
  Notification,
  NotificationType,
} from "@/app/frontend/services/notificationService";
import { useToastStore } from "@/app/frontend/store/toastStore";
import { useNotificationSound } from "@/app/frontend/hooks/useNotificationSound";
import { useSocketStore } from "@/app/frontend/store/soketStore";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import { useCallStore } from "@/app/frontend/store/callStore";
 
const ICONS: Record<NotificationType, typeof Bell> = {
  appointment: Calendar,
  prescription: Pill,
  message: MessageCircle,
  reminder: Bell,
  payment: CreditCard,
  system: Info,
  emergency: AlertTriangle,
  call: Phone,
};
 
const ACCENTS: Record<NotificationType, string> = {
  appointment: "text-[#1e3a8a] bg-[#1e3a8a]/10",
  prescription: "text-emerald-700 bg-emerald-50",
  message: "text-indigo-700 bg-indigo-50",
  reminder: "text-amber-700 bg-amber-50",
  payment: "text-teal-700 bg-teal-50",
  system: "text-gray-600 bg-gray-100",
  emergency: "text-red-700 bg-red-50",
  call: "text-green-700 bg-green-50",
};
 
// Durée d'affichage automatique (ms) selon la priorité back-end
const AUTO_DISMISS_MS: Record<Notification["metadata"]["priority"], number> = {
  high: 8000,
  normal: 5000,
  low: 4000,
};
 
function buildHref(notification: Notification): string | null {
  const { type, data } = notification;
  if (data?.url) return data.url;
  switch (type) {
    case "appointment":
      return data?.appointmentId
        ? `/dashboard/appointments/${data.appointmentId}`
        : "/dashboard/appointments";
    case "prescription":
      return data?.prescriptionId
        ? `/dashboard/prescriptions/${data.prescriptionId}`
        : "/dashboard/prescriptions";
    case "message":
      return "/dashboard/messages";
    case "payment":
      return "/dashboard/payments";
    default:
      return null;
  }
}
 
interface NotificationToastProps {
  id: string;
  notification: Notification;
}
 
export default function NotificationToast({
  id,
  notification,
}: NotificationToastProps) {
  const dismiss = useToastStore((s) => s.dismiss);
  const router = useRouter();
  const { start, stop } = useNotificationSound();
  const [isLeaving, setIsLeaving] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const timerRef = useRef<number | null>(null);
 
  const user = useAuthStore((s) => s.user);
 
  // ── Accept/decline réels : via socket, seul chemin qui déclenche
  //    CallGateway côté backend ────────────────────────────────────────────
  const acceptCall = useSocketStore((s) => s.acceptCall);
  const declineCall = useSocketStore((s) => s.declineCall);
 
  // ── callPhase : uniquement pour savoir quand se fermer, jamais pour agir ──
  const callPhase = useCallStore((s) => s.phase);
 
  const Icon = ICONS[notification.type] ?? Bell;
  const accent = ACCENTS[notification.type] ?? ACCENTS.system;
 
  const isLiveIncomingCall =
    notification.type === "call" && !!notification.data?.isLiveIncomingCall;
 
  // Urgences + appel entrant en direct : reste affiché tant qu'on n'agit pas
  const isUrgent = notification.type === "emergency" || isLiveIncomingCall;
 
  const close = () => {
    setIsLeaving(true);
    window.setTimeout(() => dismiss(id), 200);
  };
 
  // Sonnerie : boucle pour un appel entrant en direct, bip unique pour une urgence
  useEffect(() => {
    if (isLiveIncomingCall) {
      start("call", true);
    } else if (notification.type === "emergency") {
      start("alert", false);
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  useEffect(() => {
    if (isUrgent) return;
    const duration =
      AUTO_DISMISS_MS[notification.metadata.priority] ?? AUTO_DISMISS_MS.normal;
    timerRef.current = window.setTimeout(close, duration);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  // ── Fermeture auto dès que l'appel n'est plus "ringing" ───────────────────
  // Couvre : accepté/refusé/raccroché depuis CallRoom (écran plein écran),
  // appel manqué (timeout serveur), appel qui échoue — tout ce qui fait
  // avancer callStore.phase ailleurs que dans ce toast.
  useEffect(() => {
    if (!isLiveIncomingCall) return;
    if (callPhase !== "ringing") {
      stop();
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callPhase, isLiveIncomingCall]);
 
  const getUserId = () =>
    typeof user?._id === "string" ? user._id : String(user?._id || "");
 
  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sessionId = notification.data?.callSessionId;
    if (sessionId) acceptCall(sessionId, getUserId());
    stop();
    // Pas de close() ici : le useEffect sur callPhase s'en charge dès que
    // call:accepted revient du serveur (phase passe à "connecting"/"ongoing").
    // Fermer immédiatement ici masquerait un échec silencieux de l'accept.
  };
 
  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSoundMuted) {
      start("call", true);
    } else {
      stop();
    }
    setIsSoundMuted((m) => !m);
  };
 
  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sessionId = notification.data?.callSessionId;
    if (sessionId) declineCall(sessionId, getUserId(), "declined");
    stop();
    // Idem : le useEffect sur callPhase fermera le toast une fois
    // call:declined confirmé côté serveur.
  };
 
  const handleClick = () => {
    if (isLiveIncomingCall) return; // pas de navigation sur une alerte d'appel
    const href = buildHref(notification);
    if (href) router.push(href);
    close();
  };
 
  return (
    <div
      role="alert"
      onClick={handleClick}
      className={`pointer-events-auto w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-4 shadow-lg shadow-black/5 transition-all duration-200 ${
        isLiveIncomingCall ? "" : "cursor-pointer"
      } ${
        isLeaving
          ? "translate-x-full opacity-0"
          : "translate-x-0 opacity-100 animate-in slide-in-from-right-8"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent} ${
            isLiveIncomingCall ? "animate-pulse" : ""
          }`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {notification.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
            {notification.body}
          </p>
 
          {isLiveIncomingCall && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleDecline}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600"
              >
                <PhoneOff size={14} /> Refuser
              </button>
              <button
                onClick={handleAccept}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-600"
              >
                <Phone size={14} /> Accepter
              </button>
              <button
                onClick={toggleSound}
                title={isSoundMuted ? "Réactiver la sonnerie" : "Couper la sonnerie"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
              >
                {isSoundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>
          )}
        </div>
        {!isLiveIncomingCall && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="shrink-0 rounded-full p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
 
