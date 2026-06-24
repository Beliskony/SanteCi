"use client";

import { useEffect } from "react";
import { Download } from "lucide-react";
import { useDoctorPerformanceStore } from "@/app/frontend/store/useDoctorPatientsStore";
import { PerformanceStatsCards } from "./PerformanceStatsCards";
import { MonthlyEvolutionChart } from "./MonthlyEvolutionChart";
import { ConsultationBreakdown } from "./ConsultationBreakdown";
import { RecentPayments } from "./RecentPayments";

export default function PerformancePage() {
  const performance = useDoctorPerformanceStore((s) => s.performance);
  const isLoading    = useDoctorPerformanceStore((s) => s.isLoading);
  const fetchPerformance = useDoctorPerformanceStore((s) => s.fetchPerformance);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const isUp = (performance?.revenueDelta ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pilotage de l&apos;activité</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Suivez vos revenus, votre satisfaction patient et la performance de vos consultations.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {performance && (
              <span className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-full ${
                isUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
              }`}>
                {isUp ? "Mois en hausse" : "Mois en baisse"}
              </span>
            )}
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white text-sm font-bold rounded-xl hover:bg-blue-800 transition-colors">
              <Download size={14} />
              Exporter
            </button>
          </div>
        </div>

        <PerformanceStatsCards
          revenueMonth={performance?.revenueMonth}
          revenueDelta={performance?.revenueDelta}
          totalConsultations={performance?.totalConsultations}
          cancellationRate={performance?.cancellationRate}
          patientSatisfaction={performance?.patientSatisfaction}
          satisfactionCount={performance?.satisfactionCount}
          isLoading={isLoading && !performance}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <MonthlyEvolutionChart
            data={performance?.monthlyEvolution}
            isLoading={isLoading && !performance}
          />
          <div className="flex flex-col gap-5">
            <ConsultationBreakdown
              video={performance?.breakdown.video}
              inPerson={performance?.breakdown.inPerson}
              chat={performance?.breakdown.chat}
              audio={performance?.breakdown.audio}
              isLoading={isLoading && !performance}
            />
            <RecentPayments isLoading={isLoading && !performance} />
          </div>
        </div>

      </div>
    </div>
  );
}