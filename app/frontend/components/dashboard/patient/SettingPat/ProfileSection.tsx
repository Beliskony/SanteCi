"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Save, Loader2, User, MapPin } from "lucide-react";
import { useAuthStore, isPatient, PatientProfile } from "@/app/frontend/store/useAuthStore";
import { usePatientStore } from "@/app/frontend/store/patientStore";

export function ProfileSection() {
  const user = useAuthStore((s) => s.user);
  const patient = user && isPatient(user) ? user : null;

  const updateProfile = usePatientStore((s) => s.updateProfile);
  const uploadPhoto = usePatientStore((s) => s.uploadPhoto);
  const isSaving = usePatientStore((s) => s.isSaving);

  const fileRef = useRef<HTMLInputElement>(null);
  const photoPreviewRef = useRef<string | null>(null);

  // Convertit Date → string pour l'input
  const dateToString = (date: Date | undefined): string => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    dateOfBirth: dateToString(patient?.profile.dateOfBirth),
    gender:      patient?.profile.gender      ?? "other",
    bloodGroup:  patient?.profile.bloodGroup  ?? "",
    photo:       patient?.profile.photo       ?? "",
  });

  const [saved, setSaved] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Nettoie la preview photo quand le composant se démonte
  useEffect(() => {
    return () => {
      if (photoPreviewRef.current) {
        URL.revokeObjectURL(photoPreviewRef.current);
      }
    };
  }, []);

  const handleChange = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Nettoie l'ancienne preview avant d'en créer une nouvelle
    if (photoPreviewRef.current) {
      URL.revokeObjectURL(photoPreviewRef.current);
      photoPreviewRef.current = null;
    }

    const previewUrl = URL.createObjectURL(file);
    photoPreviewRef.current = previewUrl;
    setPhotoPreview(previewUrl);
    await uploadPhoto(file);
  };

  const handleSave = async () => {
    // Construction de l'objet update avec les bonnes conversions
    const updateData: Partial<PatientProfile> = {};
    
    // Convertir la string en Date pour l'API
    if (form.dateOfBirth) {
      updateData.dateOfBirth = new Date(form.dateOfBirth);
    }
    
    if (form.gender && form.gender !== patient?.profile.gender) {
      updateData.gender = form.gender as "male" | "female" | "other";
    }
    
    if (form.bloodGroup && form.bloodGroup !== patient?.profile.bloodGroup) {
      updateData.bloodGroup = form.bloodGroup as PatientProfile["bloodGroup"];
    }
    
    if (form.photo && form.photo !== patient?.profile.photo) {
      updateData.photo = form.photo;
    }

    // Seulement appeler l'API s'il y a des changements
    if (Object.keys(updateData).length > 0) {
      await updateProfile(updateData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const photo    = photoPreview ?? patient?.profile?.photo;
  const initials = `${patient?.profile.firstName?.[0] ?? ""}${patient?.profile.lastName?.[0] ?? ""}`;

  const BLOOD_GROUPS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

  return (
    <div className="flex flex-col gap-6">

      {/* ── Photo de profil ── */}
      <div className="flex items-center gap-5 p-5 bg-linear-to-r from-[#1e3a8a]/5 to-blue-50 rounded-2xl border border-blue-100">
        <div className="relative shrink-0">
          {photo ? (
            <img src={photo} alt="Photo" className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-[#1e3a8a] to-blue-400 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {initials || <User size={28} />}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#1e3a8a] text-white rounded-lg flex items-center justify-center shadow hover:bg-blue-800 transition-colors"
          >
            <Camera size={13} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">
            {patient?.profile.firstName} {patient?.profile.lastName}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Patient · {patient?.location?.city ?? "—"}</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-2 text-xs text-[#1e3a8a] font-medium hover:underline"
          >
            Changer la photo
          </button>
        </div>
      </div>

      {/* ── Infos personnelles ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel icon={<User size={14} />} label="Informations personnelles" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Date de naissance */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Date de naissance</label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 text-slate-800 placeholder:text-slate-400 transition-all"
            />
          </div>

          {/* Genre */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Genre</label>
            <div className="flex gap-2">
              {[{ v: "male", l: "Homme" }, { v: "female", l: "Femme" }, { v: "other", l: "Autre" }].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => handleChange("gender", v)}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-colors ${
                    form.gender === v
                      ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Groupe sanguin */}
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Groupe sanguin</label>
            <div className="flex flex-wrap gap-1.5">
              {BLOOD_GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => handleChange("bloodGroup", form.bloodGroup === g ? "" : g)}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    form.bloodGroup === g
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-red-200 hover:text-red-500"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bouton save ── */}
      <SaveButton onSave={handleSave} isSaving={isSaving} saved={saved} />
    </div>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────

export function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
      <span className="text-[#1e3a8a]">{icon}</span>
      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function SaveButton({
  onSave, isSaving, saved,
}: {
  onSave: () => void; isSaving: boolean; saved: boolean;
}) {
  return (
    <div className="flex justify-end pt-2">
      <button
        onClick={onSave}
        disabled={isSaving}
        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${
          saved
            ? "bg-emerald-500 text-white"
            : "bg-[#1e3a8a] text-white hover:bg-blue-800 disabled:opacity-60"
        }`}
      >
        {isSaving ? (
          <><Loader2 size={14} className="animate-spin" /> Enregistrement...</>
        ) : saved ? (
          "✓ Enregistré !"
        ) : (
          <><Save size={14} /> Enregistrer</>
        )}
      </button>
    </div>
  );
}