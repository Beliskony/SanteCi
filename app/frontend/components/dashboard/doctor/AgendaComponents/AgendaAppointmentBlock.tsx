"use client";

import { Video, MapPin, MessageSquare, Phone, Zap } from "lucide-react";
import type { Appointment } from "@/app/frontend/types/Appointment";
import { isPopulatedPatient } from "@/app/frontend/types/Appointment";

// ── Config visuelle par type ──────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, {
  icon:       React.ReactNode;
  bg:         string;
  border:     string;
  badge:      string;
  badgeText:  string;
}> = {
  video: {
    icon:      <Video size={11} />,
    bg:        "bg-blue-50",
    border:    "border-l-[#1e3a8a]",
    badge:     "bg-[#1e3a8a] text-white",
    badgeText: "Vidéo",
  },
  in_person: {
    icon:      <MapPin size={11} />,
    bg:        "bg-emerald-50",
    border:    "border-l-emerald-500",
    badge:     "bg-emerald-500 text-white",
    badgeText: "Cabinet",
  },
  chat: {
    icon:      <MessageSquare size={11} />,
    bg:        "bg-violet-50",
    border:    "border-l-violet-500",
    badge:     "bg-violet-500 text-white",
    badgeText: "Chat",
  },
  audio: {
    icon:      <Phone size={11} />,
    bg:        "bg-cyan-50",
    border:    "border-l-cyan-500",
    badge:     "bg-cyan-500 text-white",
    badgeText: "Audio",
  },
};

//  Configuration des badges de statut avec couleurs et labels
const STATUS_BADGE: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700 border border-green-200",
  ongoing:   "bg-red-500 text-white animate-pulse",
  pending:   "bg-amber-100 text-amber-700 border border-amber-200",
  completed: "bg-blue-100 text-blue-700 border border-blue-200",
  cancelled: "bg-red-100 text-red-700 border border-red-200",
  no_show:   "bg-gray-100 text-gray-500 border border-gray-200",
  missed_review: "bg-amber-100 text-amber-700 border border-amber-300",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmé",
  ongoing:   "En cours",
  pending:   "En attente",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show:   "Absent",
  missed_review: "À examiner",
};

// ── Calcul de position sur la timeline ───────────────────────────────────────
export const HOUR_HEIGHT = 64;
export const DAY_START   = 7; // 07:00

export function getBlockStyle(scheduledFor: Date, duration: number): React.CSSProperties {
  const hours   = scheduledFor.getHours() + scheduledFor.getMinutes() / 60;
  const top     = (hours - DAY_START) * HOUR_HEIGHT;
  const height  = Math.max((duration / 60) * HOUR_HEIGHT, 32);
  return { position: "absolute", top, height, left: 52, right: 8 };
}

// ── Composant ─────────────────────────────────────────────────────────────────

interface AgendaAppointmentBlockProps {
  appointment: Appointment;
  onClick:     (appointment: Appointment) => void;
}

export function AgendaAppointmentBlock({ appointment, onClick }: AgendaAppointmentBlockProps) {
  const { details, status, patientId } = appointment;
  const cfg     = TYPE_CONFIG[details.type] ?? TYPE_CONFIG.in_person;
  const patient = isPopulatedPatient(patientId) ? patientId : null;

  const scheduledFor = new Date(details.scheduledFor);
  const endTime      = new Date(scheduledFor.getTime() + details.duration * 60000);

  const timeStr = `${scheduledFor.toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  })} - ${endTime.toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  })}`;

  const isOngoing   = status.current === "ongoing";
  const isPending   = status.current === "pending";
  const isConfirmed = status.current === "confirmed";
  const isCompleted = status.current === "completed";
  const isCancelled = status.current === "cancelled" || status.current === "no_show";
  
  const blockStyle  = getBlockStyle(scheduledFor, details.duration);
  const isShort     = (blockStyle.height as number) < 48;

  const patientName = patient
    ? `${patient.profile.firstName} ${patient.profile.lastName}`
    : "Patient";

  //  Badge de statut avec style adapté
  const statusBadgeClass = STATUS_BADGE[status.current] || STATUS_BADGE.confirmed;
  const statusLabel = STATUS_LABEL[status.current] || status.current;

  return (
    <div
      onClick={() => onClick(appointment)}
      style={blockStyle}
      className={`rounded-lg border-l-4 ${cfg.bg} ${cfg.border} px-2 py-1.5 cursor-pointer
        hover:brightness-95 transition-all overflow-hidden group
        ${isOngoing ? "ring-1 ring-red-400" : ""}
        ${isPending ? "ring-1 ring-amber-300" : ""}
        ${isCancelled ? "opacity-60" : ""}
      `}
    >
      {/* Ligne 1 : heure + badges */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-bold text-slate-500 shrink-0">{timeStr}</span>
        <div className="flex items-center gap-1 shrink-0">
          {/*  Badge EN COURS spécifique */}
          {isOngoing && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
              <Zap size={8} className="fill-white" />
              EN COURS
            </span>
          )}

          {/*  Badge de statut générique */}
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${statusBadgeClass}`}>
            {statusLabel}
          </span>

          {/* Badge type */}
          <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.icon}
            {cfg.badgeText}
          </span>
        </div>
      </div>

      {/* Ligne 2 : patient + motif (masqués si bloc trop petit) */}
      {!isShort && (
        <>
          <div className="flex items-center gap-2 mt-1">
            {patient?.profile.photo ? (
              <img
                src={patient.profile.photo}
                alt={patientName}
                className="w-5 h-5 rounded-full object-cover border border-white shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-600 shrink-0">
                {patient?.profile.firstName?.[0]}{patient?.profile.lastName?.[0]}
              </div>
            )}
            <span className={`text-xs font-bold truncate ${
              isCancelled ? "text-slate-400 line-through" : "text-slate-800"
            }`}>
              {patientName}
            </span>
          </div>
          {details.reason && (
            <p className={`text-[10px] truncate ${
              isCancelled ? "text-slate-400" : "text-slate-500"
            }`}>
              {details.reason}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Bloc créneau libre ────────────────────────────────────────────────────────

interface FreeSlotBlockProps {
  startHour:  number;
  endHour:    number;
  label?:     string;
  onClick?:   () => void;
}

export function FreeSlotBlock({ startHour, endHour, label, onClick }: FreeSlotBlockProps) {
  const top    = (startHour - DAY_START) * HOUR_HEIGHT;
  const height = (endHour - startHour) * HOUR_HEIGHT;

  return (
    <div
      onClick={onClick}
      style={{ position: "absolute", top, height, left: 52, right: 8 }}
      className="border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-xs text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-colors"
    >
      <span className="text-[11px] font-medium">
        + Créneau libre ({`${startHour}:00 - ${endHour}:00`})
      </span>
    </div>
  );
}