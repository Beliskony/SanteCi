import BookingCard from "@/app/frontend/components/doctorPage/singlePage/BookingCard"
import ConsultationTarifs from "@/app/frontend/components/doctorPage/singlePage/ConsultationTarifs"
import DoctorProfileHeader from "@/app/frontend/components/doctorPage/singlePage/DoctorProfileHeader"
import FormationsDiplomes from "@/app/frontend/components/doctorPage/singlePage/FormationsDiplomes"
import { doctorService } from "@/app/frontend/services/doctorService"
import type { DoctorUser } from "@/app/frontend/store/useAuthStore"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function page({ params }: PageProps) {
  const { id } = await params
  const doctor = await doctorService.getById(id) as DoctorUser

  if (!doctor) {
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

          {/* ── Colonne gauche 2/3 ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <DoctorProfileHeader doctor={doctor} />
            <ConsultationTarifs
              telemedicine={doctor.telemedicine}
              location={doctor.location}
            />
            <FormationsDiplomes professional={doctor.professional} />
          </div>

          {/* ── Colonne droite sticky 1/3 ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <BookingCard
                telemedicine={doctor.telemedicine}
                location={doctor.location}
                doctorId={doctor.doctorId}
              />
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}