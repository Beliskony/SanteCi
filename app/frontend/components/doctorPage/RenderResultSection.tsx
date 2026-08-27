"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MapPin, Building2, Video, MessageSquare, Star, ChevronDown, BadgeCheck } from "lucide-react";
import { useDoctorStore } from "@/app/frontend/store/otherStore";
import CheckBoxSectionSide from "./CheckBoxSectionSide";
import type { DoctorUser } from "@/app/frontend/types";
import { getDoctorTier } from "@/app/frontend/lib/doctorBadge";

// ── Prochains créneaux réels à partir de doctor.telemedicine.availability ──
type AvailabilitySlot = { start: string; end: string; isBooked: boolean };
type AvailabilityDay = {
  day: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche";
  slots: AvailabilitySlot[];
};

const JOURS_ORDRE: AvailabilityDay["day"][] = [
  "dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi",
];

function getNextAvailableSlots(
  availability: AvailabilityDay[] | undefined,
  max = 5
): string[] {
  if (!availability || availability.length === 0) return [];

  const todayIndex = new Date().getDay(); // 0 = dimanche
  const upcoming: { offset: number; time: string }[] = [];

  availability.forEach((day) => {
    const dayIndex = JOURS_ORDRE.indexOf(day.day);
    if (dayIndex === -1) return;
    const offset = (dayIndex - todayIndex + 7) % 7;
    day.slots.forEach((slot) => {
      if (!slot.isBooked) upcoming.push({ offset, time: slot.start });
    });
  });

  upcoming.sort((a, b) => a.offset - b.offset || a.time.localeCompare(b.time));

  return upcoming.slice(0, max).map(({ offset, time }) => {
    if (offset === 0) return `Auj. ${time}`;
    if (offset === 1) return `Demain ${time}`;
    const nom = JOURS_ORDRE[(todayIndex + offset) % 7];
    return `${nom.charAt(0).toUpperCase()}${nom.slice(1, 3)} ${time}`;
  });
}

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
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

        {/* Liste vide */}
        {!isLoading && doctors.length === 0 && (
          <div className="bg-white rounded-2xl px-6 py-12 text-center text-gray-400 text-sm">
            Aucun médecin trouvé pour ces critères.
          </div>
        )}

        {/* Liste des médecins — 2 par ligne à partir de md */}
        {!isLoading && doctors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.map((doctor) => (
              <DoctorCard key={String(doctor._id)} doctor={doctor} />
            ))}
          </div>
        )}

        {/* Pagination réelle — nécessaire dès que le volume de médecins grandit */}
        {!isLoading && doctors.length > 0 && pagination.pages > 1 && (
          <Pagination
            pagination={pagination}
            onPageChange={(page) => {
              fetchDoctors({ page, limit: 10 });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

      </div>
    </div>
  );
};

// ── Pagination ────────────────────────────────────────────────

const Pagination = ({
  pagination,
  onPageChange,
}: {
  pagination: { page: number; pages: number; total: number };
  onPageChange: (page: number) => void;
}) => {
  const { page, pages } = pagination;

  // Fenêtre glissante autour de la page courante + première/dernière page,
  // pour rester lisible même avec des dizaines de pages (ex. 400 médecins).
  const getPageNumbers = (): (number | "...")[] => {
    const delta = 1;
    const left = Math.max(2, page - delta);
    const right = Math.min(pages - 1, page + delta);
    const range: (number | "...")[] = [1];

    if (left > 2) range.push("...");
    for (let i = left; i <= right; i++) range.push(i);
    if (right < pages - 1) range.push("...");
    if (pages > 1) range.push(pages);

    return range;
  };

  return (
    <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
      >
        Précédent
      </button>

      {getPageNumbers().map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-9 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
              p === page
                ? "bg-[#1e3a8a] text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
      >
        Suivant
      </button>
    </div>
  );
};

// ── Card médecin ──────────────────────────────────────────────

const DoctorCard = ({ doctor }: { doctor: Partial<DoctorUser> }) => {
  const fees = doctor.telemedicine?.consultationFees;
  const types = doctor.telemedicine?.consultationTypes ?? [];
  const tier  = getDoctorTier(doctor.status);
  const nextSlots = getNextAvailableSlots(
    doctor.telemedicine?.availability as AvailabilityDay[] | undefined
  );

  return (
    <Link
      href={`/medecins/${doctor._id}`}
      className=" bg-white rounded-2xl p-5 flex flex-col gap-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all duration-150 cursor-pointer"
    >
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

          {/* Badge tier sur la photo */}
            {tier === 'elite' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                <BadgeCheck size={11} className="text-white" />
              </div>
            )}
            {tier === 'premium' && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-slate-400 rounded-full flex items-center justify-center border-2 border-white">
                <BadgeCheck size={10} className="text-white" />
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
            {(doctor.telemedicine?.rating ?? 0) > 0 && (
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
        {nextSlots.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            {nextSlots.map((slot, i) => (
              <span
                key={`${slot}-${i}`}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                  i === 0
                    ? "bg-[#1e3a8a] text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {slot}
              </span>
            ))}
            <span className="text-xs text-[#1e3a8a] font-medium">
              Plus d&apos;horaires
            </span>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Aucun créneau disponible pour le moment</p>
        )}
      </div>
    </Link>
  );
};

export default RenderResultSection;