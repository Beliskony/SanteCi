"use client";

import { Star, Video, MessageSquare, Phone, MapPin, Clock, Calendar } from "lucide-react";
import type { DoctorUser } from "@/app/frontend/store/useAuthStore";
import { useRouter } from "next/navigation";

interface DoctorCardProps {
  doctor: Partial<DoctorUser>;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  video: <Video size={11} />,
  audio: <Phone size={11} />,
  chat:  <MessageSquare size={11} />,
};

const TYPE_LABELS: Record<string, string> = {
  video: "Vidéo",
  audio: "Audio",
  chat:  "Chat",
};

export function DoctorCard({ doctor }: DoctorCardProps) {
  const router  = useRouter();
  const profile = doctor.profile;
  const tele    = doctor.telemedicine;
  const loc     = doctor.location;

  const rating    = tele?.rating ?? 0;
  const total     = tele?.totalConsultations ?? 0;
  const types     = tele?.consultationTypes ?? [];
  const fees      = tele?.consultationFees;
  const minFee    = fees
    ? Math.min(...Object.values(fees).filter(Boolean))
    : null;
  const isOnline  = (doctor.status as any)?.isOnline ?? false;
  const exp       = profile?.yearsOfExperience ?? 0;
  const initials  = `${profile?.firstName?.[0] ?? ""}${profile?.lastName?.[0] ?? ""}`;

  return (
    <div className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-200 hover:shadow-lg transition-all duration-300">

      {/* ── Top strip ── */}
      <div className="h-1.5 bg-linear-to-r from-[#1e3a8a] to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-5">

        {/* ── Header : avatar + infos ── */}
        <div className="flex items-start gap-4">

          {/* Avatar */}
          <div className="relative shrink-0">
            {profile?.photo ? (
              <img
                src={profile.photo}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="w-14 h-14 rounded-xl object-cover border border-slate-100"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-linear-to-br from-[#1e3a8a]/10 to-blue-100 flex items-center justify-center text-[#1e3a8a] font-bold text-lg border border-blue-100">
                {initials}
              </div>
            )}
            {/* Indicateur online */}
            <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
              isOnline ? "bg-emerald-400" : "bg-slate-300"
            }`} />
          </div>

          {/* Nom + spécialité */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900 leading-tight">
                  {profile?.title ?? "Dr"} {profile?.firstName} {profile?.lastName}
                </p>
                <p className="text-xs text-[#1e3a8a] font-semibold mt-0.5">
                  {profile?.specialty}
                </p>
              </div>
              {minFee && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">À partir de</p>
                  <p className="text-sm font-bold text-slate-900">
                    {minFee.toLocaleString("fr-FR")}
                    <span className="text-xs font-normal text-slate-400 ml-0.5">F</span>
                  </p>
                </div>
              )}
            </div>

            {/* Rating + expérience */}
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1">
                <Star size={11} className="text-amber-400 fill-amber-400" />
                <span className="text-xs font-semibold text-slate-700">
                  {rating.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">
                  ({total} consult.)
                </span>
              </div>
              <div className="w-px h-3 bg-slate-200" />
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock size={10} />
                <span>{exp} ans d&apos;exp.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Localisation ── */}
        {loc?.city && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
            <MapPin size={11} className="shrink-0 text-slate-400" />
            <span>{loc.city}{loc.district ? `, ${loc.district}` : ""}</span>
          </div>
        )}

        {/* ── Types de consultation ── */}
        {types.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {types.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-[#1e3a8a] text-[11px] font-medium rounded-full border border-blue-100"
              >
                {TYPE_ICONS[t]}
                {TYPE_LABELS[t]}
              </span>
            ))}
          </div>
        )}

        {/* ── CTA ── */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => router.push(`/medecins/${doctor._id}`)}
            className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Voir le profil
          </button>
          <button
            onClick={() => router.push(`/medecins/${doctor._id}?book=1`)}
            className="flex-1 py-2 text-xs font-bold text-white bg-[#1e3a8a] rounded-xl hover:bg-blue-800 transition-colors"
          >
            Prendre RDV
          </button>
        </div>
      </div>
    </div>
  );
}