import Link from "next/link";
import { Heart, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full bg-[#0f172a] text-white">

      {/* ── Contenu principal ── */}
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

        {/* Colonne 1 — Branding */}
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#1e3a8a] flex items-center justify-center shrink-0">
              <Heart size={18} stroke="white" fill="white" />
            </div>
            <span className="text-xl font-bold tracking-tight">SanteCi</span>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-400 leading-relaxed max-w-55">
            La plateforme de référence pour la mise en relation et la téléconsultation médicale en Côte d'Ivoire. Simple, rapide et sécurisé.
          </p>

          {/* Boutons stores */}
          <div className="flex gap-3 flex-wrap">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 hover:border-slate-400 transition-colors text-sm font-medium text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              App Store
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 hover:border-slate-400 transition-colors text-sm font-medium text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.18 23.76c.34.19.72.24 1.1.14l12.47-7.17-2.52-2.53-11.05 9.56zM20.7 10.06L17.75 8.4 14.96 11l2.78 2.78 2.97-1.65c.85-.48.85-1.59-.01-2.07zM2.3.28C2.1.5 2 .83 2 1.24v21.52c0 .41.1.74.31.96l.05.05 12.06-12.06v-.28L2.35.23l-.05.05zM14.96 13l-2.79-2.79-9.89 9.89 12.68-7.1z"/>
              </svg>
              Google Play
            </button>
          </div>

          {/* Réseaux sociaux */}
          <div className="flex gap-3">
            {/* Facebook */}
            <a href="#" className="w-8 h-8 rounded-lg border border-slate-700 flex items-center justify-center hover:border-slate-400 hover:bg-slate-800 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            {/* Twitter/X */}
            <a href="#" className="w-8 h-8 rounded-lg border border-slate-700 flex items-center justify-center hover:border-slate-400 hover:bg-slate-800 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            {/* LinkedIn */}
            <a href="#" className="w-8 h-8 rounded-lg border border-slate-700 flex items-center justify-center hover:border-slate-400 hover:bg-slate-800 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>
              </svg>
            </a>
            {/* Instagram */}
            <a href="#" className="w-8 h-8 rounded-lg border border-slate-700 flex items-center justify-center hover:border-slate-400 hover:bg-slate-800 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Colonne 2 — Patients */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white tracking-wide">Patients</h3>
          <ul className="flex flex-col gap-3">
            {[
              { label: "Trouver un médecin", href: "/medecins" },
              { label: "Téléconsultation", href: "/appointments" },
              { label: "Hôpitaux & Cliniques", href: "/hospitals" },
              { label: "Comment ça marche", href: "#" },
              { label: "Questions fréquentes", href: "#" },
              { label: "Tarifs", href: "/pricing" },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Colonne 3 — Professionnels */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white tracking-wide">Professionnels</h3>
          <ul className="flex flex-col gap-3">
            {[
              { label: "SanteCi pour les médecins", href: "#" },
              { label: "Agenda connecté", href: "#" },
              { label: "Téléconsultation Pro", href: "/teleconsultation" },
              { label: "Tarifs & Abonnements", href: "#" },
              { label: "Centre d'aide Pro", href: "#" },
              { label: "Connexion Médecin", href: "/login?role=doctor" },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-slate-400 hover:text-white transition-colors duration-200">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Colonne 4 — Contact & Aide */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-white tracking-wide">Contact & Aide</h3>
          <ul className="flex flex-col gap-4">
            {/* Email */}
            <li className="flex items-start gap-3">
              <Mail size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <a href="mailto:contact@santeci.com" className="text-sm text-slate-400 hover:text-white transition-colors">
                contact@santeci.com
              </a>
            </li>
            {/* Téléphone */}
            <li className="flex items-start gap-3">
              <Phone size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <a href="tel:+22500000000" className="text-sm text-slate-400 hover:text-white transition-colors">
                +225 00 00 00 00 00
              </a>
            </li>
            {/* Adresse */}
            <li className="flex items-start gap-3">
              <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <span className="text-sm text-slate-400 leading-relaxed">
                Cocody Ambassades<br />Abidjan, Côte d'Ivoire
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Séparateur ── */}
      <div className="border-t border-slate-800 mx-6" />

      {/* ── Bas de page — copyright + liens légaux ── */}
      <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
        <span>© 2024 SanteCi. Tous droits réservés.</span>
        <div className="flex flex-wrap gap-4 justify-center">
          {[
            { label: "Mentions légales", href: "/legal" },
            { label: "Politique de confidentialité", href: "/privacy" },
            { label: "Conditions d'utilisation", href: "/terms" },
            { label: "Gestion des cookies", href: "/cookies" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-slate-300 transition-colors">
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Bandeau urgence médicale ── */}
      <div className="bg-[#0f172a] border-t border-slate-700 px-6 py-3">
        <p className="text-xs text-slate-400 text-center max-w-4xl mx-auto">
          <span className="font-semibold text-white">Urgence médicale : </span>
          En cas d'urgence vitale, veuillez contacter immédiatement le SAMU (185) ou les sapeurs pompiers (180). SanteCi ne remplace pas un service d'urgence.
        </p>
      </div>

    </footer>
  );
};

export default Footer;