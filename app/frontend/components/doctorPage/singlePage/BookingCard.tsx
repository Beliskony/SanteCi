"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MapPin } from "lucide-react"
import SlotPicker from "./localisation/SlotPicker"
import type { DoctorUser } from "@/app/frontend/store/useAuthStore"
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore"
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore"
import type { ConsultationType, Priority, Currency, PaymentMethod } from "@/app/frontend/types/Appointment"

interface BookingCardProps {
  telemedicine: DoctorUser["telemedicine"]
  location: DoctorUser["location"]
  doctor: DoctorUser
}

const CONSULTATION_LABELS: Record<string, string> = {
  video: "Première consultation vidéo",
  audio: "Consultation audio",
  chat:  "Consultation par chat",
}

const formatFee = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`

export default function BookingCard({ telemedicine, location, doctor }: BookingCardProps) {
  const router = useRouter()
  const { consultationTypes, consultationFees, availability } = telemedicine
  const { create, isLoading: isCreating } = useAppointmentStore()
  const user = useAuthStore((state) => state.user)

  const [selectedType, setSelectedType] = useState<"video" | "audio" | "chat">(
    consultationTypes[0] ?? "video"
  )
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const feeMap = useMemo(() => ({
    video: consultationFees.video,
    audio: consultationFees.audio,
    chat:  consultationFees.chat,
  }), [consultationFees]);

  const handleConfirm = useCallback(async () => {
    if (!selectedSlot) return;
    
    // Vérifier si l'utilisateur est connecté
    if (!user) {
      router.push(`/login?redirect=/doctor/${doctor._id}`);
      return;
    }
    
    if (!isPatient(user)) {
      setError("Seuls les patients peuvent prendre rendez-vous");
      return;
    }
    
    setError(null);
    
    try {
      // Convertir le slot sélectionné en Date ISO
      const [date, time] = selectedSlot.split('T');
      const scheduledFor = new Date(`${date}T${time}:00`);
      
      // Créer le rendez-vous selon le DTO attendu
      const appointment = await create({
        patientId: user._id.toString(),
        doctorId: doctor._id.toString(),
        type: selectedType as ConsultationType,
        scheduledFor: scheduledFor.toISOString(),
        duration: 30, // Durée par défaut en minutes, à adapter si besoin
        reason: `Consultation ${CONSULTATION_LABELS[selectedType].toLowerCase()}`,
        symptoms: [],
        priority: "medium" as Priority,
        payment: {
          amount: feeMap[selectedType],
          currency: "XOF" as Currency,
          method: "mobile_money" as PaymentMethod,
          provider: "orange_money",
        },
      });

      // 🔍 Log complet pour voir la structure
    console.log("✅ RDV créé - Structure complète:", JSON.stringify(appointment, null, 2));
    console.log("📌 ID du RDV:", appointment._id);
    console.log("📌 Type de l'ID:", typeof appointment._id);
      
      // Rediriger vers la page de paiement
      router.push(`/payment?appointmentId=${appointment._id}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la réservation");
    }
  }, [selectedSlot, doctor, selectedType, feeMap, user, router, create]);

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

          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Bouton confirmation */}
          <div>
            <button
              onClick={handleConfirm}
              disabled={!selectedSlot || isCreating}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-150
                ${
                  selectedSlot && !isCreating
                    ? "bg-blue-900 text-white hover:bg-blue-800 shadow-sm"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
            >
              {isCreating ? "Création du rendez-vous..." : "Confirmer et payer"}
            </button>
            {selectedSlot && !isCreating && (
              <p className="text-xs text-slate-400 text-center mt-2">
                Vous serez redirigé vers la page de paiement sécurisé.
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