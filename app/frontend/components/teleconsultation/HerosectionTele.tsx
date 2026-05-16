import { FileText } from 'lucide-react'
import React from 'react'

const HerosectionTele = () => {
  return (
    <section className="flex flex-col lg:flex-row w-full bg-[#1e3a8a] px-6 md:px-12 lg:px-20 py-12 gap-10 items-center mx-auto">

      {/* ── Colonne gauche — textes & actions ── */}
      <div className="w-full lg:w-1/2 flex flex-col gap-6">

        {/* Titre */}
        <div className="flex flex-col">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Consultez un médecin d'où vous voulez, quand vous voulez.
          </h1>
        </div>

        {/* Description */}
        <p className="text-white text-base leading-relaxed max-w-md wrap-break-word">
          La téléconsultation SanteCi vous permet de voir un professionnel de santé en vidéo
          depuis votre téléphone ou votre ordinateur, sans vous déplacer.
        </p>

      </div>

      {/* ── Colonne droite — image + badges flottants ── */}
      <div className="w-full lg:w-1/2 relative">
        <div className="relative rounded-2xl overflow-hidden">
          <img
            src="/HeroSection/medecinpage.jpg"
            alt="Médecin en téléconsultation V2"
            className="w-full h-auto object-cover shadow-lg lg:p-7"
          />


          {/* Badge téléconsultation — en bas à gauche */}
          <div className="absolute bottom-4 left-4 bg-white rounded-xl px-3 py-2.5 flex items-center gap-3 shadow-md">
            <div className="w-10 h-10 rounded-full bg-[#10b981]/20 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-[#10b981]" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-gray-900">Ordonnance en ligne</span>
              <span className="text-xs text-[#10b981]">Disponible immédiatement</span>
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}

export default HerosectionTele