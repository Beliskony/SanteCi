"use client";

import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { useDoctorStore } from "@/app/frontend/store/otherStore";

const FilterSection = () => {
  const { fetchDoctors, isLoading } = useDoctorStore();

  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");

  const handleSearch = () => {
    fetchDoctors({
      specialty: specialty.trim() || undefined,
      city: city.trim() || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="bg-white px-6 md:px-10 lg:px-14 py-5">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-5xl mx-auto">

        {/* Champ spécialité */}
        <div className="flex items-center gap-2.5 flex-1 bg-[#f4f6fb] shadow rounded-lg px-4 py-3">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Spécialité, nom du médecin..."
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent min-w-0"
          />
        </div>

        {/* Séparateur vertical — desktop uniquement */}
        <div className="hidden sm:block w-px h-8 bg-gray-200 shrink-0" />

        {/* Champ ville */}
        <div className="flex items-center gap-2.5 flex-1 bg-[#f4f6fb] shadow rounded-lg px-4 py-3">
          <MapPin size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Ville, quartier..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent min-w-0"
          />
        </div>

        {/* Bouton rechercher */}
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="w-full sm:w-auto bg-[#1e3a8a] hover:bg-[#2d4fa8] disabled:bg-[#1e3a8a]/60 disabled:cursor-not-allowed text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors duration-200 shrink-0"
        >
          {isLoading ? "Recherche..." : "Rechercher"}
        </button>

      </div>
    </div>
  );
};

export default FilterSection;