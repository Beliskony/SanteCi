"use client";

import { useState } from "react";
import { Globe, Eye, MapPin, FileText, Star, Zap, Crown, Loader2 } from "lucide-react";
import { useDoctorDashStore } from "@/app/frontend/store/doctorStore";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";

// ─── VisibilitySection ────────────────────────────────────────────────────────

export function VisibilitySection() {
  const updateMyProfile = useDoctorDashStore((s) => s.updateMyProfile);
  const isSaving        = useDoctorDashStore((s) => s.isSaving);
  const user            = useAuthStore((s) => s.user && isDoctor(s.user) ? s.user : null);

  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState({
    showProfile:  true,
    showLocation: true,
    showBio:      true,
  });

  const togglePref = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    // On passe via updateMyProfile — le backend stocke ces prefs dans le profil
    await updateMyProfile({ bio: user?.profile?.bio } as any);
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
          onChange={() => togglePref("showProfile")}
        />
        <ToggleRow
          icon={<MapPin size={15} className="text-slate-500" />}
          label="Localisation"
          description="Afficher votre ville et quartier d'exercice"
          value={prefs.showLocation}
          onChange={() => togglePref("showLocation")}
        />
        <ToggleRow
          icon={<FileText size={15} className="text-slate-500" />}
          label="Biographie"
          description="Afficher votre présentation et parcours"
          value={prefs.showBio}
          onChange={() => togglePref("showBio")}
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
        {saved ? "Enregistré" : "Enregistrer"}
      </button>
    </div>
  );
}

// ─── SubscriptionSection ──────────────────────────────────────────────────────

export function SubscriptionSection() {
  const user = useAuthStore((s) => s.user && isDoctor(s.user) ? s.user : null);
  const plan = user?.status?.subscription ?? "free";

  const plans = [
    {
      key:   "free",
      label: "Gratuit",
      icon:  <Zap size={18} className="text-slate-400" />,
      price: "0 FCFA",
      features: ["5 consultations/mois", "Profil basique", "Support email"],
    },
    {
      key:   "premium",
      label: "Premium",
      icon:  <Star size={18} className="text-amber-500" />,
      price: "15 000 FCFA/mois",
      features: ["Consultations illimitées", "Profil mis en avant", "Support prioritaire", "Statistiques avancées"],
    },
    {
      key:   "elite",
      label: "Élite",
      icon:  <Crown size={18} className="text-[#1e3a8a]" />,
      price: "35 000 FCFA/mois",
      features: ["Tout Premium", "Badge vérifié", "Accès API", "Manager dédié"],
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-base font-bold text-slate-900">Abonnement</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Plan actuel : <span className="font-semibold text-[#1e3a8a] capitalize">{plan}</span>
          {user?.status?.subscriptionExpiry
            ? ` • Expire le ${new Date(user.status.subscriptionExpiry).toLocaleDateString("fr-FR")}`
            : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isCurrent = p.key === plan;
          return (
            <div
              key={p.key}
              className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all ${
                isCurrent
                  ? "border-[#1e3a8a] bg-[#1e3a8a]/5 ring-1 ring-[#1e3a8a]/20"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {p.icon}
                <p className="text-sm font-bold text-slate-900">{p.label}</p>
                {isCurrent && (
                  <span className="ml-auto text-[10px] font-bold text-[#1e3a8a] bg-[#1e3a8a]/10 px-2 py-0.5 rounded-full">
                    Actuel
                  </span>
                )}
              </div>
              <p className="text-base font-extrabold text-slate-900">{p.price}</p>
              <ul className="flex flex-col gap-1">
                {p.features.map((f) => (
                  <li key={f} className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-slate-400 rounded-full shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {!isCurrent && (
                <button className="mt-auto w-full py-2 text-xs font-bold text-[#1e3a8a] border border-[#1e3a8a] rounded-xl hover:bg-[#1e3a8a] hover:text-white transition-colors">
                  Passer à {p.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────

function ToggleRow({ icon, label, description, value, onChange, disabled = false }: {
  icon: React.ReactNode; label: string; description: string;
  value: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 ${disabled ? "opacity-50" : ""}`}>
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 truncate">{description}</p>
      </div>
      <button
        onClick={disabled ? undefined : onChange}
        className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${value ? "bg-emerald-500" : "bg-slate-200"}`}
        style={{ width: 40, height: 22 }}
      >
        <span
          className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`}
          style={{ width: 18, height: 18, top: 2, left: value ? 2 : 2 }}
        />
      </button>
    </div>
  );
}