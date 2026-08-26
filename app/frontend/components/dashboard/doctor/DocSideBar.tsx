"use client";

import { useState, useEffect, useCallback } from "react";
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
import MessagerieLayoutDoc from "../messagesComponents/MessagerieLayoutDoc";
import { authService } from "@/app/frontend/services/authService";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";
import { chatService } from "@/app/frontend/services/chatService";
import { appointmentService } from "@/app/frontend/services/consultationService";
import DocDash from "./TableauBord/DocDash";
import AgendaPage from "./AgendaComponents/AgendaPage"
import COnsultationsPage from "./ConsultationComponents/ConsultationsPage";
import PatHeader from "../patient/PatHeader";
import PatientsPage from "./MesPatientsComponents/PatientsPage";
import PerformancePage from "./RevenusEtStats/PerformancePage";
import SettingsPage from "./parametres/SettingsPage";


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

// Fréquence de rafraîchissement des badges (pas besoin de temps réel strict ici)
const BADGE_REFRESH_MS = 30000;

// ── Rendu du contenu principal selon la page active ───────────

const renderPage = (active: ActivePage, setActive: (key: ActivePage) => void) => {
  switch (active) {
    case "dashboard":     return <DocDash onNavigate={(page) => setActive(page as ActivePage)} />     // <DocDash />
    case "agenda":        return <AgendaPage />;                // <DocAgenda />
    case "consultations": return <COnsultationsPage />;         // <DocConsult />
    case "patients":      return <PatientsPage />;          // <DocPatients />
    case "messagerie":    return <MessagerieLayoutDoc />;            // <DocMessagerie />
    case "stats":         return <PerformancePage />;       // <DocStats />
    case "parametres":    return <SettingsPage />;            // <DocSettings />
    default:              return <DocDash />;
  }
};

// ── Petite pastille réutilisable (présence de nouveauté, pas de compteur) ────
function NavBadge() {
  return <span className="ml-auto w-2 h-2 rounded-full bg-[#1e3a8a] shrink-0" />;
}

// ── SidebarContent partagé (desktop + drawer mobile) ─────────

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
          <div className="w-20 h-20 rounded-xl">
            <img src={'/icon/favicon.svg'} className="w-full h-full object-cover" />
          </div>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 w-full text-left cursor-pointer ${
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
              {key === "agenda" && hasAppointmentToday && <NavBadge />}
              {key === "messagerie" && hasUnreadMessages && <NavBadge />}
            </button>
          );
        })}
      </nav>

      {/* ── Bas : Paramètres + Déconnexion ── */}
      <div className="flex flex-col gap-1 pt-4 border-t border-gray-100">
        <button
          onClick={() => handleNav("parametres")}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 w-full text-left cursor-pointer ${
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-150 w-full text-left cursor-pointer"
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
      console.error("[DocSideBar] Erreur chargement conversations :", err);
    }

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const res = await appointmentService.list({
        doctorId: String(user._id),
        from: startOfDay.toISOString(),
        to:   endOfDay.toISOString(),
        limit: 20,
      });

      const todayEligible = res.appointments.some((a) =>
        ["confirmed", "ongoing"].includes(a.status.current)
      );
      setHasAppointmentToday(todayEligible);
    } catch (err) {
      console.error("[DocSideBar] Erreur chargement RDV du jour :", err);
    }
  }, [user]);

  useEffect(() => {
    refreshBadges();
    const interval = setInterval(refreshBadges, BADGE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refreshBadges]);

  // En quittant la messagerie après l'avoir consultée, le badge redevient à jour
  useEffect(() => {
    if (active !== "messagerie") refreshBadges();
  }, [active, refreshBadges]);

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
        {renderPage(active, setActive)}
      </main>

    </div>
  );
}