"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, CheckCircle, Loader2 } from "lucide-react";
import { useDoctorProfile, useDoctorDashStore } from "@/app/frontend/store/doctorStore";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";

export function AccountSection() {
  const profile     = useDoctorProfile();
  const user        = useAuthStore((s) => s.user && isDoctor(s.user) ? s.user : null);
  const updateMyProfile = useDoctorDashStore((s) => s.updateMyProfile);
  const uploadPhoto     = useDoctorDashStore((s) => s.uploadPhoto);
  const isSaving        = useDoctorDashStore((s) => s.isSaving);
  const error           = useDoctorDashStore((s) => s.error);
  const clearError      = useDoctorDashStore((s) => s.clearError);

  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved]   = useState(false);
  const [form, setForm]     = useState({
    specialty: profile?.specialty ?? "",
    bio:       profile?.bio       ?? "",
    languages: profile?.languages,
    yearsOfExperience: profile?.yearsOfExperience ?? 0,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      specialty: profile.specialty ?? "",
      bio:       profile.bio       ?? "",
      languages: profile.languages,
      yearsOfExperience: profile.yearsOfExperience ?? 0,
    });
  }, [profile]);

  const initials = `${profile?.firstName?.[0] ?? ""}${profile?.lastName?.[0] ?? ""}`;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPhoto(file);
  };

  const handleSave = async () => {
    clearError();
    try {
      await updateMyProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error("Échec updateMyProfile:", e);
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Photo + nom (lecture seule) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Compte professionnel</h2>
            <p className="text-xs text-slate-400 mt-0.5">Gérez vos informations publiques et vos préférences d&apos;activité.</p>
          </div>
          {user?.status?.isVerified && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <CheckCircle size={12} /> Vérifié
            </span>
          )}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {profile?.photo ? (
              <img src={profile.photo} alt="avatar" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow cursor-pointer" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center text-lg font-extrabold text-[#1e3a8a]">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-6 h-6 bg-[#1e3a8a] rounded-full flex items-center justify-center shadow-md hover:bg-blue-800 transition-colors"
            >
              <Camera size={11} className="text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              {profile?.title} {profile?.firstName} {profile?.lastName}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Le nom affiché n&apos;est pas modifiable ici.</p>
          </div>
        </div>

        {/* Champs éditables */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Spécialité">
            <p
              className="w-full text-sm text-slate-800 bg-transparent outline-none"
            >
              {form.specialty}
            </p>
          </Field>

          <Field label="Langue">
            <select
              value={form.languages && form.languages.length > 0 ? form.languages[0] : 'fr'}
              onChange={(e) => setForm({ 
              ...form, 
              languages: [e.target.value as "fr" | "en"] 
            })}
              className="w-full text-sm text-slate-800 bg-transparent outline-none"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </Field>

          <Field label="Téléphone (lecture seule)">
            <p className="text-sm font-semibold text-[#1e3a8a]">{user?.contact?.phone ?? "—"}</p>
          </Field>

          <Field label="Ville">
            <p className="text-sm text-slate-700">{user?.location?.city}{user?.location?.district ? `, ${user.location.district}` : ""}</p>
          </Field>

          <Field label="Années d'expérience" className="sm:col-span-2">
            <input
              type="number"
              min={0}
              value={form.yearsOfExperience}
              onChange={(e) => setForm({ ...form, yearsOfExperience: parseInt(e.target.value) || 0 })}
              className="w-full text-sm text-slate-800 bg-transparent outline-none"
            />
          </Field>

          <Field label="Bio" className="sm:col-span-2">
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full text-sm text-slate-800 bg-transparent outline-none resize-none"
              placeholder="Décrivez votre parcours et votre approche..."
            />
          </Field>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a8a] text-white text-sm font-bold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saved ? "Enregistré" : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex flex-col gap-1 ${className}`}>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}