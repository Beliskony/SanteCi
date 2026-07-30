import Image from "next/image"
import { BadgeCheck, Star, Languages, Briefcase } from "lucide-react"
import type { DoctorUser } from "@/app/frontend/store/useAuthStore"
import { getDoctorTier } from "@/app/frontend/lib/doctorBadge"
import { DoctorReviewsSection } from "../../ReviewComponents/DoctorReviewSection"

interface DoctorProfileHeaderProps {
  doctor: Partial<DoctorUser>
}

export default function DoctorProfileHeader({ doctor }: DoctorProfileHeaderProps) {
  const { profile, telemedicine, status, analytics } = doctor

  const fullName = `${profile?.title ?? "Dr"} ${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`
  const rating = telemedicine?.rating ?? 0
  // ⚠️ reviewCount (nombre d'avis) ≠ totalConsultations (nombre de RDV honorés)
  // Ajoute `reviewCount?: number` dans le type analytics de DoctorUser si pas déjà fait
  const reviewCount = (analytics as any)?.reviewCount ?? 0
  const tier = getDoctorTier(status);
  const languages = profile?.languages?.includes('fr') && profile?.languages?.includes('en') 
    ? "Français, Anglais" : profile?.languages?.includes('fr') ? "Français" 
    : profile?.languages?.includes('en') ? "Anglais" : "Non spécifié";
    
  const experience = profile?.yearsOfExperience ?? 0

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {/* Top row: photo + infos */}
      <div className="flex gap-5 items-start">
        {/* Photo */}
        <div className="shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative">
          {profile?.photo ? (
            <Image
              src={profile.photo}
              alt={fullName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-3xl font-bold">
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </div>
          )}
        </div>

        {/* Infos principales */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{fullName}</h1>

            {/* Rating */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              <Star size={13} className="text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold text-amber-600">{rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Spécialité */}
          <p className="text-blue-900 font-semibold text-sm mt-0.5">{profile?.specialty}</p>

          {/* Nombre d'avis (pas le nombre de consultations) */}
          <p className="text-slate-400 text-xs mt-0.5">
            {reviewCount > 0 ? `${reviewCount} avis patients` : "Aucun avis pour le moment"}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-3 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Languages size={14} className="text-slate-400" />
              {languages}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Briefcase size={14} className="text-slate-400" />
              {experience} &nbsp;ans d&apos;expérience
            </span>
          </div>

          {/* Badge vérifié */}
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
      </div>

      {/* Bio */}
      {profile?.bio && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-sm font-semibold text-slate-900 mb-2">Présentation</p>
          <p className="text-sm text-slate-500 leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Avis patients */}
      {doctor._id && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-sm font-semibold text-slate-900 mb-3">Avis patients</p>
          <DoctorReviewsSection doctorId={String(doctor._id)} />
        </div>
      )}
    </div>
  )
}