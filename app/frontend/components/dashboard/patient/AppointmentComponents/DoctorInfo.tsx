// components/appointments/DoctorInfo.tsx
import Image from "next/image";
import { isPopulatedDoctor } from "@/app/frontend/types/Appointment";
import type { Appointment } from "@/app/frontend/types/Appointment";

interface DoctorInfoProps {
  doctorId: Appointment["doctorId"];
}

export function DoctorInfo({ doctorId }: DoctorInfoProps) {
  if (!isPopulatedDoctor(doctorId)) {
    // doctorId est une string brute — populate absent
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-800">Médecin</p>
        </div>
      </div>
    );
  }

  const { profile } = doctorId;
  const fullName = `${profile.title ? profile.title + " " : ""}${profile.firstName} ${profile.lastName}`;
  const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-200 shrink-0 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-500">{initials}</span>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-800">{fullName}</p>
        {profile.specialty && (
          <p className="text-xs text-slate-500">{profile.specialty}</p>
        )}
      </div>
    </div>
  );
}