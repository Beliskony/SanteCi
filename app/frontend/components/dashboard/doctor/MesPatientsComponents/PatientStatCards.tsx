"use client";

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

interface PatientsStatsCardsProps {
  activePatients?: number;
  newThisMonth?: number;
  priorityFollowUps?: number;
}

export function PatientsStatsCards({
  activePatients = 0,
  newThisMonth = 0,
  priorityFollowUps = 0,
}: PatientsStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="Patients actifs" value={activePatients} />
      <StatCard label="Nouveaux ce mois" value={newThisMonth} />
      <StatCard label="Suivis prioritaires" value={priorityFollowUps} />
    </div>
  );
}