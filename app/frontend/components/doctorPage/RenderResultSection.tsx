"use client";

import { useEffect } from "react";
import { MapPin, Building2, Video, MessageSquare, Star, ChevronDown } from "lucide-react";
import { useDoctorStore } from "@/app/frontend/store/otherStore";
import CheckBoxSectionSide from "./CheckBoxSectionSide";
import type { DoctorUser } from "@/app/frontend/types";

// ── Créneaux fictifs pour la démo (à remplacer par les vraies dispo) ──
const MOCK_SLOTS = [
  "Auj. 14:30", "Auj. 16:00", "Demain 09:00", "Demain 10:30", "Jeu 11:00",
];

const RenderResultSection = () => {
  const { doctors, isLoading, error, pagination, fetchDoctors } = useDoctorStore();

  useEffect(() => {
    fetchDoctors({ page: 1, limit: 10 });
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-6 px-6 py-6 bg-[#f4f6fb] min-h-screen">

      {/* ── Sidebar filtres ── */}
      <CheckBoxSectionSide />

      {/* ── Colonne résultats ── */}
      <div className="flex flex-col flex-1 gap-4">

        {/* En-tête résultats */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">
            {isLoading
              ? "Recherche en cours..."
              : `${pagination.total} médecin${pagination.total > 1 ? "s" : ""} trouvé${pagination.total > 1 ? "s" : ""}`}
          </p>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>Trier par :</span>
            <button className="flex items-center gap-1 font-medium text-gray-700 hover:text-[#1e3a8a] transition-colors">
              Pertinence
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Skeleton loader */}
        {isLoading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Liste des médecins */}
        {!isLoading && doctors.length === 0 && (
          <div className="bg-white rounded-2xl px-6 py-12 text-center text-gray-400 text-sm">
            Aucun médecin trouvé pour ces critères.
          </div>
        )}

        {!isLoading && doctors.map((doctor) => (
          <DoctorCard key={String(doctor._id)} doctor={doctor} />
        ))}

        {/* Bouton charger plus */}
        {!isLoading && doctors.length > 0 && pagination.page < pagination.pages && (
          <button
            onClick={() => fetchDoctors({ page: pagination.page + 1, limit: 10 })}
            className="mx-auto mt-2 px-8 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 rounded-xl transition-colors"
          >
            Afficher plus de résultats
          </button>
        )}

      </div>
    </div>
  );
};

// ── Card médecin ──────────────────────────────────────────────

const DoctorCard = ({ doctor }: { doctor: Partial<DoctorUser> }) => {
  const fees = doctor.telemedicine?.consultationFees;
  const types = doctor.telemedicine?.consultationTypes ?? [];

  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col gap-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">

      {/* ── Ligne principale ── */}
      <div className="flex gap-4">

        {/* Photo */}
        <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden shrink-0">
          {doctor.profile?.photo ? (
            <img
              src={doctor.profile.photo}
              alt={`${doctor.profile.firstName} ${doctor.profile.lastName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400">
              {doctor.profile?.firstName?.[0]}{doctor.profile?.lastName?.[0]}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {doctor.profile?.title} {doctor.profile?.firstName} {doctor.profile?.lastName}
              </h3>
              <p className="text-sm text-[#1e3a8a] font-medium">
                {doctor.profile?.specialty}
              </p>
            </div>
            {/* Note */}
            {(doctor.telemedicine?.rating ?? 0) && (
              <div className="flex items-center gap-1 shrink-0">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-semibold text-gray-800">
                  {doctor.telemedicine?.rating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">
                  ({doctor.analytics?.totalPatients ?? 0})
                </span>
              </div>
            )}
          </div>

          {/* Localisation + établissement */}
          <div className="flex items-center gap-3 flex-wrap">
            {doctor.location?.city && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={12} className="shrink-0" />
                {doctor.location.district ? `${doctor.location.district}, ` : ""}
                {doctor.location.city}
              </span>
            )}
            {(doctor.affiliations?.hospitals?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Building2 size={12} className="shrink-0" />
                Établissement affilié
              </span>
            )}
          </div>

          {/* Tags types + tarifs */}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {types.includes("video") && fees?.video && (
              <span className="flex items-center gap-1 text-xs bg-blue-50 text-[#1e3a8a] px-2.5 py-1 rounded-full font-medium">
                <Video size={11} />
                Vidéo ({fees.video.toLocaleString("fr-FR")} FCFA)
              </span>
            )}
            {types.includes("audio") && fees?.audio && (
              <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                <Building2 size={11} />
                Cabinet ({fees.audio.toLocaleString("fr-FR")} FCFA)
              </span>
            )}
            {types.includes("chat") && fees?.chat && (
              <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                <MessageSquare size={11} />
                Chat ({fees.chat.toLocaleString("fr-FR")} FCFA)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Prochaines disponibilités ── */}
      <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
        <p className="text-xs text-gray-500 font-medium">Prochaines disponibilités</p>
        <div className="flex items-center gap-2 flex-wrap">
          {MOCK_SLOTS.slice(0, 5).map((slot, i) => (
            <button
              key={slot}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                i === 0
                  ? "bg-[#1e3a8a] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-[#1e3a8a]"
              }`}
            >
              {slot}
            </button>
          ))}
          <button className="text-xs text-[#1e3a8a] font-medium hover:underline">
            Plus d'horaires
          </button>
        </div>
      </div>

    </div>
  );
};

export default RenderResultSection;