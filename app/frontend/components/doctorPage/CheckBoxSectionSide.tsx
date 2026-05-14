"use client";

import { useState } from "react";
import { Video, Building2, MessageSquare, SlidersHorizontal, X } from "lucide-react";
import { useDoctorStore } from "@/app/frontend/store/otherStore";

const CheckBoxSectionSide = () => {
  const { fetchDoctors } = useDoctorStore();

  // ── Drawer mobile ouvert/fermé ────────────────────────────
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Disponibilité ─────────────────────────────────────────
  const [availability, setAvailability] = useState({
    today: true,
    threeDays: false,
  });

  // ── Type de consultation ──────────────────────────────────
  const [consultationType, setConsultationType] = useState({
    video: true,
    cabinet: true,
    chat: false,
  });

  // ── Tarif ─────────────────────────────────────────────────
  const [maxFee, setMaxFee] = useState(15000);
  const MIN_FEE = 5000;
  const MAX_FEE = 25000;

  // ── Langues ───────────────────────────────────────────────
  const [languages, setLanguages] = useState({
    fr: true,
    en: false,
  });

  // ── Appliquer les filtres ─────────────────────────────────
  const applyFilters = () => {
    const types: ("video" | "audio" | "chat")[] = [];
    if (consultationType.video)   types.push("video");
    if (consultationType.cabinet) types.push("audio");
    if (consultationType.chat)    types.push("chat");

    fetchDoctors({ consultationType: types[0], maxFee });
    setMobileOpen(false);
  };

  const toggle = <T extends Record<string, boolean>>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    key: keyof T
  ) => setter((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Contenu des filtres (partagé desktop + drawer) ────────
  const FiltersContent = () => (
    <div className="flex flex-col gap-6">

      {/* Disponibilité */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-gray-900">Disponibilité</h3>
        <div className="flex flex-col gap-2.5">
          <Checkbox label="Dès aujourd'hui" checked={availability.today}    onChange={() => toggle(setAvailability, "today")} />
          <Checkbox label="Dans les 3 jours" checked={availability.threeDays} onChange={() => toggle(setAvailability, "threeDays")} />
        </div>
      </div>

      <Divider />

      {/* Type de consultation */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-gray-900">Type de consultation</h3>
        <div className="flex flex-col gap-2.5">
          <Checkbox label="Vidéo"       checked={consultationType.video}   onChange={() => toggle(setConsultationType, "video")}   icon={<Video size={14} className="text-gray-500" />} />
          <Checkbox label="En cabinet"  checked={consultationType.cabinet} onChange={() => toggle(setConsultationType, "cabinet")} icon={<Building2 size={14} className="text-gray-500" />} />
          <Checkbox label="Chat médical" checked={consultationType.chat}   onChange={() => toggle(setConsultationType, "chat")}    icon={<MessageSquare size={14} className="text-gray-500" />} />
        </div>
      </div>

      <Divider />

      {/* Tarif maximum */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-gray-900">Tarif maximum</h3>
        <input
          type="range"
          min={MIN_FEE} max={MAX_FEE} step={1000}
          value={maxFee}
          onChange={(e) => setMaxFee(Number(e.target.value))}
          className="w-full accent-[#1e3a8a] cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>5k FCFA</span>
          <span className="text-[#1e3a8a] font-semibold">{(maxFee / 1000).toFixed(0)}k FCFA</span>
          <span>25k FCFA</span>
        </div>
      </div>

      <Divider />

      {/* Langues */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-gray-900">Langues parlées</h3>
        <div className="flex flex-col gap-2.5">
          <Checkbox label="Français" checked={languages.fr} onChange={() => toggle(setLanguages, "fr")} />
          <Checkbox label="Anglais"  checked={languages.en} onChange={() => toggle(setLanguages, "en")} />
        </div>
      </div>

      <Divider />

      {/* Bouton appliquer */}
      <button
        onClick={applyFilters}
        className="w-full bg-[#1e3a8a] hover:bg-[#2d4fa8] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors duration-200"
      >
        Appliquer les filtres
      </button>
    </div>
  );

  return (
    <>
      {/* ── Bouton filtres — mobile uniquement ── */}
      <div className="lg:hidden px-6 py-3 bg-white border-b border-gray-100">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-[#1e3a8a] border border-[#1e3a8a] rounded-lg px-4 py-2"
        >
          <SlidersHorizontal size={15} />
          Filtres
        </button>
      </div>

      {/* ── Drawer mobile ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          {/* Panel */}
          <aside className="relative ml-auto w-4/5 max-w-sm h-full bg-white overflow-y-auto px-5 py-6 flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-gray-900">Filtres</h2>
              <button onClick={() => setMobileOpen(false)}>
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <FiltersContent />
          </aside>
        </div>
      )}

      {/* ── Sidebar desktop ── */}
      <aside className="hidden lg:flex flex-col gap-6 w-64 shrink-0 px-5 bg-white py-6 rounded-xl">
        <FiltersContent />
      </aside>
    </>
  );
};

// ── Composants internes ───────────────────────────────────────

const Checkbox = ({
  label, checked, onChange, icon,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  icon?: React.ReactNode;
}) => (
  <label className="flex items-center gap-2.5 cursor-pointer group">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 accent-[#1e3a8a] shrink-0 cursor-pointer"
    />
    {icon && <span className="shrink-0">{icon}</span>}
    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
  </label>
);

const Divider = () => <div className="h-px w-full bg-gray-100" />;

export default CheckBoxSectionSide;