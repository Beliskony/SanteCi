"use client";

import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import { User } from "lucide-react";

const PatHeader = () => {
  const user         = useAuthStore((s) => s.user);
  const profile      = user && "profile" in user ? user.profile : null;
  const initials = `${user?.profile?.firstName?.[0] ?? ""}${user?.profile?.lastName?.[0] ?? ""}`;

  return (
    <header className="flex items-center justify-end bg-white border-b border-gray-100 px-4 sm:px-6 py-4">

      <div className="flex items-center gap-3">

        {/* Profil */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {profile ? `${profile.firstName} ${profile.lastName}` : "—"}
            </p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>

          <div className="w-13 h-13 overflow-hidden shrink-0">
            {user?.profile?.photo ? (
            <img src={user.profile.photo} alt="Photo" className="w-13 h-13 rounded-full object-cover border-2 border-white shadow-md" />
          ) : (
            <div className="w-13 h-13 rounded-full bg-linear-to-br from-[#1e3a8a] to-blue-400 flex items-center justify-center text-white text-2xl font-bold shadow-md">
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