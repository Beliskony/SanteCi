"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore"
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore"
import AppointmentTabs, { type TabKey, TAB_STATUSES } from "./AppointmentTabs"
import AppointmentList from "./Appointmentlist"

export default function AppointmentPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming")

  const { user }                                          = useAuthStore()
  const { appointments, isLoading, error, fetchList }     = useAppointmentStore()

  const patientId = user && isPatient(user) ? String(user._id) : undefined

  useEffect(() => {
    if (!patientId) return
    fetchList({ patientId, limit: 50 })
  }, [patientId])

  const filtered = appointments.filter((a) =>
    TAB_STATUSES[activeTab].includes(a.status.current)
  )

  const counts: Partial<Record<TabKey, number>> = {
    upcoming:  appointments.filter((a) => TAB_STATUSES.upcoming.includes(a.status.current)).length,
    past:      appointments.filter((a) => TAB_STATUSES.past.includes(a.status.current)).length,
    cancelled: appointments.filter((a) => TAB_STATUSES.cancelled.includes(a.status.current)).length,
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">

          {/* Onglets */}
          <div className="flex">
            <AppointmentTabs
              activeTab={activeTab}
              onChange={setActiveTab}
              counts={counts}
            />
          </div>

          <div />
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition-colors shadow-sm">
            <Plus size={15} />
            Nouveau rendez-vous
          </button>
        </div>

        {/* Card conteneur */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">


          {/* Erreur */}
          {error && (
            <div className="mx-5 mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Liste */}
          <div className="p-5">
            <AppointmentList
              appointments={filtered}
              activeTab={activeTab}
              isLoading={isLoading}
            />
          </div>
        </div>

      </div>
    </div>
  )
}