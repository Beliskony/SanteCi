"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Search,
  CalendarDays,
  MessageSquare,
  FolderHeart,
  Settings,
  LogOut,
  Heart,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import PatHeader from "@/app/frontend/components/dashboard/patient/PatHeader";
import PatDash from "@/app/frontend/components/dashboard/patient/PatDash";
import AppointmentPage from "@/app/frontend/components/dashboard/patient/AppointmentComponents/AppointmentPage";
import DossierMedical from "@/app/frontend/components/dashboard/patient/DossierMedicalComponents/DossierMedical";
import MesagerieLayout from "@/app/frontend/components/dashboard/messagesComponents/MessagerieLayout";
import { authService } from "@/app/frontend/services/authService";

type ActivePage = "dashboard" | "medecins" | "rdv" | "messages" | "dossier" | "parametres";

const NAV_ITEMS: { label: string; key: ActivePage; icon: any }[] = [
  { label: "Tableau de bord",    key: "dashboard",  icon: LayoutDashboard },
  { label: "Trouver un médecin", key: "medecins",   icon: Search },
  { label: "Mes rendez-vous",    key: "rdv",        icon: CalendarDays },
  { label: "Messagerie",         key: "messages",   icon: MessageSquare },
  { label: "Dossier médical",    key: "dossier",    icon: FolderHeart },
];

// ─── Rendu du contenu principal selon la page active ─────────
const renderPage = (active: ActivePage) => {
  switch (active) {
    case "dashboard":  return <PatDash />;
    case "rdv":        return <AppointmentPage />;
    case "dossier":    return <DossierMedical />;
    case "messages":   return <MesagerieLayout />;
    case "medecins":   return <div>Trouver un médecin (à implémenter)</div>;
    case "parametres": return <div>Paramètres (à implémenter)</div>;
    default:           return <PatDash />;
  }
};

// ─── Contenu partagé (desktop + drawer mobile) ────────────────
const SidebarContent = ({
  active,
  setActive,
  onClose,
}: {
  active: ActivePage;
  setActive: (key: ActivePage) => void;
  onClose?: () => void;
}) => {
  const router = useAuthStore(); // garde ton import existant

  const handleLogout = () => {
    authService.logout();
    onClose?.();
    //redirection vers acceuil
    window.location.href = "/"; // redirige vers la page d'accueil
  };

  const handleNav = (key: ActivePage) => {
    setActive(key);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full px-4 py-6">

      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] flex items-center justify-center">
            <Heart size={18} stroke="white" fill="white" />
          </div>
          <span className="text-base font-bold text-gray-900">SanteCi</span>
        </div>
        <span className="text-[10px] font-bold text-[#1e3a8a] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full tracking-wide">
          PATIENT
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

      {/* Navigation */}
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

      {/* Bas */}
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

// ─── Composant principal ──────────────────────────────────────
const PatSideBar = () => {
  const [isOpen, setIsOpen]   = useState(false);
  const [active, setActive]   = useState<ActivePage>("dashboard");

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
        {renderPage(active)}
      </main>

    </div>
  );
};

export default PatSideBar;