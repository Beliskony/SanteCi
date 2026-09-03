'use client';

import { use, useEffect, useState } from "react"
import BookingCard from "@/app/frontend/components/doctorPage/singlePage/BookingCard"
import ConsultationTarifs from "@/app/frontend/components/doctorPage/singlePage/ConsultationTarifs"
import DoctorProfileHeader from "@/app/frontend/components/doctorPage/singlePage/DoctorProfileHeader"
import FormationsDiplomes from "@/app/frontend/components/doctorPage/singlePage/FormationsDiplomes"
import { doctorService } from "@/app/frontend/services/doctorService"
import type { DoctorUser } from "@/app/frontend/store/useAuthStore"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function Page({ params }: PageProps) {
  const { id } = use(params)

  const [doctor, setDoctor] = useState<DoctorUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    doctorService.getById(id)
      .then((data) => {
        if (cancelled) return
        if (!data) setNotFound(true)
        else setDoctor(data as DoctorUser)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500 text-sm">Chargement...</p>
      </div>
    )
  }

  if (notFound || !doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500 text-sm">Médecin introuvable.</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen w-full bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <DoctorProfileHeader doctor={doctor} />
            <ConsultationTarifs
              telemedicine={doctor.telemedicine}
              location={doctor.location}
            />
            <FormationsDiplomes professional={doctor.professional} />
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <BookingCard
                telemedicine={doctor.telemedicine}
                location={doctor.location}
                doctor={doctor}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}