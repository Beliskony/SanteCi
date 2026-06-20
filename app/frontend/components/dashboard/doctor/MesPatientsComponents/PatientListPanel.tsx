// ============================================================
// components/patients/PatientListPanel.tsx
// ============================================================

import React, { useCallback } from "react";
import { Search } from "lucide-react";
import {
  type PatientDTO,
  type PatientStatus,
  getAge,
  getInitials,
  deriveStatus,
} from "@/app/frontend/types/Patient";

const STATUS_BADGE: Record<PatientStatus, { label: string; className: string }> = {
  prioritaire: { label: "Prioritaire", className: "bg-amber-100 text-amber-800" },
  suivi:       { label: "Suivi",       className: "bg-blue-100  text-blue-800"  },
  recent:      { label: "Récent",      className: "bg-green-100 text-green-800" },
  inactif:     { label: "Inactif",     className: "bg-gray-100  text-gray-500"  },
};

const PatientBadge: React.FC<{ status: PatientStatus }> = ({ status }) => {
  const { label, className } = STATUS_BADGE[status];
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${className}`}>
      {label}
    </span>
  );
};

const AVATAR_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-blue-100 text-blue-700",
  "bg-pink-100 text-pink-700",
];

function avatarColor(firstName: string, lastName: string): string {
  const idx = (firstName.charCodeAt(0) + (lastName.charCodeAt(0) ?? 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function formatRdv(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const today = new Date(); today.setHours(0,0,0,0);
  const appt  = new Date(d);  appt.setHours(0,0,0,0);
  const diff  = (appt.getTime() - today.getTime()) / 86_400_000;
  const time  = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `Aujourd'hui ${time}`;
  if (diff === 1) return `Demain ${time}`;
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" }) + ` ${time}`;
}

const SkeletonRow: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
    <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
    <div className="flex-1 space-y-1.5">
      <div className="h-3 w-32 bg-gray-200 animate-pulse rounded" />
      <div className="h-3 w-24 bg-gray-200 animate-pulse rounded" />
    </div>
    <div className="h-3 w-20 bg-gray-200 animate-pulse rounded" />
  </div>
);

interface Props {
  patients:    PatientDTO[];
  selectedId:  string | null;
  isLoading:   boolean;
  searchQuery: string;
  onSearch:    (q: string) => void;
  onSelect:    (patient: PatientDTO) => void;
}

export const PatientListPanel: React.FC<Props> = ({
  patients,
  selectedId,
  isLoading,
  searchQuery,
  onSearch,
  onSelect,
}) => {
  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value),
    [onSearch]
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-800 shrink-0">Liste des patients</span>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} aria-hidden />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Nom, téléphone, pathologie"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 max-h-105">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : patients.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">Aucun patient trouvé</p>
        ) : (
          patients.map((p) => {
            const status = deriveStatus(p);
            const age    = getAge(p.profile.dateOfBirth);
            const sub    = p.health.chronicDiseases[0] ?? "Patient";

            return (
              <button
                key={p._id}
                onClick={() => onSelect(p)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 text-left transition-colors ${
                  selectedId === p._id ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                {p.profile.photo ? (
                  <img
                    src={p.profile.photo}
                    alt={`${p.profile.firstName} ${p.profile.lastName}`}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColor(p.profile.firstName, p.profile.lastName)}`}
                    aria-hidden
                  >
                    {getInitials(p.profile)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {p.profile.firstName} {p.profile.lastName}
                    </span>
                    <PatientBadge status={status} />
                  </div>
                  <p className="text-xs text-gray-500 truncate">{age} ans • {sub}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[10px] text-gray-400 mb-0.5">Prochain RDV</p>
                  <p className="text-xs font-medium text-gray-800">
                    {formatRdv(p.nextAppointment?.scheduledAt)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};