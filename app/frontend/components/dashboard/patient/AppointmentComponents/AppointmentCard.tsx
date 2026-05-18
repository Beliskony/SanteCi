// components/appointments/AppointmentCard.tsx
import type { Appointment } from "@/app/frontend/types/Appointment";
import { StatusBadge } from "./StatusBadge";
import { AppointmentDateBlock } from "./AppointmentDateBlock";
import { DoctorInfo } from "./DoctorInfo";
import { AppointmentMeta } from "./AppointmentMeta";
import { AppointmentActions } from "./AppointmentAction";

interface AppointmentCardProps {
  appointment: Appointment;
  onReschedule?: (id: string) => void;
}

export function AppointmentCard({
  appointment,
  onReschedule,
}: AppointmentCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-4">
      {/* Header row: date block + doctor info + status badge */}
      <div className="flex items-start gap-4">
        <AppointmentDateBlock
          scheduledFor={appointment.details.scheduledFor}
          duration={appointment.details.duration}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <DoctorInfo doctorId={appointment.doctorId} />
            <StatusBadge status={appointment.status.current} />
          </div>

          {/* Details: type / motif / location / payment */}
          <AppointmentMeta appointment={appointment} />
        </div>
      </div>

      {/* CTA buttons */}
      <AppointmentActions
        appointment={appointment}
        onReschedule={onReschedule}
      />
    </div>
  );
}