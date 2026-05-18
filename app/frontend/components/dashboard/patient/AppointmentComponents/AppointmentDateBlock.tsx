// components/appointments/AppointmentDateBlock.tsx
import { format, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";

interface AppointmentDateBlockProps {
  scheduledFor: Date; // ISO 8601 — details.scheduledFor
  duration: number;     // minutes — details.duration
}

function getDayLabel(date: Date): string {
  if (isToday(date))    return "AUJOURD'HUI";
  if (isTomorrow(date)) return "DEMAIN";
  return format(date, "EEE dd MMM", { locale: fr }).toUpperCase();
}

export function AppointmentDateBlock({ scheduledFor, duration }: AppointmentDateBlockProps) {
  const date = new Date(scheduledFor);

  return (
    <div className="flex flex-col items-start justify-center min-w-20 pr-4 border-r border-slate-100 shrink-0">
      <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-1">
        {getDayLabel(date)}
      </span>
      <span className="text-2xl font-bold text-slate-800 leading-none tabular-nums">
        {format(date, "HH:mm")}
      </span>
      <span className="text-xs text-slate-400 mt-1">Durée {duration}min</span>
    </div>
  );
}