"use client";

import { Activity } from "lucide-react";
import type { PatientHealth, PatientProfile } from "@/app/frontend/store/useAuthStore";

interface VitalesCardProps {
  profile: PatientProfile | null;
  health: PatientHealth | null;
}

function ImcBadge({ value }: { value: number }) {
  const isNormal     = value >= 18.5 && value < 25;
  const isOverweight = value >= 25   && value < 30;

  const colorClass = isNormal
    ? "bg-green-50 text-green-800"
    : isOverweight
    ? "bg-amber-50 text-amber-800"
    : "bg-red-50 text-red-800";

  const label = isNormal
    ? "Normal"
    : isOverweight
    ? "Surpoids"
    : value < 18.5
    ? "Insuffisant"
    : "Obésité";

  return (
    <span className={`ml-1.5 px-2 py-0.5 text-xs rounded-full ${colorClass}`}>
      {label}
    </span>
  );
}

export function VitalesCard({ profile, health }: VitalesCardProps) {
  return (
    <div className="bg-white border-l-[3px] border-l-blue-600 border border-gray-100 rounded-r-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-800">Constantes vitales</span>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Groupe sanguin — champ de PatientProfile */}
        <div className="flex items-center justify-between py-2">
          <span className="text-xs text-gray-500">Groupe sanguin</span>
          {profile?.bloodGroup ? (
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-blue-50 text-blue-800 border border-blue-100">
              {profile.bloodGroup}
            </span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </div>

        {/* Poids / Taille */}
        <div className="flex items-center justify-between py-2">
          <span className="text-xs text-gray-500">Poids / Taille</span>
          <span className="text-sm font-medium text-gray-800">
            {health?.weight ?? "—"} kg / {health?.height ?? "—"} cm
          </span>
        </div>

        {/* IMC */}
        <div className="flex items-center justify-between py-2">
          <span className="text-xs text-gray-500">IMC</span>
          {health?.bmi != null ? (
            <span className="flex items-center text-sm font-medium text-green-700">
              {health.bmi.toFixed(1)}
              <ImcBadge value={health.bmi} />
            </span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </div>

        {/* Maladies chroniques */}
        <div className="flex items-start justify-between py-2 gap-3">
          <span className="text-xs text-gray-500 shrink-0">Maladies chroniques</span>
          {health?.chronicDiseases?.length ? (
            <div className="flex flex-wrap gap-1 justify-end">
              {health.chronicDiseases.map((d) => (
                <span key={d} className="px-2 py-0.5 text-[11px] rounded-full bg-red-50 text-red-700">
                  {d}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </div>
      </div>
    </div>
  );
}