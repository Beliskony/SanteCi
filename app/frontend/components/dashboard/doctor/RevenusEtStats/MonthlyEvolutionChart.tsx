"use client";

import { useState } from "react";

interface MonthDataPoint {
  label:         string;  // "Mai", "Juin"...
  revenue:       number;
  consultations: number;
}

interface MonthlyEvolutionChartProps {
  data?: MonthDataPoint[];
  isLoading?: boolean;
}

export function MonthlyEvolutionChart({ data = [], isLoading = false }: MonthlyEvolutionChartProps) {
  const [metric, setMetric] = useState<"revenue" | "consultations">("revenue");

  const values = data.map((d) => (metric === "revenue" ? d.revenue : d.consultations));
  const max = Math.max(...values, 1);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold text-slate-900">Évolution mensuelle</h2>
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setMetric("revenue")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              metric === "revenue" ? "bg-white text-[#1e3a8a] shadow-sm" : "text-slate-500"
            }`}
          >
            Revenus
          </button>
          <button
            onClick={() => setMetric("consultations")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              metric === "consultations" ? "bg-white text-[#1e3a8a] shadow-sm" : "text-slate-500"
            }`}
          >
            Consultations
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-5">
        {metric === "revenue" ? "Revenus encaissés sur les 6 derniers mois" : "Consultations effectuées sur les 6 derniers mois"}
      </p>

      {/* Graphique */}
      {isLoading ? (
        <div className="h-44 bg-slate-50 rounded-xl animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-44 flex items-center justify-center">
          <p className="text-sm text-slate-400">Aucune donnée disponible</p>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-3 h-44">
          {data.map((d, i) => {
            const value = metric === "revenue" ? d.revenue : d.consultations;
            const heightPct = Math.max((value / max) * 100, 4);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-[#1e3a8a] rounded-t-lg transition-all"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[10px] font-medium text-slate-400">{d.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}