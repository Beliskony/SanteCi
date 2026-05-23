"use client";

import { useState } from "react";
import { User, Bell, ShieldCheck, ChevronRight } from "lucide-react";
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore";
import { ProfileSection }     from "./ProfileSection";
import { PreferencesSection } from "./PreferencesSection";
import { SecuritySection }    from "./SecuritySection";

// ── Navigation ────────────────────────────────────────────────────────────────

type SectionKey = "profile" | "preferences" | "security";

const SECTIONS: { key: SectionKey; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key:         "profile",
    label:       "Profil",
    description: "Infos personnelles, photo, localisation",
    icon:        <User size={16} />,
  },
  {
    key:         "preferences",
    label:       "Préférences",
    description: "Langue, notifications, confidentialité",
    icon:        <Bell size={16} />,
  },
  {
    key:         "security",
    label:       "Sécurité",
    description: "PIN, contacts d'urgence, compte",
    icon:        <ShieldCheck size={16} />,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<SectionKey>("profile");

  const user    = useAuthStore((s) => s.user);
  const patient = user && isPatient(user) ? user : null;
  const photo   = patient?.profile?.photo;
  const initials= `${patient?.profile?.firstName?.[0] ?? ""}${patient?.profile?.lastName?.[0] ?? ""}`;

  const current = SECTIONS.find((s) => s.key === active)!;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Titre page ── */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gérez votre profil et vos préférences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">

          {/* ── Sidebar ── */}
          <aside className="lg:w-64 shrink-0 flex flex-col gap-2">

            {/* Mini profil */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 mb-1">
              {photo ? (
                <img src={photo} alt="Photo" className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#1e3a8a] to-blue-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {initials || <User size={16} />}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {patient?.profile?.firstName} {patient?.profile?.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate">{patient?.contact?.email ?? patient?.contact?.phone}</p>
              </div>
            </div>

            {/* Nav items */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {SECTIONS.map((section, i) => (
                <button
                  key={section.key}
                  onClick={() => setActive(section.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all ${
                    i > 0 ? "border-t border-slate-100" : ""
                  } ${
                    active === section.key
                      ? "bg-[#1e3a8a]/5 border-l-2 border-l-[#1e3a8a]"
                      : "hover:bg-slate-50 border-l-2 border-l-transparent"
                  }`}
                >
                  <span className={`shrink-0 ${active === section.key ? "text-[#1e3a8a]" : "text-slate-400"}`}>
                    {section.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${active === section.key ? "text-[#1e3a8a]" : "text-slate-700"}`}>
                      {section.label}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{section.description}</p>
                  </div>
                  <ChevronRight size={14} className={`shrink-0 transition-transform ${
                    active === section.key ? "text-[#1e3a8a] translate-x-0.5" : "text-slate-300"
                  }`} />
                </button>
              ))}
            </div>
          </aside>

          {/* ── Contenu ── */}
          <main className="flex-1 min-w-0">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">

              {/* Header section */}
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center text-[#1e3a8a] shrink-0">
                  {current.icon}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{current.label}</h2>
                  <p className="text-xs text-slate-500">{current.description}</p>
                </div>
              </div>

              {/* Contenu dynamique */}
              {active === "profile"     && <ProfileSection />}
              {active === "preferences" && <PreferencesSection />}
              {active === "security"    && <SecuritySection />}
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}