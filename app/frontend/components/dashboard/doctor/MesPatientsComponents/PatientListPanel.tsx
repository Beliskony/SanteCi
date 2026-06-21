"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { PatientListItemCard } from "./PatientListItemCard";
import type { PatientListItem } from "../../../../types/PatientList";

interface PatientsListPanelProps {
  patients?: PatientListItem[];
  isLoading?: boolean;
  selectedPatientId: string | null;
  onSelectPatient: (patient: PatientListItem) => void;
}

export function PatientsListPanel({
  patients = [],
  isLoading = false,
  selectedPatientId,
  onSelectPatient,
}: PatientsListPanelProps) {
  const [query, setQuery] = useState("");

  const filtered = patients.filter((p) =>
    `${p.firstName} ${p.lastName} ${p.mainCondition}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900 shrink-0">Liste des patients</h2>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Nom, téléphone, pathologie"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-slate-200 rounded w-1/3" />
                <div className="h-2.5 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-10">
            {query ? "Aucun résultat" : "Aucun patient pour le moment"}
          </p>
        ) : (
          filtered.map((patient) => (
            <PatientListItemCard
              key={patient._id}
              patient={patient}
              isSelected={patient._id === selectedPatientId}
              onClick={() => onSelectPatient(patient)}
            />
          ))
        )}
      </div>
    </div>
  );
}