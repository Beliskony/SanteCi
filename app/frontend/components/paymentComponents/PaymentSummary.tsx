"use client";

import { Calendar, User, Monitor, Info } from "lucide-react";

interface PaymentSummaryProps {
  doctorName:   string;
  specialty:    string;
  scheduledFor: Date | string;
  consultType:  string;
  amount:       number;
}

const TYPE_LABELS: Record<string, string> = {
  video:     "Téléconsultation",
  audio:     "Consultation audio",
  chat:      "Consultation chat",
  in_person: "Consultation cabinet",
};

const PLATFORM_RATE = 0.30;

const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

export function PaymentSummary({ doctorName, specialty, scheduledFor, consultType, amount }: PaymentSummaryProps) {
  const dt = new Date(scheduledFor);
  const isToday = dt.toDateString() === new Date().toDateString();
  const dateLabel = isToday
    ? `Aujourd'hui, ${dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) +
      `, ${dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

  const platformFee   = Math.round(amount * PLATFORM_RATE);
  const doctorReceive = amount - platformFee;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 sticky top-6">
      <h3 className="text-sm font-bold text-slate-900">Résumé du rendez-vous</h3>

      <div className="flex flex-col gap-3.5">
        <SummaryRow icon={<Calendar size={13} className="text-slate-500" />} label="Date & Heure">
          <span className="capitalize">{dateLabel}</span>
        </SummaryRow>
        <SummaryRow icon={<User size={13} className="text-slate-500" />} label="Médecin">
          <span>{doctorName}</span>
          <span className="text-xs text-[#1e3a8a] block">{specialty}</span>
        </SummaryRow>
        <SummaryRow icon={<Monitor size={13} className="text-slate-500" />} label="Type">
          <span className="text-xs font-semibold text-[#1e3a8a] bg-blue-50 px-2.5 py-1 rounded-full inline-block">
            {TYPE_LABELS[consultType] ?? consultType}
          </span>
        </SummaryRow>
      </div>

      <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
        <div className="flex justify-between text-sm font-bold text-slate-900">
          <span>Total à payer</span>
          <span className="text-[#1e3a8a]">{fmt(amount)}</span>
        </div>
        <div className="border-t border-slate-100 pt-2 mt-1 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1"><Info size={11} /> Part médecin (70%)</span>
            <span>{fmt(doctorReceive)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1"><Info size={11} /> Commission SantéCI (30%)</span>
            <span>{fmt(platformFee)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <div className="text-sm font-semibold text-slate-800 mt-0.5">{children}</div>
      </div>
    </div>
  );
}