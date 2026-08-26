"use client";

import { useState } from "react";
import {
  Lock, Eye, EyeOff, Shield, ShieldOff,
  Smartphone, AlertCircle, CheckCircle, Loader2,
  MonitorSmartphone, Clock,
} from "lucide-react";
import { useDoctorDashStore } from "@/app/frontend/store/doctorStore";
import { useAuthStore } from "@/app/frontend/store/useAuthStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-8 h-8 rounded-lg bg-[#1e3a8a]/10 flex items-center justify-center text-[#1e3a8a]">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  placeholder = "••••••••",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-300 outline-none focus:border-[#1e3a8a] focus:bg-white transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function DoctorSecuritySection() {
  const subscriptionStatus = useDoctorDashStore((s) => s.subscriptionStatus);
  const user = useAuthStore((s) => s.user) as any;

  // ── État mot de passe ─────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdError,   setPwdError]   = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleChangePassword = async () => {
    setPwdError(null);
    setPwdSuccess(false);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError("Tous les champs sont requis.");
      return;
    }
    if (newPwd.length < 8) {
      setPwdError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("Les mots de passe ne correspondent pas.");
      return;
    }

    try {
      setPwdLoading(true);
      const doctorId = user?._id;
      const res = await fetch(`/api/doctors/${doctorId}/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Erreur serveur.");
      setPwdSuccess(true);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (e: any) {
      setPwdError(e?.message ?? "Une erreur est survenue.");
    } finally {
      setPwdLoading(false);
    }
  };

  // ── Statut du compte ──────────────────────────────────────────────────────
  const accountStatus = (user?.status?.accountStatus ?? "pending") as string;

  const statusConfig = {
    active:    { label: "Actif",                       color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: <CheckCircle size={13} /> },
    pending:   { label: "En attente de vérification",  color: "text-amber-600 bg-amber-50 border-amber-200",       icon: <Clock size={13} /> },
    suspended: { label: "Suspendu",                    color: "text-red-600 bg-red-50 border-red-200",             icon: <ShieldOff size={13} /> },
    blocked:   { label: "Bloqué",                      color: "text-red-700 bg-red-100 border-red-300",            icon: <AlertCircle size={13} /> },
  };
  const conf = statusConfig[accountStatus as keyof typeof statusConfig] ?? statusConfig.pending;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Statut du compte ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h1 className="text-sm font-bold text-slate-800 mb-2.5">Statut du compte</h1>

        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold w-fit ${conf.color}`}>
          {conf.icon} {conf.label}
        </div>

        {accountStatus === "pending" && (
          <p className="mt-3 text-xs text-slate-500 leading-relaxed max-w-md">
            Votre compte est en attente de vérification. Vous serez notifié par email dès que votre profil sera validé.
          </p>
        )}
        {accountStatus === "suspended" && (
          <p className="mt-3 text-xs text-red-500 leading-relaxed max-w-md">
            Votre compte a été suspendu. Contactez le support pour plus d'informations.
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-3">
            <p className="text-xs text-slate-400 mb-0.5">Abonnement</p>
            <p className="text-sm font-bold text-slate-800 capitalize">
              {subscriptionStatus?.subscription ?? "free"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-3">
            <p className="text-xs text-slate-400 mb-0.5">Expiration</p>
            <p className="text-sm font-bold text-slate-800">
              {subscriptionStatus?.subscriptionExpiry
                ? new Date(subscriptionStatus.subscriptionExpiry).toLocaleDateString("fr-FR")
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Mot de passe ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <SectionTitle icon={<Lock size={15} />} title="Mot de passe" />

        <div className="flex flex-col gap-4 max-w-md">
          <PasswordInput label="Mot de passe actuel"          value={currentPwd} onChange={setCurrentPwd} />
          <PasswordInput label="Nouveau mot de passe"         value={newPwd}     onChange={setNewPwd}     placeholder="8 caractères minimum" />
          <PasswordInput label="Confirmer le nouveau mot de passe" value={confirmPwd} onChange={setConfirmPwd} />

          {pwdError && (
            <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
              <AlertCircle size={13} className="shrink-0" /> {pwdError}
            </div>
          )}
          {pwdSuccess && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
              <CheckCircle size={13} className="shrink-0" /> Mot de passe mis à jour avec succès.
            </div>
          )}

          <button
            onClick={handleChangePassword}
            disabled={pwdLoading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1e3a8a] text-white text-sm font-semibold rounded-xl hover:bg-[#2d4fa8] disabled:opacity-60 transition-colors w-fit cursor-pointer"
          >
            {pwdLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            {pwdLoading ? "Mise à jour..." : "Mettre à jour"}
          </button>
        </div>
      </div>

      {/* ── Double authentification ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <SectionTitle icon={<Smartphone size={15} />} title="Double authentification (2FA)" />

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
            <Shield size={15} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Bientôt disponible</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed max-w-sm">
              La double authentification par SMS ou application d'authentification sera disponible prochainement pour renforcer la sécurité de votre compte.
            </p>
          </div>
        </div>
      </div>

      {/* ── Sessions actives ──────────────────────────────────────────────── */}
      {user?.security?.devices && user.security.devices.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <SectionTitle icon={<MonitorSmartphone size={15} />} title="Sessions actives" />

          <div className="flex flex-col gap-2">
            {user.security.devices.map((device: any, i: number) => (
              <div
                key={device._id ?? i}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div className="w-8 h-8 rounded-lg bg-[#1e3a8a]/10 flex items-center justify-center text-[#1e3a8a] shrink-0">
                  <MonitorSmartphone size={15} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    {device.deviceName ?? device.userAgent ?? "Appareil inconnu"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {device.lastSeen
                      ? `Dernière activité : ${new Date(device.lastSeen).toLocaleDateString("fr-FR")}`
                      : device.ip ?? ""}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-3">
            La révocation de sessions sera disponible prochainement.
          </p>
        </div>
      )}
    </div>
  );
}