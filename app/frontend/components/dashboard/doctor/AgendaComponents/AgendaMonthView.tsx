"use client";

import { useMemo } from "react";
import type { Appointment } from "@/app/frontend/types/Appointment";

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

interface AgendaMonthViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  onSelectDay:  (date: Date) => void;
  statusFilter?: string | null; //  Ajout du filtre de statut
}

export function AgendaMonthView({ 
  selectedDate, 
  appointments, 
  onSelectDay,
  statusFilter = null //  Par défaut: tous
}: AgendaMonthViewProps) {
  const year  = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const today = new Date();

  const daysInMonth  = getDaysInMonth(year, month);
  const firstDaySlot = getFirstDayOfMonth(year, month);

  const cells: (number | null)[] = [
    ...Array(firstDaySlot).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  //  Filtrer les rendez-vous par statut
  const filteredAppointments = useMemo(() => {
    if (!statusFilter) return appointments;
    return appointments.filter(a => a.status.current === statusFilter);
  }, [appointments, statusFilter]);

  //  Compter les rendez-vous par jour (avec filtre)
  const countsByDay = useMemo(() => {
    const map = new Map<number, { total: number; statuses: string[] }>();
    filteredAppointments.forEach((a) => {
      const dt = new Date(a.details.scheduledFor);
      if (dt.getFullYear() === year && dt.getMonth() === month) {
        const day = dt.getDate();
        if (!map.has(day)) {
          map.set(day, { total: 0, statuses: [] });
        }
        const entry = map.get(day)!;
        entry.total += 1;
        if (!entry.statuses.includes(a.status.current)) {
          entry.statuses.push(a.status.current);
        }
      }
    });
    return map;
  }, [filteredAppointments, year, month]);

  //  Couleur du badge selon le statut le plus présent
  const getStatusColor = (statuses: string[]): string => {
    if (statuses.includes('ongoing')) return 'bg-red-500 text-white';
    if (statuses.includes('pending')) return 'bg-amber-100 text-amber-700';
    if (statuses.includes('confirmed')) return 'bg-green-100 text-green-700';
    if (statuses.includes('completed')) return 'bg-blue-100 text-blue-700';
    if (statuses.includes('cancelled')) return 'bg-red-100 text-red-700';
    if (statuses.includes('missed_review')) return 'bg-amber-100 text-amber-700';
    return 'bg-blue-50 text-[#1e3a8a]';
  };

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {DAYS_FR.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
          const dayData = countsByDay.get(day);
          const count = dayData?.total ?? 0;
          const statuses = dayData?.statuses ?? [];

          return (
            <button
              key={day}
              onClick={() => onSelectDay(new Date(year, month, day))}
              className={`min-h-18 rounded-xl border p-2 flex flex-col items-start gap-1 transition-colors ${
                isSelected
                  ? "bg-[#1e3a8a] border-[#1e3a8a] text-white"
                  : isToday
                  ? "border-[#1e3a8a]/40 bg-blue-50/50"
                  : "border-slate-100 bg-white hover:bg-slate-50"
              }`}
            >
              <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-700"}`}>
                {day}
              </span>
              {count > 0 && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  isSelected 
                    ? "bg-white/20 text-white" 
                    : getStatusColor(statuses)
                }`}>
                  {count} RDV
                  {statuses.length > 1 && ` • ${statuses.length} statuts`}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}