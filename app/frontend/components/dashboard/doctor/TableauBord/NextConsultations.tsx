"use client";

import { Video, MessageSquare, Phone, MapPin, ChevronRight, Loader2 } from "lucide-react";
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore";
import { isPopulatedPatient } from "@/app/frontend/types/Appointment";
import type { Appointment } from "@/app/frontend/types/Appointment";

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  video:     { label: "Vidéo",   icon: <Video size={11} />,         color: "text-blue-600 bg-blue-50 border-blue-100"     },
  audio:     { label: "Audio",   icon: <Phone size={11} />,         color: "text-violet-600 bg-violet-50 border-violet-100"},
  chat:      { label: "Chat",    icon: <MessageSquare size={11} />, color: "text-emerald-600 bg-emerald-50 border-emerald-100"},
  in_person: { label: "Cabinet", icon: <MapPin size={11} />,        color: "text-amber-600 bg-amber-50 border-amber-100"  },
};

// ─── Carte consultation ───────────────────────────────────────────────────────

function ConsultationCard({
  appointment,
  isFirst,
  onStart,
  onViewDossier,
}: {
  appointment:  Appointment;
  isFirst:      boolean;
  onStart:      (id: string) => void;
  onViewDossier:(id: string) => void;
}) {
  const { details, status, doctorId, _id } = appointment;
  const patient  = isPopulatedPatient(appointment.patientId) ? appointment.patientId : null;
  const typeCfg  = TYPE_CONFIG[details.type] ?? TYPE_CONFIG.in_person;
  const isOngoing = status.current === "ongoing";

  const time = new Date(details.scheduledFor).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  });

  // Info patient
  const patientName = patient
    ? `${patient.profile.firstName} ${patient.profile.lastName}`
    : "Patient";
  const patientInitials = patient
    ? `${patient.profile.firstName?.[0] ?? ""}${patient.profile.lastName?.[0] ?? ""}`
    : "?";

  return (
    <div className={`relative flex gap-4 p-4 rounded-2xl border transition-all ${
      isFirst
        ? "bg-white border-[#1e3a8a]/20 shadow-sm"
        : "bg-slate-50/60 border-slate-100 hover:bg-white hover:border-slate-200"
    }`}>
      {/* Barre gauche colorée pour le premier */}
      {isFirst && (
        <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#1e3a8a] rounded-full" />
      )}

      {/* Heure */}
      <div className={`shrink-0 flex flex-col items-center justify-center w-14 py-1 rounded-xl ${
        isFirst ? "bg-[#1e3a8a] text-white" : "bg-slate-200/60 text-slate-600"
      }`}>
        <span className="text-sm font-bold leading-none">{time}</span>
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar patient */}
            {patient?.profile.photo ? (
              <img src={patient.profile.photo} alt={patientName}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center text-xs font-bold text-[#1e3a8a] shrink-0">
                {patientInitials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-slate-900 truncate">{patientName}</p>
                {isOngoing && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    En cours
                  </span>
                )}
                {status.current === "confirmed" && isFirst && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    Prêt
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{details.reason}</p>
            </div>
          </div>

          {/* Type badge */}
          <span className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${typeCfg.color}`}>
            {typeCfg.icon}
            {typeCfg.label}
          </span>
        </div>

        {/* Motif — uniquement pour le premier */}
        {isFirst && details.reason && (
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Motif : </span>
            {details.reason}
          </p>
        )}

        {/* Actions — uniquement pour le premier */}
        {isFirst && (
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => onStart(_id)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors"
            >
              <Video size={13} />
              {isOngoing ? "Reprendre la consultation" : "Démarrer la consultation"}
            </button>
            <button
              onClick={() => onViewDossier(_id)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Voir le dossier
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface NextConsultationsProps {
  onViewAgenda:  () => void;
  onStart:       (id: string) => void;
  onViewDossier: (id: string) => void;
}

export function NextConsultations({ onViewAgenda, onStart, onViewDossier }: NextConsultationsProps) {
  const appointments = useAppointmentStore((s) => s.appointments);
  const isLoading    = useAppointmentStore((s) => s.isLoading);

  // Filtrer : ongoing en priorité puis confirmed, triés par heure
  const upcoming = appointments
    .filter((a) => ["confirmed", "ongoing", "pending"].includes(a.status.current))
    .sort((a, b) =>
      new Date(a.details.scheduledFor).getTime() - new Date(b.details.scheduledFor).getTime()
    )
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Prochaines consultations</h2>
        <button
          onClick={onViewAgenda}
          className="flex items-center gap-1 text-xs font-semibold text-[#1e3a8a] hover:underline"
        >
          Voir l&apos;agenda
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Liste */}
      {isLoading && upcoming.length === 0 ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-slate-300" />
        </div>
      ) : upcoming.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-400">Aucune consultation prévue aujourd&apos;hui</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {upcoming.map((appt, i) => (
            <ConsultationCard
              key={appt._id}
              appointment={appt}
              isFirst={i === 0}
              onStart={onStart}
              onViewDossier={onViewDossier}
            />
          ))}
        </div>
      )}
    </div>
  );
}