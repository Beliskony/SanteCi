"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AgendaCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
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
  // 0=Sun → on veut 0=Lun
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function AgendaCalendar({ selectedDate, onSelectDate }: AgendaCalendarProps) {
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

  const isSelected = (day: number) =>
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth()    === month &&
    selectedDate.getDate()     === day;

  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth()    === month &&
    today.getDate()     === day;

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
              className={`w-full aspect-square flex items-center justify-center text-xs font-medium rounded-full transition-colors ${
                isSelected(day)
                  ? "bg-[#1e3a8a] text-white font-bold"
                  : isToday(day)
                  ? "text-[#1e3a8a] font-bold border border-[#1e3a8a]/30"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {day}
            </button>
          )
        )}
      </div>
    </div>
  );
}