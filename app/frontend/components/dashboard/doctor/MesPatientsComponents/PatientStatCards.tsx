// ============================================================
// components/patients/PatientStatCards.tsx
// ============================================================

import React from "react";
import type { PatientSummaryDTO } from "@/app/frontend/types/Patient";

interface Props {
  summary:   PatientSummaryDTO | null;
  isLoading: boolean;
}

const StatCard: React.FC<{ label: string; value: number; isLoading: boolean }> = ({
  label, value, isLoading,
}) => (
  <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-1">
    <span className="text-xs text-gray-500 font-medium">{label}</span>
    {isLoading ? (
      <div className="h-8 w-14 bg-gray-200 animate-pulse rounded" />
    ) : (
      <span className="text-3xl font-semibold text-gray-900">{value}</span>
    )}
  </div>
);

export const PatientStatCards: React.FC<Props> = ({ summary, isLoading }) => (
  <div className="grid grid-cols-3 gap-3 mb-6">
    <StatCard label="Patients actifs"     value={summary?.activeCount   ?? 0} isLoading={isLoading && !summary} />
    <StatCard label="Nouveaux ce mois"    value={summary?.newThisMonth  ?? 0} isLoading={isLoading && !summary} />
    <StatCard label="Suivis prioritaires" value={summary?.priorityCount ?? 0} isLoading={isLoading && !summary} />
  </div>
);