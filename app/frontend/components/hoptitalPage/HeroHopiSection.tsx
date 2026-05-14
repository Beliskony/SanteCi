"use client";

import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { useHospitalStore } from "@/app/frontend/store/hopitalStore";

const HeroHopiSection = () => {
  const { search, isLoading } = useHospitalStore();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  const handleSearch = () => {
    search({
      city: city.trim() || undefined,
      specialty: name.trim() || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <section className="w-full bg-[#1e3a8a] min-h-110 flex flex-col items-center justify-center px-6 py-16 gap-5 text-white text-center">

      {/* Titre */}
      <h1 className="text-4xl font-bold leading-tight">
        Trouvez un hôpital ou une clinique
      </h1>

      {/* Sous-titre */}
      <p className="text-sm text-white/80 max-w-xl leading-relaxed">
        Découvrez nos établissements partenaires, consultez leurs spécialités
        et prenez rendez-vous avec leurs médecins.
      </p>

      {/* Barre de recherche */}
      <div className="flex items-center bg-white rounded-xl shadow-lg w-full max-w-2xl mt-2 overflow-hidden">

        {/* Champ nom / spécialité */}
        <div className="flex items-center gap-2.5 flex-1 px-4 py-3.5">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Nom de l'établissement, spécialité..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>

        {/* Séparateur vertical */}
        <div className="w-px h-6 bg-gray-200 shrink-0" />

        {/* Champ ville */}
        <div className="flex items-center gap-2.5 flex-1 px-4 py-3.5">
          <MapPin size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Ville, commune..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>

        {/* Bouton */}
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="bg-[#1e3a8a] hover:bg-[#2d4fa8] disabled:bg-[#1e3a8a]/70 text-white text-sm font-semibold px-7 py-3.5 transition-colors duration-200 shrink-0 m-2 rounded-2xl"
        >
          {isLoading ? "Recherche..." : "Rechercher"}
        </button>
      </div>

    </section>
  );
};

export default HeroHopiSection;