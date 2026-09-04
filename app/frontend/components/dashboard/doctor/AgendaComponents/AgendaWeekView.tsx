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

//  Configuration des couleurs de statut
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-green-100 text-green-700 border-green-200",
  ongoing: "bg-red-500 text-white border-red-400",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  no_show: "bg-gray-100 text-gray-500 border-gray-200",
  missed_review: "bg-amber-100 text-amber-700 border-amber-300",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  ongoing: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
  missed_review: "À examiner",
};

interface AgendaWeekViewProps {
  selectedDate: Date;
  appointments: Appointment[];
  onClickAppt:  (appointment: Appointment) => void;
  onSelectDay:  (date: Date) => void;
  statusFilter?: string | null; //  Ajout du filtre
}

export function AgendaWeekView({ 
  selectedDate, 
  appointments, 
  onClickAppt, 
  onSelectDay,
  statusFilter = null //  Par défaut: tous
}: AgendaWeekViewProps) {
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const today = new Date();

  //  Filtrer les rendez-vous par statut
  const filteredAppointments = useMemo(() => {
    if (!statusFilter) return appointments;
    return appointments.filter(a => a.status.current === statusFilter);
  }, [appointments, statusFilter]);

  const apptsByDay = useMemo(() => {
    return weekDays.map((day) =>
      filteredAppointments
        .filter((a) => {
          const dt = new Date(a.details.scheduledFor);
          return dt.toDateString() === day.toDateString();
        })
        .sort((a, b) => new Date(a.details.scheduledFor).getTime() - new Date(b.details.scheduledFor).getTime())
    );
  }, [filteredAppointments, weekDays]);

  //  Récupérer la classe de couleur pour un statut
  const getStatusColor = (status: string): string => {
    return STATUS_COLORS[status] || "bg-slate-100 text-slate-600";
  };

  //  Récupérer le libellé d'un statut
  const getStatusLabel = (status: string): string => {
    return STATUS_LABELS[status] || status;
  };

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
                    const statusColor = getStatusColor(appt.status.current);
                    const statusLabel = getStatusLabel(appt.status.current);
                    const isOngoing = appt.status.current === "ongoing";
                    const isPending = appt.status.current === "pending";
                    const isCancelled = appt.status.current === "cancelled" || appt.status.current === "no_show";

                    return (
                      <button
                        key={appt._id}
                        onClick={() => onClickAppt(appt)}
                        className={`flex items-center gap-1.5 bg-white border rounded-lg px-2 py-1.5 text-left hover:border-slate-300 transition-colors ${
                          isOngoing ? "border-red-400 ring-1 ring-red-400" :
                          isPending ? "border-amber-300" :
                          isCancelled ? "border-slate-200 opacity-60" :
                          "border-slate-100"
                        }`}
                      >
                        {/* Point de couleur pour le type */}
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[appt.details.type] ?? "bg-slate-400"}`} />
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[10px] font-bold text-slate-700 leading-tight">{time}</p>
                            {/*  Badge de statut */}
                            <span className={`text-[8px] font-semibold px-1 py-0.5 rounded-full ${statusColor}`}>
                              {isOngoing ? "EN COURS" : statusLabel}
                            </span>
                          </div>
                          <p className={`text-[10px] truncate leading-tight ${
                            isCancelled ? "text-slate-400 line-through" : "text-slate-500"
                          }`}>
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