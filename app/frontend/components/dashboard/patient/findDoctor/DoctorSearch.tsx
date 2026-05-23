"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import type { DoctorFilters } from "@/app/frontend/services/doctorService";

const SPECIALTIES = [
  "Généraliste", "Pédiatre", "Gynécologue", "Cardiologue",
  "Dermatologue", "Ophtalmologue", "Dentiste", "Psychiatre",
  "Neurologue", "Orthopédiste",
];

const CONSULTATION_TYPES: { value: DoctorFilters["consultationType"]; label: string; emoji: string }[] = [
  { value: "video", label: "Vidéo",  emoji: "🎥" },
  { value: "audio", label: "Audio",  emoji: "📞" },
  { value: "chat",  label: "Chat",   emoji: "💬" },
];

const CITIES = ["Abidjan", "Bouaké", "Daloa", "Korhogo", "Yamoussoukro", "San-Pédro"];

const RATINGS = [
  { value: 4.5, label: "4.5+ ⭐" },
  { value: 4,   label: "4.0+ ⭐" },
  { value: 3,   label: "3.0+ ⭐" },
];

interface DoctorSearchProps {
  onSearch: (filters: DoctorFilters) => void;
  isLoading: boolean;
}

export function DoctorSearch({ onSearch, isLoading }: DoctorSearchProps) {
  const [query,           setQuery]           = useState("");
  const [specialty,       setSpecialty]       = useState("");
  const [consultationType,setConsultationType]= useState<DoctorFilters["consultationType"]>(undefined);
  const [city,            setCity]            = useState("");
  const [minRating,       setMinRating]       = useState<number | undefined>(undefined);
  const [maxFee,          setMaxFee]          = useState<number | undefined>(undefined);
  const [isAvailable,     setIsAvailable]     = useState<boolean | undefined>(undefined);
  const [showFilters,     setShowFilters]     = useState(false);

  const activeFilters = [specialty, consultationType, city, minRating, maxFee, isAvailable]
    .filter((v) => v !== undefined && v !== "").length;

  const handleSearch = () => {
    onSearch({
      specialty:        specialty        || undefined,
      consultationType: consultationType || undefined,
      city:             city             || undefined,
      minRating:        minRating        || undefined,
      maxFee:           maxFee           || undefined,
      isAvailable:      isAvailable      ?? undefined,
      page: 1,
    });
  };

  const handleReset = () => {
    setSpecialty(""); setConsultationType(undefined); setCity("");
    setMinRating(undefined); setMaxFee(undefined); setIsAvailable(undefined);
    onSearch({ page: 1 });
  };

  return (
    <div className="flex flex-col gap-3">

      {/* ── Barre principale ── */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Nom du médecin, spécialité..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Toggle filtres */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all ${
            showFilters || activeFilters > 0
              ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
          }`}
        >
          <SlidersHorizontal size={15} />
          <span className="hidden sm:inline">Filtres</span>
          {activeFilters > 0 && (
            <span className="w-4 h-4 rounded-full bg-white text-[#1e3a8a] text-[10px] font-bold flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>

        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-5 py-2.5 text-sm font-bold text-white bg-[#1e3a8a] rounded-xl hover:bg-blue-800 disabled:opacity-60 transition-colors"
        >
          {isLoading ? "..." : "Rechercher"}
        </button>
      </div>

      {/* ── Filtres avancés ── */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Spécialité */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Spécialité
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1e3a8a] text-slate-700"
              >
                <option value="">Toutes les spécialités</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Ville */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Ville
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1e3a8a] text-slate-700"
              >
                <option value="">Toutes les villes</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Note minimum */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Note minimum
              </label>
              <div className="flex gap-1.5">
                {RATINGS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setMinRating(minRating === value ? undefined : value)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      minRating === value
                        ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Type de consultation */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Type de consultation
              </label>
              <div className="flex gap-1.5">
                {CONSULTATION_TYPES.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    onClick={() => setConsultationType(consultationType === value ? undefined : value)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                      consultationType === value
                        ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tarif max */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Tarif maximum (F CFA)
              </label>
              <input
                type="number"
                value={maxFee ?? ""}
                onChange={(e) => setMaxFee(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Ex: 15000"
                min={0}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1e3a8a] text-slate-700 placeholder:text-slate-400"
              />
            </div>

            {/* Disponible maintenant */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Disponibilité
              </label>
              <button
                onClick={() => setIsAvailable(isAvailable === true ? undefined : true)}
                className={`w-full py-2 text-xs font-medium rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  isAvailable === true
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isAvailable ? "bg-white" : "bg-emerald-400"}`} />
                Disponible maintenant
              </button>
            </div>
          </div>

          {/* Ligne du bas : reset + appliquer */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            {activeFilters > 0 ? (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
              >
                <X size={12} />
                Réinitialiser ({activeFilters} filtre{activeFilters > 1 ? "s" : ""})
              </button>
            ) : (
              <span className="text-xs text-slate-400">Aucun filtre actif</span>
            )}
            <button
              onClick={() => { handleSearch(); setShowFilters(false); }}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#1e3a8a] rounded-lg hover:bg-blue-800 transition-colors"
            >
              Appliquer les filtres
            </button>
          </div>
        </div>
      )}
    </div>
  );
}