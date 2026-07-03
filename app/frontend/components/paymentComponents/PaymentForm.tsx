"use client";

import { useState } from "react";
import { Lock, Loader2, CreditCard } from "lucide-react";
import type { PaymentProvider } from "@/app/frontend/services/paymentService";

interface PaymentFormProps {
  amount:    number;
  onSubmit:  (provider: PaymentProvider, contact: string) => Promise<void>;
  isLoading: boolean;
  error?:    string | null;
}

const fmt = (n: number) => {
  if (n === undefined || n === null || typeof n !== 'number' || isNaN(n)) {
    return "0 FCFA";
  }
  return n.toLocaleString("fr-FR") + " FCFA";
};
const PLATFORM_RATE = 0.30;

export function PaymentForm({ amount, onSubmit, isLoading, error }: PaymentFormProps) {
  const [provider, setProvider] = useState<PaymentProvider>("wave");
  const [contact,  setContact]  = useState("");

  const platformFee = Math.round(amount * PLATFORM_RATE);

  const isValid = provider === "wave"
    ? contact.replace(/\s/g, "").length >= 8
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-slate-900">Paiement de la consultation</h2>
        <p className="text-xs text-slate-400 mt-0.5">Paiement sécurisé · Côte d'Ivoire</p>
      </div>

      {/* Récap montant */}
      <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Consultation</span>
          <span className="font-medium text-slate-800">{fmt(amount)}</span>
        </div>
        <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 mt-1 text-base">
          <span>Total à payer</span>
          <span className="text-[#1e3a8a]">{fmt(amount)}</span>
        </div>
      </div>

      {/* Sélection provider */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-slate-700">Moyen de paiement</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setProvider("wave"); setContact(""); }}
            className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all ${
              provider === "wave"
                ? "border-[#00b9f1] bg-cyan-50/40"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-[#00b9f1] flex items-center justify-center shrink-0">
              <img src="/wavelogo.png" alt="Wave" className="w-4 h-4 rounded-full" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">Wave</p>
              <p className="text-[10px] text-slate-400">Mobile Money</p>
            </div>
          </button>

          <button
            onClick={() => { setProvider("stripe"); setContact(""); }}
            className={`flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all ${
              provider === "stripe"
                ? "border-[#635bff] bg-indigo-50/40"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-[#635bff] flex items-center justify-center shrink-0">
              <CreditCard size={14} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">Stripe</p>
              <p className="text-[10px] text-slate-400">Carte bancaire</p>
            </div>
          </button>
        </div>
      </div>

      {/* Champ adaptatif */}
      <div className="flex flex-col gap-2">
        {provider === "wave" ? (
          <>
            <label className="text-sm font-semibold text-slate-700">Numéro Wave</label>
            <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#00b9f1] focus-within:ring-1 focus-within:ring-[#00b9f1]/20 transition-all">
              <span className="px-3 py-3 text-sm text-slate-500 bg-slate-50 border-r border-slate-200 font-medium shrink-0">
                +225
              </span>
              <input
                type="tel"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="07 45 12 89 33"
                className="flex-1 px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-white"
              />
            </div>
            <p className="text-xs text-slate-400">
              Vous recevrez un prompt Wave sur ce numéro pour valider le paiement.
            </p>
          </>
        ) : (
          <>
            <label className="text-sm font-semibold text-slate-700">Adresse e-mail</label>
            <input
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="vous@example.com"
              className="w-full px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:border-[#635bff] focus:ring-1 focus:ring-[#635bff]/20 transition-all"
            />
            <p className="text-xs text-slate-400">
              Vous serez redirigé vers la page de paiement Stripe sécurisée.
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      <button
        onClick={() => isValid && !isLoading && onSubmit(provider, contact)}
        disabled={!isValid || isLoading}
        className={`w-full py-3.5 text-white text-sm font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm ${
          provider === "wave"
            ? "bg-[#00b9f1] hover:bg-cyan-500"
            : "bg-[#635bff] hover:bg-indigo-500"
        }`}
      >
        {isLoading
          ? <><Loader2 size={16} className="animate-spin" /> Traitement en cours...</>
          : <><Lock size={14} /> Payer {fmt(amount)} via {provider === "wave" ? "Wave" : "Stripe"}</>
        }
      </button>
    </div>
  );
}