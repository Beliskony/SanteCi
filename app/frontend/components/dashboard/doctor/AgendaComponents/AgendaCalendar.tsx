"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Appointment } from "@/app/frontend/types/Appointment";

interface AgendaCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  appointments?: Appointment[]; //  Ajout des rendez-vous
}

const DAYS   = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function AgendaCalendar({ 
  selectedDate, 
  onSelectDate, 
  appointments = [] 
}: AgendaCalendarProps) {
  const [viewDate, setViewDate] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth  = getDaysInMonth(year, month);
  const firstDaySlot = getFirstDayOfMonth(year, month);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [
    ...Array(firstDaySlot).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  //  Compter les rendez-vous par jour
  const appointmentsByDay = useMemo(() => {
    const map = new Map<number, { total: number; statuses: string[] }>();
    
    appointments.forEach((appt) => {
      const dt = new Date(appt.details.scheduledFor);
      if (dt.getFullYear() === year && dt.getMonth() === month) {
        const day = dt.getDate();
        if (!map.has(day)) {
          map.set(day, { total: 0, statuses: [] });
        }
        const entry = map.get(day)!;
        entry.total += 1;
        if (!entry.statuses.includes(appt.status.current)) {
          entry.statuses.push(appt.status.current);
        }
      }
    });
    return map;
  }, [appointments, year, month]);

  const isSelected = (day: number) =>
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth()    === month &&
    selectedDate.getDate()     === day;

  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth()    === month &&
    today.getDate()     === day;

  //  Couleur du point selon le statut
  const getStatusColor = (statuses: string[]): string => {
    if (statuses.includes('ongoing')) return 'bg-red-500';
    if (statuses.includes('pending')) return 'bg-amber-500';
    if (statuses.includes('confirmed')) return 'bg-green-500';
    if (statuses.includes('completed')) return 'bg-blue-500';
    if (statuses.includes('cancelled')) return 'bg-red-300';
    return 'bg-[#1e3a8a]';
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 select-none">

      {/* Header mois */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-slate-800">
          {MONTHS[month]} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) =>
          day === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <button
              key={day}
              onClick={() => onSelectDate(new Date(year, month, day))}
              className="relative w-full aspect-square flex flex-col items-center justify-center rounded-full transition-colors hover:bg-slate-50"
            >
              {/* Cercle de sélection */}
              <div className={`absolute inset-0 rounded-full transition-colors ${
                isSelected(day)
                  ? "bg-[#1e3a8a]"
                  : isToday(day)
                  ? "border-2 border-[#1e3a8a]/30"
                  : ""
              }`} />
              
              {/* Numéro du jour */}
              <span className={`relative z-10 text-xs font-medium ${
                isSelected(day)
                  ? "text-white font-bold"
                  : isToday(day)
                  ? "text-[#1e3a8a] font-bold"
                  : "text-slate-700"
              }`}>
                {day}
              </span>

              {/*  Indicateur de rendez-vous */}
              {appointmentsByDay.has(day) && (
                <div className="relative z-10 mt-0.5 flex items-center justify-center">
                  {(() => {
                    const data = appointmentsByDay.get(day)!;
                    const dotColor = getStatusColor(data.statuses);
                    return (
                      <div className="flex items-center gap-0.5">
                        <span className={`block w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        {data.total > 1 && (
                          <span className={`text-[8px] font-bold ${
                            isSelected(day) ? "text-white/80" : "text-slate-400"
                          }`}>
                            +{data.total - 1}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </button>
          )
        )}
      </div>
    </div>
  );
}