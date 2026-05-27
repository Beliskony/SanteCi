"use client";

export type ConsultTab = "today" | "pending" | "confirmed" | "completed" | "cancelled";

const TABS: { key: ConsultTab; label: string }[] = [
  { key: "today",     label: "Aujourd'hui" },
  { key: "pending",   label: "En attente"  },
  { key: "confirmed", label: "Confirmées"  },
  { key: "completed", label: "Terminées"   },
  { key: "cancelled", label: "Annulées"    },
];

interface ConsultationTabsProps {
  active:   ConsultTab;
  onChange: (tab: ConsultTab) => void;
  total:    number;
}

export function ConsultationTabs({ active, onChange, total }: ConsultationTabsProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200">
      <div className="flex items-center gap-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              active === key
                ? "text-[#1e3a8a] border-[#1e3a8a]"
                : "text-slate-500 border-transparent hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="text-xs text-slate-400 font-medium pr-1">
        {total} consultation{total > 1 ? "s" : ""}
      </span>
    </div>
  );
}