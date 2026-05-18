"use client"

import { Video, MapPin, FileText, RefreshCw, XCircle } from "lucide-react"
import type { Appointment } from "@/app/frontend/types/Appointment"
import { isPopulatedDoctor } from "@/app/frontend/types/Appointment"

interface Props {
  appointment: Appointment
  variant: "past" | "cancelled"
}

const TYPE_LABELS: Record<string, string> = {
  video:     "Téléconsultation",
  audio:     "Consultation audio",
  chat:      "Consultation chat",
  in_person: "En cabinet",
}

export default function AppointmentCardPast({ appointment, variant }: Props) {
  const { details, status, payment, doctorId } = appointment
  const doctor      = isPopulatedDoctor(doctorId) ? doctorId : null
  const isCancelled = variant === "cancelled"
  const isInPerson  = details.type === "in_person"
  const isVideo     = details.type === "video"

  const time = new Date(details.scheduledFor).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  })
  const dayLabel = new Date(details.scheduledFor)
    .toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase()

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${
      isCancelled ? "border-red-100" : "border-slate-200"
    }`}>
      <div className="flex">

        {/* ── Sidebar date ── */}
        <div className={`flex flex-col items-center justify-center px-4 py-5 min-w-22 shrink-0 border-r ${
          isCancelled ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"
        }`}>
          <span className={`text-[10px] font-bold tracking-wide mb-1 text-center ${
            isCancelled ? "text-red-400" : "text-slate-400"
          }`}>
            {dayLabel}
          </span>
          <span className={`text-2xl font-bold leading-none ${
            isCancelled ? "text-red-400" : "text-slate-500"
          }`}>
            {time}
          </span>
          <span className="text-[11px] text-slate-400 mt-1.5">
            Durée {details.duration}min
          </span>
        </div>

        {/* ── Contenu principal ── */}
        <div className="flex-1 p-4 flex flex-col gap-3 min-w-0">

          {/* Médecin + badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold ${
                isCancelled ? "bg-red-100 text-red-400" : "bg-slate-200 text-slate-500"
              }`}>
                {doctor?.profile.firstName?.[0]}{doctor?.profile.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-700 truncate">
                  {doctor
                    ? `${doctor.profile.title ?? "Dr"} ${doctor.profile.firstName} ${doctor.profile.lastName}`
                    : "Médecin"}
                </p>
                <p className="text-xs text-blue-900 font-medium">{doctor?.profile.specialty}</p>
              </div>
            </div>
            {isCancelled ? (
              <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                <XCircle size={11} />
                Annulé
              </span>
            ) : (
              <span className="shrink-0 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                Terminé
              </span>
            )}
          </div>

          {/* Infos 2 colonnes */}
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
                {isInPerson ? "Localisation" : "Type"}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                {isVideo
                  ? <Video size={12} className="text-blue-900 shrink-0" />
                  : <MapPin size={12} className="text-slate-400 shrink-0" />}
                <span className="truncate">{TYPE_LABELS[details.type]}</span>
              </div>
            </div>

            {payment?.amount > 0 && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
                  Paiement
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <FileText size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">
                    {status.paymentStatus === "paid" ? "Payé" : "Non payé"} ({payment.amount.toLocaleString("fr-FR")} {payment.currency})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Raison d'annulation */}
          {isCancelled && status.cancellationReason && (
            <p className="text-xs text-red-400 italic">{status.cancellationReason}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <RefreshCw size={11} />
              Reprogrammer
            </button>
            {!isCancelled && (
              <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-500 border border-red-100 rounded-xl hover:bg-red-50 transition-colors">
                <XCircle size={11} />
                Annuler
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}