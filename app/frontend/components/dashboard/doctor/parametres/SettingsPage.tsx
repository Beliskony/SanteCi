"use client";

import { useState } from "react";
import { User, Shield, Video, Eye, CreditCard } from "lucide-react";
import { AccountSection } from "./AccountSection";
import { TelemedicineSection } from "./Telemedicinesection";
import { SecuritySection } from "../../patient/SettingPat/SecuritySection";
import { VisibilitySection, SubscriptionSection } from "./VisibilitySubscriptionSection";

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: "compte",       label: "Compte",       icon: User       },
  { key: "securite",     label: "Sécurité",     icon: Shield     },
  { key: "telemedecine", label: "Télémedecine", icon: Video      },
  { key: "visibilite",   label: "Visibilité",   icon: Eye        },
  { key: "abonnement",   label: "Abonnement",   icon: CreditCard },
] as const;

type NavKey = typeof NAV_ITEMS[number]["key"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<NavKey>("compte");

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gérez votre compte, votre sécurité et vos préférences professionnelles.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* Sidebar nav */}
          <aside className="w-full lg:w-48 shrink-0">
            <nav className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-row lg:flex-col gap-1">
              {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActive(key)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors w-full text-left ${
                    active === key
                      ? "bg-[#1e3a8a]/10 text-[#1e3a8a]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            {active === "compte"       && <AccountSection />}
            {active === "securite"     && <SecuritySection />}
            {active === "telemedecine" && <TelemedicineSection />}
            {active === "visibilite"   && <VisibilitySection />}
            {active === "abonnement"   && <SubscriptionSection />}
          </div>

        </div>
      </div>
    </div>
  );
}