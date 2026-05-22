"use client";

import { Phone, Bell, Menu, X, Video, LayoutDashboard, Settings, LogOut, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, useMemo } from "react";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";
import { authService } from "@/app/frontend/services/authService";

const NavItems: { name: string; href: string }[] = [
  { name: "Accueil",            href: "/" },
  { name: "Médecins",           href: "/medecins" },
  { name: "Hôpitaux",           href: "/hospitals" },
  { name: "Teleconsultation",   href: "/teleconsultation" },
  { name: "Comment ça marche",  href: "/how-it-works" },
  { name: "FAQ",                href: "/FAQ" },
];

// ✅ FIX #3 — Statique → hors du composant, jamais recréé
const PLACEHOLDER_NOTIFICATIONS = [
  { id: 1, text: "Votre RDV du 15 mai est confirmé.",   time: "Il y a 5 min", read: false },
  { id: 2, text: "Dr. Kouamé a accepté votre demande.", time: "Il y a 1h",    read: false },
  { id: 3, text: "Votre ordonnance est disponible.",    time: "Hier",         read: true  },
];

const Header = () => {
  const pathname = usePathname();
  const router   = useRouter();

  // ✅ FIX #1 — Sélecteurs atomiques : chaque valeur ne re-render que si ELLE change
  // Le Header entier ne re-render plus à chaque update du store (health, location, etc.)
  const role      = useAuthStore((s) => s.user?.role);
  const firstName = useAuthStore((s) => s.user?.profile?.firstName);
  const lastName  = useAuthStore((s) => s.user?.profile?.lastName);
  const photo     = useAuthStore((s) => s.user?.profile?.photo);
  const title     = useAuthStore((s) =>
    s.user?.role === "doctor" ? (s.user as any).profile?.title : undefined
  );
  const specialty = useAuthStore((s) =>
    s.user?.role === "doctor" ? (s.user as any).profile?.specialty : undefined
  );

  const [hydrated,      setHydrated]      = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [userDropdown,  setUserDropdown]  = useState(false);
  const [notifDropdown, setNotifDropdown] = useState(false);

  const userRef  = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserDropdown(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ✅ FIX #1 (suite) — isAuthenticated basé sur des valeurs atomiques
  const isAuthenticated = hydrated && !!role && !!firstName;

  // ✅ FIX #3 — unreadCount mémorisé (sera utile quand tu brancheras les vraies notifs)
  const unreadCount = useMemo(
    () => PLACEHOLDER_NOTIFICATIONS.filter((n) => !n.read).length,
    [] // statique pour l'instant
  );

  const roleLabel = useMemo(() => {
    if (!isAuthenticated) return "";
    if (role === "doctor") {
      return `${title ?? ""} · ${specialty ?? ""}`.trim().replace(/^·\s*/, "");
    }
    return "Patient";
  }, [isAuthenticated, role, title, specialty]);

  const dashboardHref = role === "doctor" ? "/doctor"          : "/patient";
  const settingsHref  = role === "doctor" ? "/doctor/settings" : "/patient/settings";

  // ✅ FIX #2 — console.log supprimés (ils s'exécutaient à chaque render !)

  const handleLogout = () => {
    authService.logout();
    setUserDropdown(false);
    setMenuOpen(false);
    router.push("/");
  };

  return (
    <header className="w-full">

      {/* ── Barre supérieure ── */}
      <div className="bg-[#1e3a8a] text-white px-4 py-2 flex flex-col sm:flex-row justify-between items-center gap-1 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 text-center sm:text-left">
          <Video size={14} className="shrink-0 hidden sm:block" />
          <span>Consultation vidéo, audio ou chat — disponible selon les médecins</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Phone size={14} className="shrink-0" />
          <span>Support 01 23 45 67 89</span>
        </div>
      </div>

      {/* ── Barre principale ── */}
      <div className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-[#1e3a8a] shrink-0">
          SanteMedCI
        </Link>

        {/* Nav desktop */}
        <nav className="hidden lg:flex items-center gap-6">
          {NavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm pb-0.5 border-b-2 transition-colors duration-200 ${
                pathname === item.href
                  ? "text-[#3742fa] border-[#3742fa]"
                  : "text-[#1e3a8a] border-transparent hover:text-[#3742fa] hover:border-[#3742fa]"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Actions desktop */}
        <div className="hidden lg:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">

              {/* Statut en ligne */}
              <div className="flex items-center gap-1.5 pr-3 border-r border-gray-200">
                <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
                <span className="text-xs text-gray-500">En ligne</span>
              </div>

              {/* ── Cloche notifications ── */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifDropdown(!notifDropdown); setUserDropdown(false); }}
                  className="relative p-1.5 text-[#1e3a8a] hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#ef4444] text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifDropdown && (
                  <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                      <span className="text-sm font-semibold text-gray-900">Notifications</span>
                      <button className="text-xs text-[#1e3a8a] hover:underline">Tout marquer lu</button>
                    </div>
                    <div className="flex flex-col max-h-72 overflow-y-auto">
                      {PLACEHOLDER_NOTIFICATIONS.map((n) => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-none ${
                            !n.read ? "bg-[#1e3a8a]/5" : ""
                          }`}
                        >
                          <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.read ? "bg-[#1e3a8a]" : "bg-gray-300"}`} />
                          <div className="flex flex-col gap-0.5 flex-1">
                            <p className="text-xs text-gray-700 leading-relaxed">{n.text}</p>
                            <span className="text-[10px] text-gray-400">{n.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-gray-100">
                      <Link
                        href="/notifications"
                        onClick={() => setNotifDropdown(false)}
                        className="text-xs text-[#1e3a8a] font-medium hover:underline"
                      >
                        Voir toutes les notifications →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Profil + dropdown ── */}
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => { setUserDropdown(!userDropdown); setNotifDropdown(false); }}
                  className="flex items-center gap-2.5 hover:bg-gray-50 rounded-xl px-2 py-1 transition-colors"
                >
                  <img
                    src={photo || "/default_profile_photo.jpg"}
                    alt="Avatar"
                    className="w-9 h-9 rounded-full object-cover border-2 border-[#1e3a8a]/20"
                  />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-sm font-semibold text-[#1e3a8a]">
                      {firstName ?? "Utilisateur"} {lastName ?? ""}
                    </span>
                    <span className="text-xs text-gray-400">{roleLabel}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${userDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {userDropdown && (
                  <div className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                    <Link
                      href={dashboardHref}
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <LayoutDashboard size={16} className="text-[#1e3a8a]" />
                      Dashboard
                    </Link>
                    <Link
                      href={settingsHref}
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings size={16} className="text-[#1e3a8a]" />
                      Paramètres
                    </Link>
                    <div className="h-px bg-gray-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 text-sm text-[#1e3a8a] border border-transparent rounded-lg hover:bg-[#f0f4ff] hover:border-[#1e3a8a] transition-all duration-200"
              >
                Se connecter
              </button>
              <button
                onClick={() => router.push("/appointments")}
                className="px-4 py-2 text-sm bg-[#1e3a8a] text-white rounded-lg hover:bg-[#3742fa] transition-colors duration-200"
              >
                Prendre RDV
              </button>
            </div>
          )}
        </div>

        {/* Hamburger mobile */}
        <button
          className="lg:hidden p-1 text-[#1e3a8a]"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Ouvrir le menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ── Menu mobile ── */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-6 py-4 flex flex-col gap-1">
          {NavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`py-3 text-sm border-b border-gray-100 last:border-none transition-colors ${
                pathname === item.href
                  ? "text-[#3742fa] font-medium"
                  : "text-[#1e3a8a] hover:text-[#3742fa]"
              }`}
            >
              {item.name}
            </Link>
          ))}

          <div className="mt-3 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 bg-gray-50">
                  <img
                    src={photo || "/default_profile_photo.jpg"}
                    alt="Avatar"
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-sm font-semibold text-[#1e3a8a]">
                      {firstName} {lastName}
                    </span>
                    <span className="text-xs text-gray-400">{roleLabel}</span>
                  </div>
                  <span className="ml-auto w-2 h-2 rounded-full bg-[#10b981]" />
                </div>

                <Link
                  href={dashboardHref}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 border border-gray-100 transition-colors"
                >
                  <LayoutDashboard size={16} className="text-[#1e3a8a]" />
                  Dashboard
                </Link>
                <Link
                  href={settingsHref}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 border border-gray-100 transition-colors"
                >
                  <Settings size={16} className="text-[#1e3a8a]" />
                  Paramètres
                </Link>
                <Link
                  href="/notifications"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 border border-gray-100 transition-colors"
                >
                  <Bell size={16} className="text-[#1e3a8a]" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-[#ef4444] text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 border border-red-100 transition-colors"
                >
                  <LogOut size={16} />
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setMenuOpen(false); router.push("/login"); }}
                  className="w-full py-2.5 text-sm text-[#1e3a8a] border border-[#1e3a8a] rounded-lg hover:bg-[#f0f4ff] transition-colors"
                >
                  Se connecter
                </button>
                <button
                  onClick={() => { setMenuOpen(false); router.push("/appointments"); }}
                  className="w-full py-2.5 text-sm bg-[#1e3a8a] text-white rounded-lg hover:bg-[#3742fa] transition-colors"
                >
                  Prendre RDV
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;