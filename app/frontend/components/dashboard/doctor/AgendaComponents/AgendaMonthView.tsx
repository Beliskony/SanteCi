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
}

export function AgendaMonthView({ selectedDate, appointments, onSelectDay }: AgendaMonthViewProps) {
  const year  = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const today = new Date();

  const daysInMonth  = getDaysInMonth(year, month);
  const firstDaySlot = getFirstDayOfMonth(year, month);

  const cells: (number | null)[] = [
    ...Array(firstDaySlot).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const countsByDay = useMemo(() => {
    const map = new Map<number, number>();
    appointments.forEach((a) => {
      const dt = new Date(a.details.scheduledFor);
      if (dt.getFullYear() === year && dt.getMonth() === month) {
        map.set(dt.getDate(), (map.get(dt.getDate()) ?? 0) + 1);
      }
    });
    return map;
  }, [appointments, year, month]);

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
          const count = countsByDay.get(day) ?? 0;

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
                  isSelected ? "bg-white/20 text-white" : "bg-blue-50 text-[#1e3a8a]"
                }`}>
                  {count} RDV
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}