"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label:   string;
  value:   React.ReactNode;
  sub?:    string;
  delta?:  { value: number; label: string };
  isLoading?: boolean;
}

function StatCard({ label, value, sub, delta, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
        <div className="h-3 bg-slate-200 rounded w-1/2 mb-4" />
        <div className="h-7 bg-slate-200 rounded w-2/3 mb-2" />
        <div className="h-3 bg-slate-200 rounded w-1/3" />
      </div>
    );
  }

  const isPositive = (delta?.value ?? 0) >= 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-2">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
      {delta && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{delta.label}</span>
        </div>
      )}
    </div>
  );
}

interface PerformanceStatsCardsProps {
  revenueMonth?:       number;
  revenueDelta?:       number;
  totalConsultations?: number;
  cancellationRate?:   number;
  patientSatisfaction?: number;
  satisfactionCount?:  number;
  isLoading?: boolean;
}

export function PerformanceStatsCards({
  revenueMonth = 0,
  revenueDelta = 0,
  totalConsultations = 0,
  cancellationRate = 0,
  patientSatisfaction = 0,
  satisfactionCount = 0,
  isLoading = false,
}: PerformanceStatsCardsProps) {

  const cancellationLabel = cancellationRate < 5 ? "Très faible" : cancellationRate < 15 ? "Faible" : "À surveiller";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Revenu du mois"
        value={formatRevenue(revenueMonth)}
        delta={revenueDelta !== 0 ? {
          value: revenueDelta,
          label: `${revenueDelta > 0 ? "+" : ""}${revenueDelta}% vs mois dernier`,
        } : undefined}
        isLoading={isLoading}
      />
      <StatCard
        label="Consultations totales"
        value={totalConsultations}
        sub="Vidéo, chat, cabinet"
        isLoading={isLoading}
      />
      <StatCard
        label="Taux d'annulation"
        value={`${cancellationRate.toFixed(1)}%`}
        sub={cancellationLabel}
        isLoading={isLoading}
      />
      <StatCard
        label="Satisfaction patient"
        value={`${patientSatisfaction.toFixed(1)}/5`}
        sub={`${satisfactionCount} avis vérifiés`}
        isLoading={isLoading}
      />
    </div>
  );
}

function formatRevenue(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `${(amount / 1_000).toFixed(0)}k`;
  return amount.toLocaleString("fr-FR");
}