"use client"

import { useState } from "react"
import { MapPin } from "lucide-react"
import SlotPicker from "./localisation/SlotPicker"
import type { DoctorUser } from "@/app/frontend/store/useAuthStore"

interface BookingCardProps {
  telemedicine: DoctorUser["telemedicine"]
  location: DoctorUser["location"]
  doctorId: string
}

const CONSULTATION_LABELS: Record<string, string> = {
  video: "Première consultation vidéo",
  audio: "Consultation audio",
  chat:  "Consultation par chat",
}

const formatFee = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`

export default function BookingCard({ telemedicine, location, doctorId }: BookingCardProps) {
  const { consultationTypes, consultationFees, availability } = telemedicine

  const [selectedType, setSelectedType]   = useState<"video" | "audio" | "chat">(
    consultationTypes[0] ?? "video"
  )
  const [selectedSlot, setSelectedSlot]   = useState<string | null>(null)

  const feeMap: Record<string, number> = {
    video: consultationFees.video,
    audio: consultationFees.audio,
    chat:  consultationFees.chat,
  }

  const handleConfirm = () => {
    if (!selectedSlot) return
    // TODO: brancher doctorService.getAvailableSlots() puis navigation vers page paiement
    console.log({ doctorId, type: selectedType, slot: selectedSlot })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Carte principale RDV */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header bleu */}
        <div className="bg-blue-900 px-6 py-4 text-center">
          <p className="text-white font-bold text-base">Prendre rendez-vous</p>
          <p className="text-blue-200 text-xs mt-0.5">Sélectionnez un motif et un créneau</p>
        </div>

        <div className="p-5 flex flex-col gap-5">

          {/* Motif de consultation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Motif de consultation
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as "video" | "audio" | "chat")
                setSelectedSlot(null)
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition"
            >
              {consultationTypes.map((type) => (
                <option key={type} value={type}>
                  {CONSULTATION_LABELS[type]} ({formatFee(feeMap[type])})
                </option>
              ))}
            </select>
          </div>

          {/* Sélecteur de créneaux */}
          <SlotPicker
            availability={availability}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />

          {/* Bouton confirmation */}
          <div>
            <button
              onClick={handleConfirm}
              disabled={!selectedSlot}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-150
                ${
                  selectedSlot
                    ? "bg-blue-900 text-white hover:bg-blue-800 shadow-sm"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
            >
              Confirmer l&apos;heure
            </button>
            {selectedSlot && (
              <p className="text-xs text-slate-400 text-center mt-2">
                Vous pourrez confirmer les détails et payer à l&apos;étape suivante.
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Carte localisation */}
      {location?.city && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <MapPin size={16} className="text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {location.district ?? "Polyclinique Internationale"}
            </p>
            <p className="text-xs text-slate-400">
              {location.address ? `${location.address}, ` : ""}
              {location.city}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}