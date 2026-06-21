"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  CalendarDays,
  Video,
  Users,
  MessageSquare,
  BarChart2,
  Settings,
  LogOut,
  Heart,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";
import { authService } from "@/app/frontend/services/authService";
import DocDash from "./TableauBord/DocDash";
import AgendaPage from "./AgendaComponents/AgendaPage"
import COnsultationsPage from "./ConsultationComponents/ConsultationsPage";
import PatHeader from "../patient/PatHeader";
import PatientsPage from "./MesPatientsComponents/PatientsPage";

// ── Imports des pages ─────────────────────────────────────────
// (à remplacer par tes vrais composants doctor)
// import DocDash       from "...";
// import DocAgenda     from "...";
// import DocConsult    from "...";
// import DocPatients   from "...";
// import DocMessagerie from "...";
// import DocStats      from "...";
// import DocSettings   from "...";

// ── Types ─────────────────────────────────────────────────────

type ActivePage =
  | "dashboard"
  | "agenda"
  | "consultations"
  | "patients"
  | "messagerie"
  | "stats"
  | "parametres";

// ── Nav items ─────────────────────────────────────────────────

const NAV_ITEMS: { label: string; key: ActivePage; icon: React.ElementType }[] = [
  { label: "Tableau de bord", key: "dashboard",     icon: LayoutDashboard },
  { label: "Agenda",          key: "agenda",        icon: CalendarDays    },
  { label: "Consultations",   key: "consultations", icon: Video           },
  { label: "Mes patients",    key: "patients",      icon: Users           },
  { label: "Messagerie",      key: "messagerie",    icon: MessageSquare   },
  { label: "Revenus & Stats", key: "stats",         icon: BarChart2       },
];

// ── Rendu du contenu principal selon la page active ───────────

const renderPage = (active: ActivePage, setActive: (key: ActivePage) => void) => {
  switch (active) {
    case "dashboard":     return <DocDash onNavigate={(page) => setActive(page as ActivePage)} />     // <DocDash />
    case "agenda":        return <AgendaPage />;                // <DocAgenda />
    case "consultations": return <COnsultationsPage />;         // <DocConsult />
    case "patients":      return <PatientsPage />;          // <DocPatients />
    case "messagerie":    return <div>Messagerie</div>;            // <DocMessagerie />
    case "stats":         return <div>Revenus & Stats</div>;       // <DocStats />
    case "parametres":    return <div>Paramètres</div>;            // <DocSettings />
    default:              return <div>Dashboard médecin</div>;
  }
};

// ── SidebarContent partagé (desktop + drawer mobile) ─────────

const SidebarContent = ({
  active,
  setActive,
  onClose,
}: {
  active: ActivePage;
  setActive: (key: ActivePage) => void;
  onClose?: () => void;
}) => {
  const handleLogout = () => {
    authService.logout();
    onClose?.();
    window.location.href = "/";
  };

  const handleNav = (key: ActivePage) => {
    setActive(key);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full px-4 py-6">

      {/* ── Logo ── */}
      <div className="flex items-center gap-2 px-2 mb-8">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] flex items-center justify-center">
            <Heart size={18} stroke="white" fill="white" />
          </div>
          <span className="text-base font-bold text-gray-900">SanteCi</span>
        </Link>
        <span className="text-[10px] font-bold text-[#1e3a8a] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full tracking-wide ml-1">
          DOCTOR
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ label, key, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => handleNav(key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 w-full text-left ${
                isActive
                  ? "bg-blue-50 text-[#1e3a8a]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon
                size={18}
                className={isActive ? "text-[#1e3a8a]" : "text-gray-400"}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {label}
            </button>
          );
        })}
      </nav>

      {/* ── Bas : Paramètres + Déconnexion ── */}
      <div className="flex flex-col gap-1 pt-4 border-t border-gray-100">
        <button
          onClick={() => handleNav("parametres")}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 w-full text-left ${
            active === "parametres"
              ? "bg-blue-50 text-[#1e3a8a]"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <Settings
            size={18}
            className={active === "parametres" ? "text-[#1e3a8a]" : "text-gray-400"}
            strokeWidth={1.8}
          />
          Paramètres
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-150 w-full text-left"
        >
          <LogOut size={18} className="text-gray-400" strokeWidth={1.8} />
          Déconnexion
        </button>
      </div>
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────

export default function DocSideBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState<ActivePage>("dashboard");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6fb]">

      {/* Hamburger — mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md border border-gray-100 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Overlay — mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer — mobile */}
      <aside
        className={`
          lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent active={active} setActive={setActive} onClose={() => setIsOpen(false)} />
      </aside>

      {/* Sidebar fixe — desktop */}
      <aside className="hidden lg:flex flex-col h-screen w-64 bg-white border-r border-gray-100 shrink-0 sticky top-0">
        <SidebarContent active={active} setActive={setActive} />
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto">
        <PatHeader />
        {renderPage(active, setActive)}
      </main>

    </div>
  );
}