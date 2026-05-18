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
    <div className="flex items-center gap-0 border-b border-slate-200">
      {TABS.map(({ key, label }) => {
        const isActive = activeTab === key
        const count    = counts?.[key]
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`relative px-5 py-3 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? "text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900 after:rounded-t"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
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