"use client";

import { Plus } from "lucide-react";

const LEGEND_ITEMS = [
  { color: "bg-[#1e3a8a]",   label: "Consultation Vidéo"    },
  { color: "bg-emerald-500", label: "Consultation Cabinet"  },
  { color: "bg-slate-200",   label: "Créneau Libre"         },
  { color: "bg-amber-400",   label: "Urgence / Bloqué"      },
];

interface AgendaLegendProps {
  onAddUnavailability: () => void;
}

export function AgendaLegend({ onAddUnavailability }: AgendaLegendProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-4">

      {/* Titre */}
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Légende</p>

      {/* Items */}
      <div className="flex flex-col gap-2">
        {LEGEND_ITEMS.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
            <span className="text-xs text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Bouton */}
      <button
        onClick={onAddUnavailability}
        className="flex items-center justify-center w-full p-2.5 bg-[#1e3a8a] text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors mt-1"
      >
        Ajouter une indisponibilité
      </button>
    </div>
  );
}