"use client";

import { useState, useCallback, useEffect } from "react";
import { Globe, Eye, MapPin, FileText, Star, Zap, Crown, Loader2, Check } from "lucide-react";
import { useDoctorDashStore } from "@/app/frontend/store/doctorStore";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";
import { usePaymentStore } from "@/app/frontend/store/paymentStore";
import type { SubscriptionPlan, PaymentChannel } from "@/app/frontend/services/paymentService";
import { loadPaiementProSDK } from "@/app/frontend/lib/paiementPro";

// ─── SDK PaiementPro ──────────────────────────────────────────────────────────

declare global {
  interface Window {
    PaiementPro: new (merchantId: string) => {
      amount: number; description: string; channel: string;
      countryCurrencyCode: string; referenceNumber: string;
      customerEmail: string; customerFirstName: string;
      customerLastname: string; customerPhoneNumber: string;
      notificationURL: string; returnURL: string; returnContext: string;
      url: string; success: boolean;
      getUrlPayment: () => Promise<void>;
    };
  }
}

const MERCHANT_ID = process.env.NEXT_PUBLIC_PAIEMENTPRO_MERCHANT_ID!;
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL!;


// ─── Plans ────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    key:      'free' as const,
    label:    'Gratuit',
    icon:     <Zap size={18} className="text-slate-400" />,
    price:    '0 FCFA',
    amount:   0,
    features: ['limite de consultations/mois', 'Profil basique', 'Support email'],
  },
  {
    key:      'premium' as const,
    label:    'Premium',
    icon:     <Star size={18} className="text-amber-500" />,
    price:    '15 000 FCFA/mois',
    amount:   15000,
    features: ['Consultations illimitées', 'Profil mis en avant', 'Support prioritaire', 'Statistiques avancées'],
  },
  {
    key:      'elite' as const,
    label:    'Élite',
    icon:     <Crown size={18} className="text-[#1e3a8a]" />,
    price:    '75 000 FCFA/an',
    amount:   75000,
    features: ['Tout Premium', 'Badge vérifié', 'Accès API', 'Manager dédié'],
  },
];

// ─── SubscriptionSection ──────────────────────────────────────────────────────

export function SubscriptionSection() {
  const user               = useAuthStore((s) => s.user && isDoctor(s.user) ? s.user : null);
  const initiateSubscription = usePaymentStore((s) => s.initiateSubscription);
  const plan               = (user?.status?.subscription ?? 'free') as 'free' | 'premium' | 'elite';

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  // Précharger le SDK au montage
  useEffect(() => { loadPaiementProSDK().catch(() => {}); }, []);

  const handleSubscribe = useCallback(async (
    targetPlan: SubscriptionPlan,
    amount:     number,
  ) => {
    setError(null);
    setLoadingPlan(targetPlan);

    try {
      const referenceNumber = `SUB-${user?._id}-${targetPlan.toUpperCase()}-${Date.now()}`;
      const channel: PaymentChannel = 'WAVE'; // channel par défaut

      // 1 — Enregistrer en base via le store
      await initiateSubscription({
        plan:            targetPlan,
        amount,
        currency:        'XOF',
        channel,
        referenceNumber,
      });

      // 2 — Charger SDK
      await loadPaiementProSDK();

      const pp = new window.PaiementPro(MERCHANT_ID);

      pp.amount              = amount;
      pp.description         = `Abonnement SantéCI ${targetPlan} — SantéCI`;
      pp.channel             = channel;
      pp.countryCurrencyCode = '952';
      pp.referenceNumber     = referenceNumber;
      pp.customerEmail       = (user as any)?.email ?? '';
      pp.customerFirstName   = user?.profile?.firstName ?? '';
      pp.customerLastname    = user?.profile?.lastName  ?? '';
      pp.customerPhoneNumber = (user as any)?.profile?.phone ?? '';
      pp.notificationURL     = `${APP_URL}/api/webhooks/paiementpro`;
      pp.returnURL           = `${APP_URL}/doctor/settings?tab=subscription&ref=${referenceNumber}`;
      pp.returnContext       = JSON.stringify({ plan: targetPlan, referenceNumber });

      await pp.getUrlPayment();

      if (pp.success && pp.url) {
        window.location.href = pp.url;
      } else {
        throw new Error("Impossible d'obtenir l'URL de paiement.");
      }

    } catch (err: any) {
      setError(err?.message ?? 'Une erreur est survenue.');
      setLoadingPlan(null);
    }
  }, [user, initiateSubscription]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-slate-900">Abonnement</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Plan actuel : <span className="font-semibold text-[#1e3a8a] capitalize">{plan}</span>
          {user?.status?.subscriptionExpiry
            ? ` • Expire le ${new Date(user.status.subscriptionExpiry).toLocaleDateString('fr-FR')}`
            : ''}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const isCurrent = p.key === plan;
          const isLoading = loadingPlan === p.key;

          return (
            <div
              key={p.key}
              className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all ${
                isCurrent
                  ? 'border-[#1e3a8a] bg-[#1e3a8a]/5 ring-1 ring-[#1e3a8a]/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Header plan */}
              <div className="flex items-center gap-2">
                {p.icon}
                <p className="text-sm font-bold text-slate-900">{p.label}</p>
                {isCurrent && (
                  <span className="ml-auto text-[10px] font-bold text-[#1e3a8a] bg-[#1e3a8a]/10 px-2 py-0.5 rounded-full">
                    Actuel
                  </span>
                )}
              </div>

              {/* Prix */}
              <p className="text-base font-extrabold text-slate-900">{p.price}</p>

              {/* Features */}
              <ul className="flex flex-col gap-1 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Check size={11} className="text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Bouton */}
              {!isCurrent && p.key !== 'free' && (
                <button
                  onClick={() => handleSubscribe(p.key, p.amount)}
                  disabled={!!loadingPlan}
                  className="mt-auto w-full py-2 text-xs font-bold text-[#1e3a8a] border border-[#1e3a8a] rounded-xl hover:bg-[#1e3a8a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {isLoading
                    ? <><Loader2 size={12} className="animate-spin" /> Redirection...</>
                    : `Passer à ${p.label}`
                  }
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── VisibilitySection (inchangée) ───────────────────────────────────────────

export function VisibilitySection() {
  const updateMyProfile = useDoctorDashStore((s) => s.updateMyProfile);
  const isSaving        = useDoctorDashStore((s) => s.isSaving);
  const user            = useAuthStore((s) => s.user && isDoctor(s.user) ? s.user : null);

  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState({
    showProfile:  user?.preferences?.privacy?.showProfile  ?? true,
    showLocation: user?.preferences?.privacy?.showLocation ?? true,
    showBio:      user?.preferences?.privacy?.showBio      ?? true,
  });

  const togglePref = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    await updateMyProfile({ privacy: prefs });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-slate-900">Visibilité publique</h2>
        <p className="text-xs text-slate-400 mt-0.5">Choisissez ce que les patients peuvent voir sur votre profil.</p>
      </div>

      <div className="flex flex-col gap-3">
        <ToggleRow
          icon={<Globe size={15} className="text-[#1e3a8a]" />}
          label="Profil public"
          description="Votre profil est visible dans les résultats de recherche"
          value={prefs.showProfile}
          onChange={() => togglePref('showProfile')}
        />
        <ToggleRow
          icon={<MapPin size={15} className="text-slate-500" />}
          label="Localisation"
          description="Afficher votre ville et quartier d'exercice"
          value={prefs.showLocation}
          onChange={() => togglePref('showLocation')}
        />
        <ToggleRow
          icon={<FileText size={15} className="text-slate-500" />}
          label="Biographie"
          description="Afficher votre présentation et parcours"
          value={prefs.showBio}
          onChange={() => togglePref('showBio')}
        />
        <ToggleRow
          icon={<Eye size={15} className="text-slate-500" />}
          label="Avis patients"
          description="Afficher la note et les avis vérifiés"
          value={true}
          onChange={() => {}}
          disabled
        />
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="self-start flex items-center gap-2 px-5 py-2.5 bg-[#1e3a8a] text-white text-sm font-bold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-60"
      >
        {isSaving && <Loader2 size={14} className="animate-spin" />}
        {saved ? 'Enregistré' : 'Enregistrer'}
      </button>
    </div>
  );
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────

function ToggleRow({ icon, label, description, value, onChange, disabled = false }: {
  icon: React.ReactNode; label: string; description: string;
  value: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 truncate">{description}</p>
      </div>
      <button
        onClick={disabled ? undefined : onChange}
        className={`relative rounded-full transition-colors shrink-0 ${value ? 'bg-emerald-500' : 'bg-slate-200'}`}
        style={{ width: 40, height: 22 }}
      >
        <span
          className="absolute bg-white rounded-full shadow transition-transform"
          style={{ width: 18, height: 18, top: 2, left: value ? 20 : 2 }}
        />
      </button>
    </div>
  );
}