"use client";

import { Calendar, User, Monitor } from "lucide-react";

interface PaymentSummaryProps {
  doctorName:    string;
  specialty:     string;
  scheduledFor:  Date | string;
  consultType:   string;
  amount:        number;
  serviceFee?:   number;
}

const TYPE_LABELS: Record<string, string> = {
  video:     "Téléconsultation",
  audio:     "Consultation audio",
  chat:      "Consultation chat",
  in_person: "Consultation cabinet",
};

export function PaymentSummary({
  doctorName, specialty, scheduledFor, consultType, amount, serviceFee = 500,
}: PaymentSummaryProps) {
  const dt = new Date(scheduledFor);
  const isToday = dt.toDateString() === new Date().toDateString();
  const dateLabel = isToday
    ? `Aujourd'hui, ${dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) +
      `, ${dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

  const total = amount + serviceFee;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 sticky top-6">
      <h3 className="text-sm font-bold text-slate-900">Résumé du rendez-vous</h3>

      <div className="flex flex-col gap-3.5">
        {/* Date */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
            <Calendar size={13} className="text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Date & Heure</p>
            <p className="text-sm font-semibold text-slate-800 capitalize mt-0.5">{dateLabel}</p>
          </div>
        </div>

        {/* Médecin */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
            <User size={13} className="text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Médecin</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{doctorName}</p>
            <p className="text-xs text-[#1e3a8a]">{specialty}</p>
          </div>
        </div>

        {/* Type */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
            <Monitor size={13} className="text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Type</p>
            <span className="inline-block mt-0.5 text-xs font-semibold text-[#1e3a8a] bg-blue-50 px-2.5 py-1 rounded-full">
              {TYPE_LABELS[consultType] ?? consultType}
            </span>
          </div>
        </div>
      </div>

      {/* Montant */}
      <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Consultation</span>
          <span className="font-medium text-slate-700">{amount.toLocaleString("fr-FR")} FCFA</span>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Frais de service SantéCI</span>
          <span className="font-medium text-slate-700">{serviceFee.toLocaleString("fr-FR")} FCFA</span>
        </div>
        <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-100 mt-1">
          <span>Total</span>
          <span className="text-[#1e3a8a]">{total.toLocaleString("fr-FR")} FCFA</span>
        </div>
      </div>
    </div>
  );
}