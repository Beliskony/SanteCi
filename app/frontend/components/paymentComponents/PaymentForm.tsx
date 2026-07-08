"use client";

import { useState } from "react";
import { Lock, Loader2, CreditCard, Smartphone } from "lucide-react";
import type { PaymentChannel } from "@/app/frontend/services/paymentService";

interface PaymentFormProps {
  amount:    number;
  onSubmit:  (channel: PaymentChannel, phone: string) => Promise<void>;
  isLoading: boolean;
  error?:    string | null;
}

const CHANNELS: { key: PaymentChannel; label: string; sub: string; color: string; icon: React.ReactNode }[] = [
  { key: 'WAVE',         label: 'Wave',         sub: 'Mobile Money', color: '#00b9f1',
    icon: <img src="/wavelogo.png" alt="Wave" className="w-4 h-4 rounded-full" /> },
  { key: 'ORANGE_MONEY', label: 'Orange Money', sub: 'Mobile Money', color: '#ff6600',
    icon: <Smartphone size={14} className="text-white" /> },
  { key: 'MTN_MONEY',    label: 'MTN Money',    sub: 'Mobile Money', color: '#ffc300',
    icon: <Smartphone size={14} className="text-white" /> },
  { key: 'CARD',         label: 'Carte bancaire', sub: 'Visa / Mastercard', color: '#1e3a8a',
    icon: <CreditCard size={14} className="text-white" /> },
];

const fmt = (n: number) =>
  (typeof n === 'number' && !isNaN(n) ? n : 0).toLocaleString("fr-FR") + " FCFA";

export function PaymentForm({ amount, onSubmit, isLoading, error }: PaymentFormProps) {
  const [channel, setChannel] = useState<PaymentChannel>('WAVE');
  const [phone,   setPhone]   = useState('');

  const needsPhone = channel !== 'CARD';
  const isValid    = needsPhone
    ? phone.replace(/\s/g, '').length >= 8
    : true;

  const selected = CHANNELS.find(c => c.key === channel)!;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-slate-900">Paiement de la consultation</h2>
        <p className="text-xs text-slate-400 mt-0.5">Paiement sécurisé via PaiementPro · CI</p>
      </div>

      {/* Récap montant */}
      <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center">
        <span className="text-sm text-slate-600">Total à payer</span>
        <span className="text-base font-bold text-[#1e3a8a]">{fmt(amount)}</span>
      </div>

      {/* Sélection channel */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-slate-700">Moyen de paiement</p>
        <div className="grid grid-cols-2 gap-2">
          {CHANNELS.map(({ key, label, sub, color, icon }) => (
            <button
              key={key}
              onClick={() => { setChannel(key); setPhone(''); }}
              className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                channel === key
                  ? 'border-current bg-opacity-5'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              style={channel === key ? { borderColor: color } : {}}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: color }}
              >
                {icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="text-[10px] text-slate-400">{sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Champ téléphone (Mobile Money) ou message info (Carte) */}
      {needsPhone ? (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">
            Numéro {selected.label}
          </label>
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-1 transition-all"
            style={{ '--tw-ring-color': selected.color } as any}
          >
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
            Vous recevrez une invite {selected.label} sur ce numéro pour valider.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3.5">
          <CreditCard size={16} className="text-[#1e3a8a] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Paiement sécurisé par carte</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Vous serez redirigé vers la page PaiementPro pour saisir vos informations bancaires.
              Visa et Mastercard acceptées.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      <button
        onClick={() => isValid && !isLoading && onSubmit(channel, phone)}
        disabled={!isValid || isLoading}
        className="w-full py-3.5 text-white text-sm font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
        style={{ backgroundColor: isValid && !isLoading ? selected.color : undefined }}
      >
        {isLoading
          ? <><Loader2 size={16} className="animate-spin" /> Traitement en cours...</>
          : <><Lock size={14} /> Payer {fmt(amount)} via {selected.label}</>
        }
      </button>
    </div>
  );
}