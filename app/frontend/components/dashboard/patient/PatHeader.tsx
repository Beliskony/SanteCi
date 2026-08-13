"use client";

import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore";
import { User } from "lucide-react";

const PatHeader = () => {
  const user         = useAuthStore((s) => s.user);
  const profile      = user && "profile" in user ? user.profile : null;
  const initials = `${user?.profile?.firstName?.[0] ?? ""}${user?.profile?.lastName?.[0] ?? ""}`;
  const appointments = useAppointmentStore((s) => s.appointments);

  return (
    <header className="flex items-center justify-between bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
      <h1 className="text-3xl font-bold text-gray-900">{user?.role}</h1>

      <div className="flex items-center gap-3">

        {/* Profil */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {profile ? `${profile.firstName} ${profile.lastName}` : "—"}
            </p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>

          <div className="w-16 h-16 overflow-hidden shrink-0">
            {user?.profile?.photo ? (
            <img src={user.profile.photo} alt="Photo" className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md" />
          ) : (
            <div className="w-15 h-15 rounded-2xl bg-linear-to-br from-[#1e3a8a] to-blue-400 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {initials || <User size={28} />}
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default PatHeader;