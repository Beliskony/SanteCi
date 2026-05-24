"use client";

import { TrendingUp, TrendingDown, CalendarDays, Users, Plus } from "lucide-react";
import { useDoctorDashStore, useDoctorAnalytics } from "@/app/frontend/store/doctorStore";

interface StatCardProps {
  label:    string;
  value:    React.ReactNode;
  sub?:     string;
  delta?:   number;
  deltaLabel?: string;
  isLoading?: boolean;
}

function StatCard({ label, value, sub, delta, deltaLabel, isLoading }: StatCardProps) {
  const isPositive = (delta ?? 0) >= 0;

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-1/2 mb-4" />
        <div className="h-7 bg-slate-200 rounded w-2/3 mb-2" />
        <div className="h-3 bg-slate-200 rounded w-1/3" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col gap-2 hover:shadow-sm transition-shadow">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
      {delta !== undefined && delta !== 0 && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
          {isPositive
            ? <TrendingUp size={12} />
            : <TrendingDown size={12} />}
          <span>{isPositive ? "+" : ""}{deltaLabel ?? `${delta}`}</span>
        </div>
      )}
    </div>
  );
}

function OpenSlotsCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#1e3a8a] hover:bg-blue-50/50 transition-all group"
    >
      <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-[#1e3a8a]/10 flex items-center justify-center transition-colors">
        <Plus size={18} className="text-slate-400 group-hover:text-[#1e3a8a] transition-colors" />
      </div>
      <p className="text-sm font-semibold text-slate-500 group-hover:text-[#1e3a8a] transition-colors text-center">
        Ouvrir des créneaux
      </p>
    </div>
  );
}

interface DoctorStatsCardsProps {
  onOpenSlots: () => void;
}

export function DoctorStatsCards({ onOpenSlots }: DoctorStatsCardsProps) {
  const stats     = useDoctorDashStore((s) => s.stats);
  const isLoading = useDoctorDashStore((s) => s.isLoading);
  const analytics = useDoctorAnalytics();

  const consultationsToday = stats?.consultationsToday ?? analytics?.totalConsultations ?? 0;
  const revenueMonth       = stats?.revenueMonth       ?? analytics?.monthlyEarnings    ?? 0;
  const newPatients        = stats?.newPatients        ?? analytics?.totalPatients       ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Aujourd'hui"
        value={<>{consultationsToday} <span className="text-base font-medium text-slate-400">consultations</span></>}
        delta={stats?.consultationsDelta}
        deltaLabel={`${Math.abs(stats?.consultationsDelta ?? 0)} par rapport à hier`}
        isLoading={isLoading && !stats}
      />
      <StatCard
        label="Revenus (Mois)"
        value={<>{revenueMonth.toLocaleString("fr-FR")} <span className="text-sm font-semibold text-slate-400">FCFA</span></>}
        delta={stats?.revenueDelta}
        deltaLabel={`${Math.abs(stats?.revenueDelta ?? 0)}%`}
        isLoading={isLoading && !stats}
      />
      <StatCard
        label="Nouveaux patients"
        value={newPatients}
        sub="Sur les 7 derniers jours"
        isLoading={isLoading && !stats}
      />
      <OpenSlotsCard onOpen={onOpenSlots} />
    </div>
  );
}