"use client";

import { useState, useMemo } from "react";
import { CreditCard, Lock, Loader2 } from "lucide-react";

type PaymentMethod = "orange_money" | "mtn_money" | "card";

interface PaymentMethodOption {
  value:    PaymentMethod;
  label:    string;
  icon:     React.ReactNode;
  needPhone:boolean;
}

// ── Icônes Mobile Money ───────────────────────────────────────────────────────

function OrangeLogo() {
  return (
    <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
      <span className="text-white text-[10px] font-black">OM</span>
    </div>
  );
}

function MtnLogo() {
  return (
    <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center shrink-0">
      <span className="text-slate-900 text-[10px] font-black">MTN</span>
    </div>
  );
}

const METHODS: PaymentMethodOption[] = [
  { value: "orange_money", label: "Orange Money",    icon: <OrangeLogo />, needPhone: true  },
  { value: "mtn_money",    label: "MTN Mobile Money",icon: <MtnLogo />,    needPhone: true  },
  { value: "card",         label: "Carte Bancaire",  icon: <CreditCard size={18} className="text-slate-500" />, needPhone: false },
];

interface PaymentFormProps {
  totalAmount: number;
  onSubmit:    (method: PaymentMethod, phone?: string) => Promise<void>;
  isLoading:   boolean;
  error?:      string | null;
}

export function PaymentForm({ totalAmount, onSubmit, isLoading, error }: PaymentFormProps) {
  const [selected, setSelected] = useState<PaymentMethod>("orange_money");
  const [phone,    setPhone]    = useState("");

  const activeMethod = useMemo(
    () => METHODS.find((m) => m.value === selected)!,
    [selected]
  );

  const isPhoneValid = !activeMethod.needPhone || phone.replace(/\s/g, "").length >= 8;

  const handleSubmit = async () => {
    if (!isPhoneValid || isLoading) return;
    await onSubmit(selected, activeMethod.needPhone ? phone : undefined);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-base font-bold text-slate-900">Paiement de la consultation</h2>
        <p className="text-xs text-slate-400 mt-0.5">Réservation sécurisée</p>
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

      {/* Choix du moyen de paiement */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-700">Choisissez votre moyen de paiement</p>
        {METHODS.map((method) => {
          const isActive = selected === method.value;
          return (
            <label
              key={method.value}
              onClick={() => setSelected(method.value)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isActive
                  ? "border-[#1e3a8a] bg-blue-50/50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Radio */}
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isActive ? "border-[#1e3a8a]" : "border-slate-300"
              }`}>
                {isActive && <div className="w-2 h-2 rounded-full bg-[#1e3a8a]" />}
              </div>
              {method.icon}
              <span className={`text-sm font-semibold ${isActive ? "text-[#1e3a8a]" : "text-slate-700"}`}>
                {method.label}
              </span>
            </label>
          );
        })}
      </div>

      {/* Numéro de téléphone (Mobile Money) */}
      {activeMethod.needPhone && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">
            Numéro de téléphone de facturation
          </label>
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#1e3a8a] focus-within:ring-1 focus-within:ring-[#1e3a8a]/20 transition-all">
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
            Vous recevrez un prompt sur ce numéro pour valider le paiement.
          </p>
        </div>
      )}

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
        className="w-full py-3.5 bg-[#1e3a8a] text-white text-sm font-bold rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
      >
        {isLoading ? (
          <><Loader2 size={16} className="animate-spin" /> Traitement en cours...</>
        ) : (
          <><Lock size={14} /> Payer {totalAmount.toLocaleString("fr-FR")} FCFA</>
        )}
      </button>
    </div>
  );
}