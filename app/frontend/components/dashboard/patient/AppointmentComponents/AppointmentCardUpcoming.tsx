"use client"

import { Video, MapPin, FileText, MoreHorizontal, XCircle, RefreshCw } from "lucide-react"
import type { Appointment } from "@/app/frontend/types/Appointment"
import { isPopulatedDoctor } from "@/app/frontend/types/Appointment"
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore"

interface Props {
  appointment: Appointment
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmé",   className: "text-emerald-600 bg-emerald-50 border border-emerald-200" },
  pending:   { label: "En attente", className: "text-amber-600 bg-amber-50 border border-amber-200" },
  ongoing:   { label: "En cours",   className: "text-blue-700 bg-blue-50 border border-blue-200" },
}

const TYPE_LABELS: Record<string, string> = {
  video:     "Téléconsultation",
  audio:     "Consultation audio",
  chat:      "Consultation chat",
  in_person: "En cabinet",
}

export default function AppointmentCardUpcoming({ appointment }: Props) {
  const { join, cancel } = useAppointmentStore()
  const { details, status, payment, doctorId, _id } = appointment

  const doctor     = isPopulatedDoctor(doctorId) ? doctorId : null
  const isToday    = new Date(details.scheduledFor).toDateString() === new Date().toDateString()
  const isVideo    = details.type === "video"
  const isInPerson = details.type === "in_person"
  const statusCfg  = STATUS_CONFIG[status.current] ?? STATUS_CONFIG.pending
  const canJoin    = isVideo && status.current === "confirmed"

  const time = new Date(details.scheduledFor).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  })
  const dayLabel = isToday
    ? "AUJOURD'HUI"
    : new Date(details.scheduledFor)
        .toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
        .toUpperCase()

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex">

        {/* ── Sidebar date ── */}
        <div className={`flex flex-col items-center justify-center px-4 py-5 min-w-22 shrink-0 border-r ${
          isToday ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
        }`}>
          <span className={`text-[10px] font-bold tracking-wide mb-1 text-center ${
            isToday ? "text-emerald-600" : "text-slate-400"
          }`}>
            {dayLabel}
          </span>
          <span className={`text-2xl font-bold leading-none ${
            isToday ? "text-emerald-700" : "text-slate-700"
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
              <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-sm font-bold text-slate-500">
                {doctor?.profile.firstName?.[0]}{doctor?.profile.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {doctor
                    ? `${doctor.profile.title ?? "Dr"} ${doctor.profile.firstName} ${doctor.profile.lastName}`
                    : "Médecin"}
                </p>
                <p className="text-xs text-blue-900 font-medium">{doctor?.profile.specialty}</p>
              </div>
            </div>
            <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.className}`}>
              {statusCfg.label}
            </span>
          </div>

          {/* Infos 2 colonnes */}
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
                {isInPerson ? "Localisation" : "Type"}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                {isVideo
                  ? <Video size={12} className="text-blue-900 shrink-0" />
                  : <MapPin size={12} className="text-slate-400 shrink-0" />}
                <span className="truncate">{TYPE_LABELS[details.type]}</span>
              </div>
              {isVideo && (
                <p className="text-[11px] text-slate-400 mt-0.5">Le lien sera actif 5min avant</p>
              )}
            </div>

            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
                {payment?.amount > 0 && status.paymentStatus === "paid" ? "Paiement" : "Motif"}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                <FileText size={12} className="text-slate-400 shrink-0" />
                <span className="truncate">
                  {payment?.amount > 0 && status.paymentStatus === "paid"
                    ? `Payé (${payment.amount.toLocaleString("fr-FR")} ${payment.currency})`
                    : details.reason}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {canJoin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => join(_id, "patient")}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Video size={14} />
                Rejoindre la consultation
              </button>
              <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                <MoreHorizontal size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <RefreshCw size={11} />
                Reprogrammer
              </button>
              <button
                onClick={() => cancel(_id, "patient", "Annulé par le patient")}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-500 border border-red-100 rounded-xl hover:bg-red-50 transition-colors"
              >
                <XCircle size={11} />
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}