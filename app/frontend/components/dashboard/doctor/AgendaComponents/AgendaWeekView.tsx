"use client";

import { useMemo } from "react";
import type { Appointment } from "@/app/frontend/types/Appointment";
import { isPopulatedPatient } from "@/app/frontend/types/Appointment";

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getWeekDays(selectedDate: Date): Date[] {
  const d = new Date(selectedDate);
  const day = d.getDay(); // 0 = dimanche
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

const TYPE_DOT: Record<string, string> = {
  video: "bg-[#1e3a8a]",
  in_person: "bg-emerald-500",
  chat: "bg-violet-500",
  audio: "bg-cyan-500",
};

interface AgendaWeekViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  onClickAppt:  (appointment: Appointment) => void;
  onSelectDay:  (date: Date) => void;
}

export function AgendaWeekView({ selectedDate, appointments, onClickAppt, onSelectDay }: AgendaWeekViewProps) {
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const today = new Date();

  const apptsByDay = useMemo(() => {
    return weekDays.map((day) =>
      appointments
        .filter((a) => {
          const dt = new Date(a.details.scheduledFor);
          return dt.toDateString() === day.toDateString();
        })
        .sort((a, b) => new Date(a.details.scheduledFor).getTime() - new Date(b.details.scheduledFor).getTime())
    );
  }, [appointments, weekDays]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-7 gap-2 h-full">
        {weekDays.map((day, i) => {
          const isToday = day.toDateString() === today.toDateString();
          const dayAppts = apptsByDay[i];

          return (
            <div key={i} className="flex flex-col gap-2 min-h-100">
              {/* Header jour */}
              <button
                onClick={() => onSelectDay(day)}
                className={`flex flex-col items-center py-2 rounded-xl transition-colors ${
                  isToday ? "bg-[#1e3a8a] text-white" : "bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  {DAYS_FR[i]}
                </span>
                <span className="text-base font-bold">{day.getDate()}</span>
              </button>

              {/* RDV du jour */}
              <div className="flex flex-col gap-1.5 px-0.5">
                {dayAppts.length === 0 ? (
                  <p className="text-[10px] text-slate-300 text-center mt-2">—</p>
                ) : (
                  dayAppts.map((appt) => {
                    const patient = isPopulatedPatient(appt.patientId) ? appt.patientId : null;
                    const time = new Date(appt.details.scheduledFor).toLocaleTimeString("fr-FR", {
                      hour: "2-digit", minute: "2-digit",
                    });
                    return (
                      <button
                        key={appt._id}
                        onClick={() => onClickAppt(appt)}
                        className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-lg px-2 py-1.5 text-left hover:border-slate-300 transition-colors"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[appt.details.type] ?? "bg-slate-400"}`} />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-700 leading-tight">{time}</p>
                          <p className="text-[10px] text-slate-500 truncate leading-tight">
                            {patient ? `${patient.profile.firstName} ${patient.profile.lastName}` : "Patient"}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}