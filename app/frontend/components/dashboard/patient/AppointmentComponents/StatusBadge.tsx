// components/appointments/StatusBadge.tsx
import type { AppointmentStatus } from "@/app/frontend/types/Appointment";

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; className: string }> = {
  confirmed: { label: "Confirmé",   className: "text-emerald-600 bg-emerald-50" },
  pending:   { label: "En attente", className: "text-amber-600  bg-amber-50"    },
  cancelled: { label: "Annulé",     className: "text-red-500    bg-red-50"      },
  ongoing:   { label: "En cours",   className: "text-blue-600   bg-blue-50"     },
  completed: { label: "Terminé",    className: "text-slate-500  bg-slate-100"   },
  no_show:   { label: "Absent",     className: "text-orange-500 bg-orange-50"   },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  );
}