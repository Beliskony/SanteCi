"use client";

import { useState } from "react";
import { Bell, Globe, Lock, Loader2 } from "lucide-react";
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore";
import { usePatientStore } from "@/app/frontend/store/patientStore";
import { SectionLabel, SaveButton } from "./ProfileSection";

export function PreferencesSection() {
  const user    = useAuthStore((s) => s.user);
  const patient = user && isPatient(user) ? user : null;
  const prefs   = patient?.preferences;

  const updatePreferences = usePatientStore((s) => s.updatePreferences);
  const isSaving          = usePatientStore((s) => s.isSaving);

  const [language, setLanguage] = useState<"fr" | "en">(prefs?.language ?? "fr");
  const [notifs,   setNotifs]   = useState({
    sms:   prefs?.notifications?.sms   ?? true,
    email: prefs?.notifications?.email ?? true,
    push:  prefs?.notifications?.push  ?? true,
  });
  const [privacy, setPrivacy] = useState({
    showProfile:    prefs?.privacy?.showProfile    ?? true,
    showMedicalInfo:prefs?.privacy?.showMedicalInfo?? false,
    shareLocation:  prefs?.privacy?.shareLocation  ?? false,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await updatePreferences({
      language,
      notifications: notifs,
      privacy,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Langue ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel icon={<Globe size={14} />} label="Langue" />
        <div className="flex gap-3">
          {([{ v: "fr", l: "Français 🇫🇷" }, { v: "en", l: "English 🇬🇧" }] as const).map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setLanguage(v)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
                language === v
                  ? "bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel icon={<Bell size={14} />} label="Notifications" />
        <div className="flex flex-col gap-2">
          <Toggle
            label="SMS"
            description="Recevoir des rappels de rendez-vous par SMS"
            checked={notifs.sms}
            onChange={(v) => setNotifs((n) => ({ ...n, sms: v }))}
          />
          <Toggle
            label="Email"
            description="Recevoir les confirmations et ordonnances par email"
            checked={notifs.email}
            onChange={(v) => setNotifs((n) => ({ ...n, email: v }))}
          />
          <Toggle
            label="Notifications push"
            description="Alertes en temps réel dans l'application"
            checked={notifs.push}
            onChange={(v) => setNotifs((n) => ({ ...n, push: v }))}
          />
        </div>
      </div>

      {/* ── Confidentialité ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel icon={<Lock size={14} />} label="Confidentialité" />
        <div className="flex flex-col gap-2">
          <Toggle
            label="Profil visible"
            description="Permettre aux médecins de voir votre profil"
            checked={privacy.showProfile}
            onChange={(v) => setPrivacy((p) => ({ ...p, showProfile: v }))}
          />
          <Toggle
            label="Informations médicales"
            description="Partager vos antécédents avec les médecins consultés"
            checked={privacy.showMedicalInfo}
            onChange={(v) => setPrivacy((p) => ({ ...p, showMedicalInfo: v }))}
          />
          <Toggle
            label="Partager la localisation"
            description="Autoriser la géolocalisation pour trouver des médecins proches"
            checked={privacy.shareLocation}
            onChange={(v) => setPrivacy((p) => ({ ...p, shareLocation: v }))}
          />
        </div>
      </div>

      <SaveButton onSave={handleSave} isSaving={isSaving} saved={saved} />
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  label, description, checked, onChange,
}: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors group"
    >
      <div>
        <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      {/* Switch */}
      <div className={`relative shrink-0 w-10 h-5.5 rounded-full transition-colors ${checked ? "bg-[#1e3a8a]" : "bg-slate-300"}`}
        style={{ height: "22px" }}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </div>
  );
}