"use client"

import type { Appointment } from "@/app/frontend/types/Appointment"
import type { TabKey } from "./AppointmentTabs"
import AppointmentCardUpcoming from "./AppointmentCardUpcoming"
import AppointmentCardPast from "./AppointmentCardPast"

interface Props {
  appointments: Appointment[]
  activeTab: TabKey
  isLoading: boolean
}

const EMPTY_MESSAGES: Record<TabKey, string> = {
  upcoming:  "Aucun rendez-vous à venir.",
  past:      "Aucune consultation passée.",
  cancelled: "Aucun rendez-vous annulé.",
}

export default function AppointmentList({ appointments, activeTab, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl h-36 animate-pulse" />
        ))}
      </div>
    )
  }

  if (appointments.length === 0) {
    return (
      <div className="py-14 text-center">
        <p className="text-slate-400 text-sm">{EMPTY_MESSAGES[activeTab]}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {appointments.map((appointment) =>
        activeTab === "upcoming" ? (
          <AppointmentCardUpcoming key={appointment._id} appointment={appointment} />
        ) : (
          <AppointmentCardPast key={appointment._id} appointment={appointment} variant={activeTab} />
        )
      )}
    </div>
  )
}