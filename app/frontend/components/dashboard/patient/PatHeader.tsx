"use client";

import { Bell } from "lucide-react";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import { useConsultationStore } from "@/app/frontend/store/consultationStore";

const PatHeader = () => {
  const user         = useAuthStore((s) => s.user);
  const profile      = user && "profile" in user ? user.profile : null;
  const consultations = useConsultationStore((s) => s.consultations);

  return (
    <header className="flex items-center justify-between bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
      <h1 className="text-base font-bold text-gray-900">Tableau de bord</h1>

      <div className="flex items-center gap-3">
        {/* Cloche notifications */}
        <button className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
          <Bell size={20} />
          {consultations.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* Profil */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {profile ? `${profile.firstName} ${profile.lastName}` : "—"}
            </p>
            <p className="text-xs text-gray-400">Patient</p>
          </div>

          <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden shrink-0">
            <img
                    src={user?.profile?.photo || "/default_profile_photo.jpg"}
                    alt="Avatar"
                    className="w-9 h-9 rounded-full object-cover border-2 border-[#1e3a8a]/20"
                  />
          </div>
        </div>
      </div>
    </header>
  );
};

export default PatHeader;