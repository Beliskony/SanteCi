"use client"

import { useState } from "react"
import { Video, MapPin, FileText, RefreshCw, XCircle, X } from "lucide-react"
import type { Appointment } from "@/app/frontend/types/Appointment"
import { isPopulatedDoctor } from "@/app/frontend/types/Appointment"
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore"

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

  const reschedule = useAppointmentStore((s) => s.reschedule)
  const isLoading  = useAppointmentStore((s) => s.isLoading)
  const storeError = useAppointmentStore((s) => s.error)

  const [showModal, setShowModal] = useState(false)
  const [newDateTime, setNewDateTime] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)

  const time = new Date(details.scheduledFor).toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  })
  const dayLabel = new Date(details.scheduledFor)
    .toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase()

  const handleOpenModal = () => {
    setLocalError(null)
    setNewDateTime("")
    setShowModal(true)
  }

  const handleConfirmReschedule = async () => {
    if (!newDateTime) {
      setLocalError("Veuillez choisir une date et une heure.")
      return
    }
    const chosen = new Date(newDateTime)
    if (chosen.getTime() <= Date.now()) {
      setLocalError("La nouvelle date doit être dans le futur.")
      return
    }
    setLocalError(null)
    try {
      await reschedule(appointment._id, chosen.toISOString())
      setShowModal(false)
    } catch {
      // l'erreur est déjà dans storeError
    }
  }

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
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
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

      {/* ── Modal de reprogrammation ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Reprogrammer le rendez-vous</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Avec {doctor ? `${doctor.profile.title ?? "Dr"} ${doctor.profile.firstName} ${doctor.profile.lastName}` : "votre médecin"}
            </p>

            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Nouvelle date et heure
            </label>
            <input
              type="datetime-local"
              value={newDateTime}
              onChange={(e) => setNewDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition mb-3"
            />

            {(localError || storeError) && (
              <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg mb-3">
                {localError ?? storeError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {isLoading ? "..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}