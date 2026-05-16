"use client";

import { useState, useEffect } from "react";
import { Building2, ArrowDown } from "lucide-react";
import { useHospitalStore } from "../../store/hopitalStore";
import HopitalBox from "../HopitalBox";

interface ResultGridProps {
  city?: string;
}

const TYPE_FILTERS = [
  { label: "Clinique privée", value: "clinic" as const },
  { label: "Hôpital public", value: "hospital" as const },
  { label: "Centre de santé", value: "community" as const },
  { label: "Laboratoire", value: "laboratory" as const },
];

type FacilityType = 'clinic' | 'hospital' | 'laboratory' | 'pharmacy' | 'imaging_center';

const ResultSection = ({ city = "Abidjan" }: ResultGridProps) => {
  const { facilities, pagination, isLoading, search } = useHospitalStore();
  const [selectedTypes, setSelectedTypes] = useState<FacilityType[]>(["clinic", "hospital"]);
  const [activeType, setActiveType] = useState<FacilityType>("hospital");

  const toggleType = (value: FacilityType) => {
    let newTypes: FacilityType[];
    if (selectedTypes.includes(value)) {
      newTypes = selectedTypes.filter((v) => v !== value);
    } else {
      newTypes = [...selectedTypes, value];
    }
    setSelectedTypes(newTypes);
    
    // Choisir le premier type sélectionné pour l'API
    const typeToSend = newTypes.length > 0 ? newTypes[0] : "hospital";
    setActiveType(typeToSend);
    
    // Rechercher avec le type unique
    search({
      city,
      type: typeToSend, // Maintenant c'est du type FacilityType
      limit: 12,
      page: 1,
    });
  };

  const loadMore = () => {
    if (pagination.page < pagination.pages) {
      search({
        city,
        type: activeType, // Maintenant c'est du type FacilityType
        page: pagination.page + 1,
        limit: 12,
      });
    }
  };

  // Ne pas faire de recherche automatique ici

  if (isLoading && facilities.length === 0) {
    return (
      <section className="bg-[#f4f6fb] py-10">
        <div className="max-w-7xl mx-auto px-6 text-center py-20">
          <div className="text-gray-500">Chargement...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#f4f6fb] w-full px-6 md:px-12 lg:px-20 py-10">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-64 shrink-0">
          <div className="bg-white rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Type d'établissement</h3>
            <div className="flex flex-col gap-2">
              {TYPE_FILTERS.map((f) => (
                <label key={f.value} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(f.value as FacilityType)}
                    onChange={() => toggleType(f.value as FacilityType)}
                    className="w-4 h-4 accent-[#1e3a8a] rounded"
                  />
                  <span className="text-sm text-gray-600">{f.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Note: La recherche utilise le premier type sélectionné
            </p>
          </div>
        </aside>

        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {pagination.total > 0
              ? `${pagination.total} établissements à ${city}`
              : `Établissements à ${city}`}
          </h2>

          {facilities.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {facilities.map((hospital) => (
                  <HopitalBox key={hospital._id.toString()} hospital={hospital} />
                ))}
              </div>

              {pagination.page < pagination.pages && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {isLoading ? "Chargement..." : "Voir plus"}
                    {!isLoading && <ArrowDown size={15} />}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Building2 size={40} className="text-gray-300" />
              <p className="text-sm">Aucun établissement trouvé.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ResultSection;