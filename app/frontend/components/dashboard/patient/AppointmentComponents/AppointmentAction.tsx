// components/appointments/AppointmentActions.tsx
"use client";

import { useAppointmentStore } from "@/app/frontend/store/consultationStore";
import type { Appointment } from "@/app/frontend/types/Appointment";

// ── Icons ─────────────────────────────────────────────────────────────────────

function JoinIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9"  x2="9"  y2="15"/>
      <line x1="9"  y1="9"  x2="15" y2="15"/>
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5"  cy="12" r="1.5"/>
      <circle cx="12" cy="12" r="1.5"/>
      <circle cx="19" cy="12" r="1.5"/>
    </svg>
  );
}

// ── Composant ─────────────────────────────────────────────────────────────────

interface AppointmentActionsProps {
  appointment: Appointment;
  onReschedule?: (id: string) => void;
}

export function AppointmentActions({ appointment, onReschedule }: AppointmentActionsProps) {
  const { join, cancel } = useAppointmentStore();

  const { _id, status, details, communication } = appointment;
  const current = status.current;
  const isRemote = details.type !== "in_person";

  // ── Rejoindre (téléconsultation confirmée ou en cours) ────────────────────
  if ((current === "confirmed" || current === "ongoing") && isRemote) {
    const handleJoin = async () => {
      await join(_id, "patient");
      const roomUrl = communication.videoRoomId
        ? `/consultation/${communication.videoRoomId}` // adapter selon ta route
        : communication.chatRoomId
        ? `/chat/${communication.chatRoomId}`
        : null;
      if (roomUrl) window.location.href = roomUrl;
    };

    return (
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={handleJoin}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors"
        >
          <JoinIcon />
          Rejoindre la consultation
        </button>
        <button
          className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
          aria-label="Plus d'options"
        >
          <MoreIcon />
        </button>
      </div>
    );
  }

  // ── Reprogrammer / Annuler (confirmé ou en attente, présentiel) ───────────
  if (current === "confirmed" || current === "pending") {
    const handleCancel = async () => {
      const reason = window.prompt("Raison de l'annulation (optionnel) :") ?? "";
      try {
        await cancel(_id, "patient", reason);
      } catch {
        // l'erreur est déjà dans le store
      }
    };

    return (
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => onReschedule?.(_id)}
          className="flex-1 flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium py-2.5 px-4 rounded-xl transition-colors"
        >
          <CalendarIcon />
          Reprogrammer
        </button>
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors py-2.5 px-3 rounded-xl hover:bg-red-50"
        >
          <XCircleIcon />
          Annuler
        </button>
      </div>
    );
  }

  return null;
}