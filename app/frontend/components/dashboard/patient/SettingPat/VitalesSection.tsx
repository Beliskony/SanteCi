"use client";

import { useState } from "react";
import { HeartPulse, Save, Loader2 } from "lucide-react";
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore";
import { usePatientStore } from "@/app/frontend/store/patientStore";
import { SectionLabel, SaveButton } from "./ProfileSection";

export function VitalesSection() {
  const user = useAuthStore((s) => s.user);
  const patient = user && isPatient(user) ? user : null;

  const updateHealth = usePatientStore((s) => s.updateHealth);
  const isSaving = usePatientStore((s) => s.isSaving);

  const [form, setForm] = useState({
    height:        patient?.health.height?.toString()        ?? "",
    weight:        patient?.health.weight?.toString()         ?? "",
    bloodPressure: patient?.health.bloodPressure               ?? "",
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const updateData: { height?: number; weight?: number; bloodPressure?: string } = {};

    const height = form.height ? Number(form.height) : undefined;
    const weight = form.weight ? Number(form.weight) : undefined;

    if (height !== undefined && height !== patient?.health.height) {
      updateData.height = height;
    }
    if (weight !== undefined && weight !== patient?.health.weight) {
      updateData.weight = weight;
    }
    if (form.bloodPressure && form.bloodPressure !== patient?.health.bloodPressure) {
      updateData.bloodPressure = form.bloodPressure;
    }

    if (Object.keys(updateData).length > 0) {
      await updateHealth(updateData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <SectionLabel icon={<HeartPulse size={14} />} label="Constantes vitales" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Taille */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
            Taille (cm)
          </label>
          <input
            type="number"
            min={0}
            value={form.height}
            onChange={(e) => handleChange("height", e.target.value)}
            placeholder="ex: 175"
            className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 text-slate-800 placeholder:text-slate-400 transition-all"
          />
        </div>

        {/* Poids */}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
            Poids (kg)
          </label>
          <input
            type="number"
            min={0}
            value={form.weight}
            onChange={(e) => handleChange("weight", e.target.value)}
            placeholder="ex: 70"
            className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 text-slate-800 placeholder:text-slate-400 transition-all"
          />
        </div>

        {/* Tension artérielle */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
            Tension artérielle
          </label>
          <input
            type="text"
            value={form.bloodPressure}
            onChange={(e) => handleChange("bloodPressure", e.target.value)}
            placeholder="ex: 120/80"
            className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 text-slate-800 placeholder:text-slate-400 transition-all"
          />
        </div>

        {/* IMC — lecture seule, calculé côté serveur après enregistrement */}
        {patient?.health.bmi != null && (
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
              IMC (calculé automatiquement)
            </label>
            <div className="px-3 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500">
              {patient.health.bmi.toFixed(1)}
            </div>
          </div>
        )}
      </div>

      <SaveButton onSave={handleSave} isSaving={isSaving} saved={saved} />
    </div>
  );
}