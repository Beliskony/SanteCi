"use client";

import { useMemo } from "react";
import type { Appointment } from "@/app/frontend/types/Appointment";
import {
  AgendaAppointmentBlock,
  FreeSlotBlock,
  HOUR_HEIGHT,
  DAY_START,
} from "./AgendaAppointmentBlock";

const DAY_END  = 19; // 19:00
const HOURS    = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);

interface AgendaTimelineProps {
  selectedDate:  Date;
  appointments:  Appointment[];
  onClickAppt:   (appointment: Appointment) => void;
  onClickSlot?:  () => void;
}

export function AgendaTimeline({
  selectedDate,
  appointments,
  onClickAppt,
  onClickSlot,
}: AgendaTimelineProps) {

  // Filtrer les RDV du jour sélectionné
  const dayAppts = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    const d = selectedDate.getDate();
    return appointments.filter((a) => {
      const dt = new Date(a.details.scheduledFor);
      return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
    }).sort((a, b) =>
      new Date(a.details.scheduledFor).getTime() -
      new Date(b.details.scheduledFor).getTime()
    );
  }, [appointments, selectedDate]);

  // Indicateur "maintenant"
  const now       = new Date();
  const isSameDay =
    now.getFullYear() === selectedDate.getFullYear() &&
    now.getMonth()    === selectedDate.getMonth()    &&
    now.getDate()     === selectedDate.getDate();

  const nowTop = isSameDay
    ? (now.getHours() + now.getMinutes() / 60 - DAY_START) * HOUR_HEIGHT
    : null;

  const totalHeight = (DAY_END - DAY_START + 1) * HOUR_HEIGHT;

  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className="relative"
        style={{ height: totalHeight, minHeight: totalHeight }}
      >
        {/* ── Lignes horaires ── */}
        {HOURS.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-slate-100 flex"
            style={{ top: (h - DAY_START) * HOUR_HEIGHT }}
          >
            <span className="text-[10px] font-medium text-slate-400 w-11 pr-2 text-right -mt-2.5 shrink-0">
              {`${String(h).padStart(2, "0")}:00`}
            </span>
            <div className="flex-1 border-l border-slate-100" />
          </div>
        ))}

        {/* ── Indicateur "maintenant" ── */}
        {nowTop !== null && nowTop >= 0 && nowTop <= totalHeight && (
          <div
            className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
            style={{ top: nowTop }}
          >
            <span className="text-[9px] font-bold text-red-500 w-11 pr-1 text-right shrink-0">
              {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <div className="flex-1 border-t-2 border-red-500 relative">
              <span className="absolute -left-1 -top-1.5 w-2.5 h-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        )}

        {/* ── Blocs RDV ── */}
        {dayAppts.map((appt) => (
          <AgendaAppointmentBlock
            key={appt._id}
            appointment={appt}
            onClick={onClickAppt}
          />
        ))}

        {/* ── Créneau libre exemple (si aucun RDV sur une plage) ── */}
        {dayAppts.length === 0 && onClickSlot && (
          <FreeSlotBlock
            startHour={14}
            endHour={17}
            onClick={onClickSlot}
          />
        )}
      </div>
    </div>
  );
}