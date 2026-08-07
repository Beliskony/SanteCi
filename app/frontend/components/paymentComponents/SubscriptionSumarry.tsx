"use client";

import { Crown, Check, CalendarClock } from "lucide-react";

interface SubscriptionSummaryProps {
  plan:   "premium" | "elite";
  amount: number;
}

const PLAN_INFO: Record<"premium" | "elite", {
  label: string;
  color: string;
  bg: string;
  benefits: string[];
}> = {
  premium: {
    label: "Premium",
    color: "#1e3a8a",
    bg: "bg-blue-50",
    benefits: [
      "Visibilité renforcée dans les résultats de recherche",
      "Badge Premium sur votre profil",
      "Statistiques avancées de votre activité",
    ],
  },
  elite: {
    label: "Elite",
    color: "#b45309",
    bg: "bg-amber-50",
    benefits: [
      "Visibilité maximale — priorité sur Premium et Free",
      "Badge Elite sur votre profil",
      "Statistiques avancées + support prioritaire",
      "Mise en avant sur la page d'accueil",
    ],
  },
};

const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

export function SubscriptionSummary({ plan, amount }: SubscriptionSummaryProps) {
  const info = PLAN_INFO[plan];
  const nextRenewal = new Date();
  nextRenewal.setMonth(nextRenewal.getMonth() + 1);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 sticky top-6">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg ${info.bg} flex items-center justify-center shrink-0`}>
          <Crown size={15} style={{ color: info.color }} />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Abonnement {info.label}</h3>
      </div>

      <div className="flex flex-col gap-2">
        {info.benefits.map((b, i) => (
          <div key={i} className="flex items-start gap-2">
            <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" />
            <span className="text-xs text-slate-600 leading-relaxed">{b}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-100 pt-3">
        <CalendarClock size={13} />
        <span>
          Renouvellement automatique le{" "}
          {nextRenewal.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="flex justify-between text-sm font-bold text-slate-900">
          <span>Total à payer</span>
          <span style={{ color: info.color }}>{fmt(amount)}</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Facturation mensuelle, résiliable à tout moment.</p>
      </div>
    </div>
  );
}