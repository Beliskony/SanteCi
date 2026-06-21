"use client";

import type { PatientListItem, PatientFollowUpStatus } from "../../../../types/PatientList";

const STATUS_CONFIG: Record<Exclude<PatientFollowUpStatus, null>, { label: string; style: string }> = {
  priority: { label: "Prioritaire", style: "bg-amber-100 text-amber-700" },
  followed: { label: "Suivi",       style: "bg-blue-100 text-blue-700"  },
  recent:   { label: "Récente",     style: "bg-slate-100 text-slate-600" },
};

interface PatientListItemCardProps {
  patient:    PatientListItem;
  isSelected: boolean;
  onClick:    () => void;
}

export function PatientListItemCard({ patient, isSelected, onClick }: PatientListItemCardProps) {
  const statusCfg = patient.followUpStatus ? STATUS_CONFIG[patient.followUpStatus] : null;
  const initials = `${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
        isSelected ? "bg-blue-50" : "hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {patient.photo ? (
          <img src={patient.photo} alt={patient.firstName} className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center text-xs font-bold text-[#1e3a8a] shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900 truncate">
              {patient.firstName} {patient.lastName}
            </p>
            {statusCfg && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusCfg.style}`}>
                {statusCfg.label}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">
            {patient.age} ans • {patient.mainCondition}
          </p>
        </div>
      </div>

      {patient.nextAppointment && (
        <div className="text-right shrink-0">
          <p className="text-[10px] text-slate-400">Prochain RDV</p>
          <p className="text-xs font-bold text-slate-700">{patient.nextAppointment.label}</p>
        </div>
      )}
    </button>
  );
}