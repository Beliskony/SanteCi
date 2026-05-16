import { Video, UserRound } from "lucide-react"
import type { DoctorUser } from "@/app/frontend/store/useAuthStore"

interface ConsultationTarifsProps {
  telemedicine: DoctorUser["telemedicine"]
  location: DoctorUser["location"]
}

const formatFee = (amount: number) =>
  `${amount.toLocaleString("fr-FR")} FCFA`

export default function ConsultationTarifs({ telemedicine, location }: ConsultationTarifsProps) {
  const { consultationFees, consultationTypes } = telemedicine

  const hasVideo = consultationTypes.includes("video")
  const hasAudio = consultationTypes.includes("audio")
  const hasChat  = consultationTypes.includes("chat")

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-base font-bold text-slate-900 mb-5">
        Motifs de consultation &amp; Tarifs
      </h2>

      <div className="flex flex-col gap-5">

        {/* Téléconsultation */}
        {(hasVideo || hasAudio || hasChat) && (
          <div>
            {/* Section header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Video size={15} className="text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Téléconsultation</p>
                <p className="text-xs text-slate-400">Sur l&apos;application SanteCI</p>
              </div>
            </div>

            {/* Tarifs */}
            <div className="flex flex-col gap-2 pl-11">
              {hasVideo && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Première consultation vidéo</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatFee(consultationFees.video)}
                  </span>
                </div>
              )}
              {hasVideo && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Consultation de suivi vidéo</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatFee(Math.round(consultationFees.video * 0.67))}
                  </span>
                </div>
              )}
              {hasAudio && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Consultation audio</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatFee(consultationFees.audio)}
                  </span>
                </div>
              )}
              {hasChat && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Consultation par chat</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatFee(consultationFees.chat)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Séparateur */}
        {(hasVideo || hasAudio || hasChat) && (
          <div className="border-t border-slate-100" />
        )}

        {/* Consultation en cabinet */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <UserRound size={15} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Consultation en cabinet</p>
              <p className="text-xs text-slate-400">
                {location?.address
                  ? `${location.address}, ${location.city}`
                  : location?.city ?? ""}
              </p>
            </div>
          </div>

          {/* Tarifs cabinet — statiques car non présents dans le modèle */}
          <div className="flex flex-col gap-2 pl-11">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Consultation {telemedicine.consultationTypes[0] ?? "générale"}</span>
              <span className="text-sm font-semibold text-slate-900">
                {formatFee(consultationFees.video + 5000)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Électrocardiogramme (ECG)</span>
              <span className="text-sm font-semibold text-slate-900">
                {formatFee(consultationFees.video + 20000)}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}