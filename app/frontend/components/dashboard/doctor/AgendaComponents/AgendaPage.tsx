"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";
import { useAppointmentStore }    from "@/app/frontend/store/appoitmentStore";
import { AgendaCalendar }         from "./AgendaCalendar";
import { AgendaLegend }           from "./AgendaLegend";
import { AgendaTimeline }         from "./AgendaTimeline";
import type { Appointment }  from "@/app/frontend/types/Appointment";
import { isPopulatedPatient } from "@/app/frontend/types/Appointment";

// ── Types ─────────────────────────────────────────────────────────────────────

type ViewMode = "Jour" | "Semaine" | "Mois";

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

const DAYS_FR  = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

// ── Page principale ───────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode,     setViewMode]     = useState<ViewMode>("Jour");
  const [activeAppt,   setActiveAppt]   = useState<Appointment | null>(null);

  // Sélecteurs atomiques
  const user         = useAuthStore((s) => s.user);
  const appointments = useAppointmentStore((s) => s.appointments);
  const isLoading    = useAppointmentStore((s) => s.isLoading);
  const fetchList    = useAppointmentStore((s) => s.fetchList);
  const fetchAgenda  = useAppointmentStore((s) => s.fetchAgenda);

  const doctorId = useMemo(() => {
    if (!user || !isDoctor(user)) return null;
    const raw = user._id;
    return typeof raw === "string" ? raw : raw.toString();
  }, [user]);

  // Charger les RDV du jour sélectionné
  useEffect(() => {
    if (!doctorId) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    fetchAgenda(doctorId, dateStr);
  }, [doctorId, selectedDate, fetchAgenda]);

  // Au montage : charger tous les RDV du mois pour le mini-calendrier
  useEffect(() => {
    if (!doctorId) return;
    fetchList({ doctorId, limit: 100 });
  }, [doctorId, fetchList]);

  // Label de la date affichée
  const dateLabel = useMemo(() => {
    const day   = DAYS_FR[selectedDate.getDay()];
    const d     = selectedDate.getDate();
    const month = MONTHS_FR[selectedDate.getMonth()];
    const isToday = new Date().toDateString() === selectedDate.toDateString();
    return isToday
      ? `Aujourd'hui, ${d} ${month}`
      : `${day} ${d} ${month}`;
  }, [selectedDate]);

  // Compter les RDV passés du jour
  const prevApptCount = useMemo(() => {
    const now = new Date();
    return appointments.filter((a) => {
      const dt = new Date(a.details.scheduledFor);
      return dt.toDateString() === selectedDate.toDateString() && dt < now;
    }).length;
  }, [appointments, selectedDate]);

  const goToPrev = useCallback(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  }, [selectedDate]);

  const goToNext = useCallback(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  }, [selectedDate]);

  const handleAddUnavailability = () => {
    // TODO : ouvrir modal indisponibilité
    console.log("Ajouter indisponibilité");
  };

  return (
    <div className="flex h-[calc(100vh-0)] bg-[#f4f6fb] overflow-hidden gap-x-4 py-3.5">

      {/* ── Colonne gauche ── */}
      <aside className="w-72 shrink-0 flex flex-col gap-4 p-4 overflow-y-auto border-r border-slate-200 bg-white">
        <AgendaCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
        <AgendaLegend onAddUnavailability={handleAddUnavailability} />
      </aside>

      {/* ── Colonne droite ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 shrink-0">

          {/* Date + navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrev}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToNext}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">{dateLabel}</h2>
              {prevApptCount > 0 && (
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {prevApptCount} RDV précédents
                </span>
              )}
            </div>
          </div>

          {/* Sélecteur de vue */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
            {(["Jour", "Semaine", "Mois"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === mode
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* ── Timeline ── */}
        <div className="flex-1 overflow-hidden px-2 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400">Chargement de l&apos;agenda...</p>
              </div>
            </div>
          ) : (
            <AgendaTimeline
              selectedDate={selectedDate}
              appointments={appointments}
              onClickAppt={setActiveAppt}
              onClickSlot={handleAddUnavailability}
            />
          )}
        </div>
      </div>

      {/* ── Panneau détail RDV (slide depuis la droite) ── */}
      {activeAppt && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => setActiveAppt(null)}
          />
          <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-slate-200 z-40 p-5 flex flex-col gap-4 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Détails du RDV</h3>
              <button
                onClick={() => setActiveAppt(null)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <InfoRow label="Patient" value={
                (() => {
                  const p = isPopulatedPatient(activeAppt.patientId) ? activeAppt.patientId : null;
                  return p ? `${p.profile.firstName} ${p.profile.lastName}` : "—";
                })()
              } />
              <InfoRow label="Type" value={activeAppt.details.type} />
              <InfoRow label="Motif" value={activeAppt.details.reason || "—"} />
              <InfoRow label="Durée" value={`${activeAppt.details.duration} min`} />
              <InfoRow label="Statut" value={activeAppt.status.current} />
            </div>

            <div className="flex flex-col gap-2 mt-auto">
              <button className="w-full py-2.5 bg-[#1e3a8a] text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors">
                Démarrer la consultation
              </button>
              <button className="w-full py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                Voir le dossier patient
              </button>
              <button className="w-full py-2.5 border border-red-100 text-red-500 text-xs font-semibold rounded-xl hover:bg-red-50 transition-colors">
                Annuler le RDV
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-800 font-medium capitalize">{value}</span>
    </div>
  );
}