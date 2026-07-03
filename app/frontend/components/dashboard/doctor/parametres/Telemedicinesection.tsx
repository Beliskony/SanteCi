"use client";

import { useState, useEffect } from "react";
import { Video, MessageSquare, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { useDoctorDashStore, useDoctorTelemedicine } from "@/app/frontend/store/doctorStore";
import type { DoctorTelemedicine } from "@/app/frontend/store/useAuthStore";

const TYPES = [
  { key: "video", label: "Consultation vidéo",  icon: Video,         sub: "durée moyenne 30 min"    },
  { key: "audio", label: "Consultation audio",  icon: Video,         sub: "appel vocal uniquement"  },
  { key: "chat",  label: "Consultation chat",   icon: MessageSquare, sub: "réponse sous 1h"         },
] as const;

type ConsultType = "video" | "audio" | "chat";

export function TelemedicineSection() {
  const tele               = useDoctorTelemedicine();
  const updateTelemedicine = useDoctorDashStore((s) => s.updateTelemedicine);
  const isSaving           = useDoctorDashStore((s) => s.isSaving);

  const [saved, setSaved]     = useState(false);
  const [available, setAvailable] = useState(tele?.isAvailable ?? true);
  const [types, setTypes]     = useState<ConsultType[]>(
    (tele?.consultationTypes as ConsultType[]) ?? ["video", "audio", "chat"]
  );
  const [fees, setFees] = useState({
    video: tele?.consultationFees?.video ?? 0,
    audio: tele?.consultationFees?.audio ?? 0,
    chat:  tele?.consultationFees?.chat  ?? 0,
  });

  // Resync quand le store se charge après le mount
  useEffect(() => {
    if (!tele) return;
    setAvailable(tele.isAvailable ?? true);
    setTypes((tele.consultationTypes as ConsultType[]) ?? ["video", "audio", "chat"]);
    setFees({
      video: tele.consultationFees?.video ?? 0,
      audio: tele.consultationFees?.audio ?? 0,
      chat:  tele.consultationFees?.chat  ?? 0,
    });
  }, [tele]);

  const toggleType = (t: ConsultType) =>
    setTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const handleSave = async () => {
     try {
       await updateTelemedicine({
         isAvailable: available,
         consultationTypes: types,
         consultationFees: {
           video: Number(fees.video),
           audio: Number(fees.audio),
           chat:  Number(fees.chat),
         },
       } as Partial<DoctorTelemedicine>);
       setSaved(true);
       setTimeout(() => setSaved(false), 2500);
     } catch (e) {
       console.error("Échec updateTelemedicine:", e);
     }
   };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Téléconsultation &amp; tarifs</h2>
          <p className="text-xs text-slate-400 mt-0.5">Activez les types de consultation et définissez vos tarifs.</p>
        </div>
        <button onClick={() => setAvailable(!available)} className="flex items-center gap-2">
          {available
            ? <ToggleRight size={28} className="text-emerald-500" />
            : <ToggleLeft  size={28} className="text-slate-300"  />}
          <span className={`text-xs font-semibold ${available ? "text-emerald-600" : "text-slate-400"}`}>
            {available ? "Disponible" : "Indisponible"}
          </span>
        </button>
      </div>

      <div className="flex flex-col divide-y divide-slate-100">
        {TYPES.map(({ key, label, icon: Icon, sub }) => {
          const active = types.includes(key);
          return (
            <div key={key} className="flex items-center gap-4 py-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-[#1e3a8a]/10" : "bg-slate-100"}`}>
                <Icon size={16} className={active ? "text-[#1e3a8a]" : "text-slate-400"} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${active ? "text-slate-900" : "text-slate-400"}`}>{label}</p>
                <p className="text-xs text-slate-400">{active ? `Active • ${sub}` : "Désactivée"}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={fees[key]}
                  disabled={!active}
                  onChange={(e) => setFees({ ...fees, [key]: parseInt(e.target.value) || 0 })}
                  className="w-24 text-right text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none disabled:opacity-40"
                />
                <span className="text-xs text-slate-400">FCFA</span>
              </div>
              <button onClick={() => toggleType(key)}>
                {active
                  ? <ToggleRight size={22} className="text-emerald-500" />
                  : <ToggleLeft  size={22} className="text-slate-300"  />}
              </button>
            </div>
          );
        })}
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