"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Search,
  CalendarDays,
  MessageSquare,
  FolderHeart,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import { chatService } from "@/app/frontend/services/chatService";
import { appointmentService } from "@/app/frontend/services/consultationService";
import PatHeader from "@/app/frontend/components/dashboard/patient/PatHeader";
import PatDash from "@/app/frontend/components/dashboard/patient/PatDash";
import AppointmentPage from "@/app/frontend/components/dashboard/patient/AppointmentComponents/AppointmentPage";
import DossierMedical from "@/app/frontend/components/dashboard/patient/DossierMedicalComponents/DossierMedical";
import MesagerieLayout from "@/app/frontend/components/dashboard/messagesComponents/MessagerieLayout";
import { authService } from "@/app/frontend/services/authService";
import FindDoctorPage from "./findDoctor/FindDoctorPage";
import  SettingsPage  from "./SettingPat/SettingsPage";

type ActivePage = "dashboard" | "medecins" | "rdv" | "messages" | "dossier" | "parametres";

const NAV_ITEMS: { label: string; key: ActivePage; icon: React.ElementType }[] = [
  { label: "Tableau de bord",    key: "dashboard",  icon: LayoutDashboard },
  { label: "Trouver un médecin", key: "medecins",   icon: Search },
  { label: "Mes rendez-vous",    key: "rdv",        icon: CalendarDays },
  { label: "Messagerie",         key: "messages",   icon: MessageSquare },
  { label: "Dossier médical",    key: "dossier",    icon: FolderHeart },
];

// Fréquence de rafraîchissement des badges (pas besoin de temps réel strict ici)
const BADGE_REFRESH_MS = 30000;

// ─── Rendu du contenu principal selon la page active ─────────
const renderPage = (active: ActivePage) => {
  switch (active) {
    case "dashboard":  return <PatDash />;
    case "rdv":        return <AppointmentPage />;
    case "dossier":    return <DossierMedical />;
    case "messages":   return <MesagerieLayout />;
    case "medecins":   return <FindDoctorPage />;
    case "parametres": return <SettingsPage />;
    default:           return <PatDash />;
  }
};

// ─── Pastille de nouveauté : signale une info fraîche, jamais un compteur ──
// Émeraude plutôt que bleu de marque, pour ne jamais se confondre avec l'état "actif" d'un lien.
function NavBadge() {
  return (
    <span className="ml-auto relative flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

// ─── Contenu partagé (desktop + drawer mobile) ────────────────
const SidebarContent = ({
  active,
  setActive,
  onClose,
  hasAppointmentToday,
  hasUnreadMessages,
}: {
  active: ActivePage;
  setActive: (key: ActivePage) => void;
  onClose?: () => void;
  hasAppointmentToday: boolean;
  hasUnreadMessages: boolean;
}) => {
  const handleLogout = () => {
    authService.logout();
    onClose?.();
    // redirection vers l'accueil
    window.location.href = "/";
  };

  const handleNav = (key: ActivePage) => {
    setActive(key);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full px-3 py-6">

      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-8">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
            <img src="/icon/favicon.svg" alt="E-SanteCI" className="w-full h-full object-cover" />
          </div>
        </Link>
        <span className="text-[10px] font-bold text-[#1e3a8a] bg-blue-50 border border-blue-100/80 px-2 py-0.5 rounded-full tracking-wide">
          E-SANTECI
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a]/30"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map(({ label, key, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => handleNav(key)}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex items-center gap-3 pr-3 py-2.5 rounded-r-xl text-sm transition-colors duration-150 w-full text-left cursor-pointer border-l-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a]/30 focus-visible:ring-offset-1 ${
                isActive
                  ? "bg-blue-50/80 text-[#1e3a8a] font-semibold border-[#1e3a8a] pl-2.25"
                  : "font-medium text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900 hover:border-gray-200 pl-3"
              }`}
            >
              <Icon
                size={18}
                className={`shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${
                  isActive ? "text-[#1e3a8a]" : "text-gray-400"
                }`}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              {label}
              {key === "rdv" && hasAppointmentToday && <NavBadge />}
              {key === "messages" && hasUnreadMessages && <NavBadge />}
            </button>
          );
        })}
      </nav>

      {/* Bas */}
      <div className="flex flex-col gap-0.5 pt-4 mt-2 border-t border-gray-100">
        <button
          onClick={() => handleNav("parametres")}
          aria-current={active === "parametres" ? "page" : undefined}
          className={`group relative flex items-center gap-3 pr-3 py-2.5 rounded-r-xl text-sm transition-colors duration-150 w-full text-left cursor-pointer border-l-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a]/30 ${
            active === "parametres"
              ? "bg-blue-50/80 text-[#1e3a8a] font-semibold border-[#1e3a8a] pl-2.25"
              : "font-medium text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900 hover:border-gray-200 pl-3"
          }`}
        >
          <Settings
            size={18}
            className={`shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 ${
              active === "parametres" ? "text-[#1e3a8a]" : "text-gray-400"
            }`}
            strokeWidth={1.8}
          />
          Paramètres
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50/70 hover:text-red-600 transition-colors duration-150 w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        >
          <LogOut size={18} className="text-gray-400 shrink-0" strokeWidth={1.8} />
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
  const user = useAuthStore((s) => s.user);

  const [hasAppointmentToday, setHasAppointmentToday] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // ── Rafraîchir les badges ──────────────────────────────────
  const refreshBadges = useCallback(async () => {
    if (!user) return;

    try {
      const conversations = await chatService.getConversations();
      const anyUnread = conversations.some((c) => (c.unreadCount ?? 0) > 0);
      setHasUnreadMessages(anyUnread);
    } catch (err) {
      console.error("[PatSideBar] Erreur chargement conversations :", err);
    }

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const res = await appointmentService.list({
        patientId: String(user._id),
        from: startOfDay.toISOString(),
        to:   endOfDay.toISOString(),
        limit: 20,
      });

      const todayEligible = res.appointments.some((a) =>
        ["confirmed", "ongoing"].includes(a.status.current)
      );
      setHasAppointmentToday(todayEligible);
    } catch (err) {
      console.error("[PatSideBar] Erreur chargement RDV du jour :", err);
    }
  }, [user]);

  useEffect(() => {
    refreshBadges();
    const interval = setInterval(refreshBadges, BADGE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refreshBadges]);

  // En quittant la messagerie après l'avoir consultée, le compteur non-lu redevient à jour
  useEffect(() => {
    if (active !== "messages") refreshBadges();
  }, [active, refreshBadges]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6fb]">

      {/* Hamburger — mobile */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir le menu"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md border border-gray-100 text-gray-700 hover:bg-gray-50 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a]/30"
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
          lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-2xl
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent
          active={active}
          setActive={setActive}
          onClose={() => setIsOpen(false)}
          hasAppointmentToday={hasAppointmentToday}
          hasUnreadMessages={hasUnreadMessages}
        />
      </aside>

      {/* Sidebar fixe — desktop */}
      <aside className="hidden lg:flex flex-col h-screen w-64 bg-white border-r border-gray-100 shrink-0 sticky top-0">
        <SidebarContent
          active={active}
          setActive={setActive}
          hasAppointmentToday={hasAppointmentToday}
          hasUnreadMessages={hasUnreadMessages}
        />
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