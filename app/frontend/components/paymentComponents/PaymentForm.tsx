"use client";

import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";

type PaymentMethod = "wave";

interface PaymentFormProps {
  totalAmount: number;
  onSubmit:    (method: PaymentMethod, phone?: string) => Promise<void>;
  isLoading:   boolean;
  error?:      string | null;
}

function WaveLogo() {
  return (
    <div className="w-7 h-7 rounded-full bg-[#00b9f1] flex items-center justify-center shrink-0">
      <img src="/wavelogo.png" alt="Wave" className="w-4 h-4 rounded-full" />
    </div>
  );
}

export function PaymentForm({ totalAmount, onSubmit, isLoading, error }: PaymentFormProps) {
  const [phone, setPhone] = useState("");

  const isPhoneValid = phone.replace(/\s/g, "").length >= 8;

  const handleSubmit = async () => {
    if (!isPhoneValid || isLoading) return;
    await onSubmit("wave", phone);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-base font-bold text-slate-900">Paiement de la consultation</h2>
        <p className="text-xs text-slate-400 mt-0.5">Réservation sécurisée via Wave</p>
      </div>

      {/* Récapitulatif montant */}
      <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Consultation</span>
          <span className="font-medium">{(totalAmount - 500).toLocaleString("fr-FR")} FCFA</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Frais de service SantéCI</span>
          <span className="font-medium">500 FCFA</span>
        </div>
        <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200 mt-1">
          <span>Total à payer</span>
          <span className="text-[#1e3a8a] text-base">{totalAmount.toLocaleString("fr-FR")} FCFA</span>
        </div>
      </div>

      {/* Wave — moyen de paiement unique */}
      <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-[#00b9f1] bg-cyan-50/40">
        <WaveLogo />
        <div>
          <p className="text-sm font-semibold text-slate-900">Wave</p>
          <p className="text-xs text-slate-400">Paiement mobile instantané</p>
        </div>
      </div>

      {/* Numéro de téléphone */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">
          Numéro Wave de facturation
        </label>
        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#00b9f1] focus-within:ring-1 focus-within:ring-[#00b9f1]/20 transition-all">
          <span className="px-3 py-3 text-sm text-slate-500 bg-slate-50 border-r border-slate-200 font-medium shrink-0">
            +225
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07 45 12 89 33"
            className="flex-1 px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none bg-white"
          />
        </div>
        <p className="text-xs text-slate-400">
          Vous recevrez un prompt Wave sur ce numéro pour valider le paiement.
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Bouton paiement */}
      <button
        onClick={handleSubmit}
        disabled={!isPhoneValid || isLoading}
        className="w-full py-3.5 bg-[#00b9f1] text-white text-sm font-bold rounded-xl hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        {isLoading ? (
          <><Loader2 size={16} className="animate-spin" /> Traitement en cours...</>
        ) : (
          <><Lock size={14} /> Payer {totalAmount.toLocaleString("fr-FR")} FCFA via Wave</>
        )}
      </button>
    </div>
  );
}