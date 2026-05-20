"use client"

import type { AppointmentStatus } from "@/app/frontend/types/Appointment"

export type TabKey = "upcoming" | "past" | "cancelled"

export const TAB_STATUSES: Record<TabKey, AppointmentStatus[]> = {
  upcoming:  ["pending", "confirmed", "ongoing"],
  past:      ["completed", "no_show"],
  cancelled: ["cancelled"],
}

interface AppointmentTabsProps {
  activeTab: TabKey
  onChange: (tab: TabKey) => void
  counts?: Partial<Record<TabKey, number>>
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming",  label: "À venir" },
  { key: "past",      label: "Passés" },
  { key: "cancelled", label: "Annulés" },
]

export default function AppointmentTabs({ activeTab, onChange, counts }: AppointmentTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-white rounded-lg shadow-sm">
      {TABS.map(({ key, label }) => {
        const isActive = activeTab === key
        const count    = counts?.[key]
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-[#1e3a8a]/20 text-[#1e3a8a]"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                isActive
                  ? "bg-[#1e3a8a]/20 text-[#1e3a8a]"
                  : "bg-slate-100 text-slate-400"
              }`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}