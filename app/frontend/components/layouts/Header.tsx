"use client";

import { Phone, Bell, Menu, X, Video } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";

const NavItems: { name: string; href: string }[] = [
  { name: "Accueil", href: "/" },
  { name: "Médecins", href: "/doctors" },
  { name: "Hôpitaux", href: "/hospitals" },
  { name: "Teleconsultation", href: "/appointments" },
  { name: "Comment ça marche", href: "/how-it-works" },
  { name: "FAQ", href: "/FAQ" },
];

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  const isAuthenticated = hydrated && !!user && !!user.profile;
  const [menuOpen, setMenuOpen] = useState(false);

  // Rôle lisible et lien dashboard selon le type d'utilisateur
  const roleLabel = !user
    ? ""
    : isDoctor(user)
    ? user.profile.title + " " + user.profile.specialty
    : "Patient";

  const dashboardHref = !user
    ? "/"
    : isDoctor(user)
    ? "/dashboard/doctor"
    : "/dashboard/patient";

  return (
    <header className="w-full">
      {/* ── Barre supérieure ── */}
      <div className="bg-[#1e3a8a] text-white px-6 py-2 flex flex-col sm:flex-row justify-between items-center gap-1 text-sm">
        <div className="flex items-center gap-2">
          <Video size={15} className="shrink-0" />
          <span>Consultation vidéo, audio ou chat — disponible selon les médecins</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={15} className="shrink-0" />
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
          {isAuthenticated && user ? (
            <div className="flex items-center gap-4">
              {/* Statut en ligne + cloche */}
              <div className="flex items-center gap-3 pr-4 border-r border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
                  <span className="text-xs text-gray-500">En ligne</span>
                </div>

                {/* Cloche avec badge */}
                <button className="relative p-1 text-[#1e3a8a] hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell size={18} />
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#ef4444]" />
                </button>
              </div>

              {/* Profil → dashboard */}
              <button
                onClick={() => router.push(dashboardHref)}
                className="flex items-center gap-3 hover:bg-gray-50 rounded-xl px-2 py-1 transition-colors"
              >
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-[#1e3a8a]">
                    {user.profile.firstName || "Utilisateur"} {user.profile.lastName}
                  </span>
                  <span className="text-xs text-gray-400">{roleLabel}</span>
                </div>
                <img
                  src={user.profile.photo || "/default_profile_photo.jpg"}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full object-cover border-2 border-[#1e3a8a]/20"
                />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/auth/login")}
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

          <div className="mt-3">
            {isAuthenticated && user ? (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push(dashboardHref);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <img
                  src={user.profile.photo || "/default_profile_photo.jpg"}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-[#1e3a8a]">
                    {user.profile.firstName} {user.profile.lastName}
                  </span>
                  <span className="text-xs text-gray-400">{roleLabel}</span>
                </div>
                <span className="ml-auto w-2 h-2 rounded-full bg-[#10b981]" />
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setMenuOpen(false); router.push("/auth/login"); }}
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
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;