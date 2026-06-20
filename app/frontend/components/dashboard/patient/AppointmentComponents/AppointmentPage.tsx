"use client"

import { useEffect, useState, useMemo } from "react"
import { Plus } from "lucide-react"
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore"
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore"
import AppointmentTabs, { type TabKey, TAB_STATUSES } from "./AppointmentTabs"
import AppointmentList from "./Appointmentlist"

export default function AppointmentPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming")

  //  FIX #1 — Sélecteurs atomiques
  const user         = useAuthStore((s) => s.user)
  const hasHydrated  = useAuthStore((s) => s._hasHydrated) 
  const appointments = useAppointmentStore((s) => s.appointments)
  const isLoading    = useAppointmentStore((s) => s.isLoading)
  const error        = useAppointmentStore((s) => s.error)
  const fetchList    = useAppointmentStore((s) => s.fetchList)

  //  patientId stable (string primitive)
  const patientId = useMemo(() => {
    if (!hasHydrated) {
      console.log('Store not hydrated yet');
      return undefined;
    }
    
    if (!user || !isPatient(user))  {
      console.warn('User is not a valid patient:', user);
      return undefined;
    }
    
    const raw = user._id

     if (!raw) {
      console.error('user._id is undefined or null:', user);
      return undefined;
    }

    try {
      return typeof raw === "string" ? raw : raw;
    } catch (error) {
      console.error('Error converting _id to string:', error);
      return undefined;
    }
  }, [user]);

  //  FIX #3 — fetchList ajouté dans les dépendances (ref stable Zustand → pas de boucle)
  useEffect(() => {
    if (!patientId) return
    fetchList({ patientId, limit: 50 })
  }, [patientId, fetchList])

  //  FIX #2 — Mémoïsation des calculs sur appointments
  const filtered = useMemo(
    () => appointments.filter((a) => TAB_STATUSES[activeTab].includes(a.status.current)),
    [appointments, activeTab]
  )

  const counts = useMemo<Partial<Record<TabKey, number>>>(
    () => ({
      upcoming:  appointments.filter((a) => TAB_STATUSES.upcoming.includes(a.status.current)).length,
      past:      appointments.filter((a) => TAB_STATUSES.past.includes(a.status.current)).length,
      cancelled: appointments.filter((a) => TAB_STATUSES.cancelled.includes(a.status.current)).length,
    }),
    [appointments]
  )

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