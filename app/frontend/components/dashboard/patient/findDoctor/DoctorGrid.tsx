"use client";

import { Stethoscope } from "lucide-react";
import type { DoctorUser } from "@/app/frontend/store/useAuthStore";
import { DoctorCard } from "./DoctorCard";

interface DoctorGridProps {
  doctors: Partial<DoctorUser>[];
  isLoading: boolean;
  total: number;
  onLoadMore: () => void;
  hasMore: boolean;
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-1/3" />
        </div>
      </div>
      <div className="mt-4 h-3 bg-slate-200 rounded w-1/4" />
      <div className="flex gap-1.5 mt-3">
        <div className="h-5 bg-slate-200 rounded-full w-14" />
        <div className="h-5 bg-slate-200 rounded-full w-14" />
      </div>
      <div className="flex gap-2 mt-4">
        <div className="flex-1 h-8 bg-slate-200 rounded-xl" />
        <div className="flex-1 h-8 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}

export function DoctorGrid({ doctors, isLoading, total, onLoadMore, hasMore }: DoctorGridProps) {
  if (isLoading && doctors.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!isLoading && doctors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Stethoscope size={24} className="text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Aucun médecin trouvé</p>
        <p className="text-xs text-slate-400 mt-1">Essayez d&apos;élargir vos critères de recherche</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{total}</span> médecin{total > 1 ? "s" : ""} trouvé{total > 1 ? "s" : ""}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {doctors.map((doctor) => (
          <DoctorCard key={String(doctor._id)} doctor={doctor} />
        ))}
        {isLoading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}
      </div>

      {hasMore && !isLoading && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onLoadMore}
            className="px-8 py-2.5 text-sm font-semibold text-[#1e3a8a] border border-[#1e3a8a]/30 rounded-xl hover:bg-[#1e3a8a]/5 transition-colors"
          >
            Voir plus de médecins
          </button>
        </div>
      )}
    </div>
  );
}