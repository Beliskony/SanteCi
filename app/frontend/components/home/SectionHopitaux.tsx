"use client";

import { useEffect } from "react";
import Link from "next/link";
import HopitalBox from "@/app/frontend/components/HopitalBox";
import { useHospitalStore } from "../../store/hopitalStore";

const SectionHopitauxClient = () => {
  const { facilities, isLoading, error, search } = useHospitalStore();

  useEffect(() => {
    search({ limit: 3, page: 1 });
  }, []);

  return (
    <section className="bg-[#e2e8f0] w-full px-6 md:px-12 lg:px-20 py-16">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">

        {/* En-tête centré */}
        <div className="flex flex-col items-center text-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Nos hôpitaux et cliniques partenaires
          </h2>
          <p className="text-gray-500 text-sm md:text-base leading-relaxed max-w-xl">
            SanteCi collabore avec les meilleurs établissements de santé pour vous garantir des soins de qualité.
          </p>
        </div>

        {/* États */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-72 h-64 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-center text-sm text-red-400">{error}</p>
        ) : facilities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {facilities.slice(0, 3).map((hospital) => (
              <HopitalBox key={hospital._id.toString()} hospital={hospital} />
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400">
            Aucun établissement disponible pour le moment.
          </p>
        )}

        {/* Bouton voir tous */}
        <div className="flex justify-center">
          <Link
            href="/hospitals"
            className="px-8 py-3 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Voir tous les établissements
          </Link>
        </div>

      </div>
    </section>
  );
};

export default SectionHopitauxClient;