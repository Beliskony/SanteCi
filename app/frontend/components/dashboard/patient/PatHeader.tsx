"use client";

import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import { User } from "lucide-react";

const PatHeader = () => {
  const user    = useAuthStore((s) => s.user);
  const profile = user && "profile" in user ? user.profile : null;
  const initials = `${profile?.firstName?.[0] ?? ""}${profile?.lastName?.[0] ?? ""}`;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-end bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 sm:px-6 py-3.5">

      {/* Profil */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-gray-900 leading-tight">
            {profile ? `${profile.firstName} ${profile.lastName}` : "—"}
          </p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>

        <div className="w-11 h-11 rounded-full shrink-0 ring-2 ring-white shadow-md overflow-hidden">
          {profile?.photo ? (
            <img src={profile.photo} alt="Photo de profil" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-[#1e3a8a] to-blue-400 flex items-center justify-center text-white text-sm font-semibold tracking-wide">
              {initials || <User size={18} />}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default PatHeader;