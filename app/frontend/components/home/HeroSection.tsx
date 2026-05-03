"use client";

import { Search, MapPin, CircleCheckBig, Video } from "lucide-react";

const listCheck = [
  "Médecins certifiés",
  "Paiement sécurisé",
  "Données protégées",
];

const HeroSection = () => {
  return (
    <section className="flex flex-col lg:flex-row w-full bg-white px-6 md:px-12 lg:px-20 py-12 gap-10 items-center mx-auto">

      {/* ── Colonne gauche — textes & actions ── */}
      <div className="w-full lg:w-1/2 flex flex-col gap-6">

        {/* Badge disponibilité */}
        <div className="inline-flex items-center gap-2 self-start border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
          <span className="text-sm text-gray-600">Téléconsultation disponible 24/7</span>
        </div>

        {/* Titre */}
        <div className="flex flex-col">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Votre santé, simplifiée.
          </h1>
          <span className="text-4xl md:text-5xl font-bold text-[#1e3a8a] leading-tight">
            Trouvez le bon médecin.
          </span>
        </div>

        {/* Description */}
        <p className="text-gray-500 text-base leading-relaxed max-w-md">
          Prenez rendez-vous en cabinet ou consultez en vidéo avec des milliers
          de professionnels de santé certifiés en Côte d'Ivoire. Sécurisé,
          rapide et fiable.
        </p>

        {/* Barre de recherche */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white">
          {/* Champ spécialité */}
          <div className="flex items-center gap-2 px-4 py-3 flex-1 min-w-0">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Spécialité, médecin..."
              className="text-sm text-gray-500 placeholder-gray-400 outline-none w-full bg-transparent"
            />
          </div>

          {/* Séparateur vertical */}
          <div className="hidden sm:block w-px bg-gray-200 self-stretch my-2.5" />
          {/* Séparateur horizontal mobile */}
          <div className="block sm:hidden h-px bg-gray-200 mx-4" />

          {/* Champ ville */}
          <div className="flex items-center gap-2 px-4 py-3 flex-1 min-w-0">
            <MapPin size={18} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Ville, quartier"
              className="text-sm text-gray-500 placeholder-gray-400 outline-none w-full bg-transparent"
            />
          </div>

          {/* Bouton rechercher */}
          <div className="p-2">
            <button className="w-full sm:w-auto bg-[#1e3a8a] hover:bg-[#3742fa] transition-colors text-white text-sm font-semibold px-6 py-3 rounded-lg">
              Rechercher
            </button>
          </div>
        </div>

        {/* Checklist */}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {listCheck.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <CircleCheckBig size={17} className="text-[#10b981] shrink-0" />
              <span className="text-sm text-gray-500">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Colonne droite — image + badges flottants ── */}
      <div className="w-full lg:w-1/2 relative">
        <div className="relative rounded-2xl overflow-hidden">
          <img
            src="/HeroSection/doctor.jpg"
            alt="Médecin en téléconsultation"
            className="w-full h-auto object-cover shadow-lg lg:p-7"
          />

          {/* Badge patients — en haut à droite */}
          <div className="absolute top-4 right-4 bg-white rounded-xl px-3 py-2 flex items-center gap-3 shadow-md">
            {/* Avatars superposés */}
            <div className="flex -space-x-2">
              <img
                src="/HeroSection/avatar1.jpg"
                alt="Patient"
                className="w-8 h-8 rounded-full border-2 border-white object-cover"
              />
              <img
                src="/HeroSection/avatar2.jpg"
                alt="Patient"
                className="w-8 h-8 rounded-full border-2 border-white object-cover"
              />
              <img
                src="/HeroSection/avatar3.jpg"
                alt="Patient"
                className="w-8 h-8 rounded-full border-2 border-white object-cover"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-gray-900">+10 000</span>
              <span className="text-xs text-gray-500">Patients conquis</span>
            </div>
          </div>

          {/* Badge téléconsultation — en bas à gauche */}
          <div className="absolute bottom-4 left-4 bg-white rounded-xl px-3 py-2.5 flex items-center gap-3 shadow-md animate-bounce">
            <div className="w-10 h-10 rounded-full bg-[#10b981]/20 flex items-center justify-center shrink-0">
              <Video size={18} className="text-[#10b981]" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-gray-900">Téléconsultation</span>
              <span className="text-xs text-[#10b981]">Dès maintenant</span>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default HeroSection;