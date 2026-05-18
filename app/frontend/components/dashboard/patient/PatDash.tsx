"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Scale,
  Pill,
  Video,
  Search,
  CalendarDays,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore";
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore";
import PatHeader from "@/app/frontend/components/dashboard/patient/PatHeader";
import { isPopulatedDoctor } from "@/app/frontend/types/Appointment";

// ─── PatDash ──────────────────────────────────────────────────

const PatDash = () => {
  const router   = useRouter();
  const { user } = useAuthStore();
  const { appointments, isLoading, fetchList, getByStatus } = useAppointmentStore();

  const patientId = user && isPatient(user) ? String(user._id) : undefined;

  useEffect(() => {
    if (!patientId) return;
    fetchList({ patientId, status: "confirmed", limit: 5 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const profile   = user?.profile;
  const firstName = profile?.firstName ?? "—";
  const health    = user && isPatient(user) ? user.health : null;
  const weight    = health?.weight ?? null;
  const height    = health?.height ?? null;
  const bmi       = health?.bmi
    ?? (weight && height
      ? parseFloat((weight / ((height / 100) ** 2)).toFixed(1))
      : null);
  const treatment = health?.currentMedications?.[0] ?? null;

  // Prochain RDV : ongoing en priorité, sinon confirmed
  const ongoing   = getByStatus("ongoing");
  const confirmed = getByStatus("confirmed");
  const nextAppt  = ongoing[0] ?? confirmed[0] ?? null;

  // Médecin peuplé ou non
  const doctor = nextAppt && isPopulatedDoctor(nextAppt.doctorId)
    ? nextAppt.doctorId
    : null;

  const formatDate = (dateStr: string | Date) => {
    const d   = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate()     === now.getDate() &&
      d.getMonth()    === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return isToday
      ? `Aujourd'hui, ${time}`
      : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + `, ${time}`;
  };

  const typeLabel: Record<string, string> = {
    video:     "Téléconsultation",
    audio:     "Appel audio",
    chat:      "Chat médical",
    in_person: "En cabinet",
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[#f4f6fb]">

      {/* ── Header ── */}
      <PatHeader />

      {/* ── Corps ── */}
      <main className="flex flex-col gap-6 p-4 sm:p-6 max-w-5xl w-full mx-auto">

        {/* Bienvenue */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Bonjour, {firstName} 👋
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Voici un résumé de votre santé et de vos prochains rendez-vous.
            </p>
          </div>
          <button
            onClick={() => router.push("/medecins")}
            className="flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#2d4fa8] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shrink-0"
          >
            <Search size={15} />
            Nouveau rendez-vous
          </button>
        </div>

        {/* Card prochain RDV */}
        {isLoading ? (
          <div className="bg-[#1e3a8a] rounded-2xl p-8 flex items-center justify-center gap-3 text-white/70">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Chargement des rendez-vous...</span>
          </div>
        ) : nextAppt ? (
          <div className="bg-[#1e3a8a] rounded-2xl p-6 flex flex-col lg:flex-row gap-6 text-white">
            <div className="flex flex-col gap-4 flex-1">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                  Prochain rendez-vous
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  nextAppt.status.current === "confirmed"
                    ? "bg-green-400/20 text-green-300"
                    : "bg-blue-400/20 text-blue-200"
                }`}>
                  {nextAppt.status.current === "confirmed" ? "Confirmé" : "En cours"}
                </span>
              </div>

              {/* Date */}
              <div>
                <p className="text-xs text-white/60 mb-1">Date et heure</p>
                <p className="text-2xl font-bold capitalize">
                  {formatDate(nextAppt.details.scheduledFor)}
                </p>
              </div>

              {/* Médecin */}
              {doctor && (
                <div>
                  <p className="text-xs text-white/60 mb-2">Médecin</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 shrink-0 flex items-center justify-center text-sm font-bold text-white">
                      {doctor.profile.firstName?.[0]}{doctor.profile.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {doctor.profile.title ?? "Dr"} {doctor.profile.firstName} {doctor.profile.lastName}
                      </p>
                      {doctor.profile.specialty && (
                        <p className="text-xs text-white/60">{doctor.profile.specialty}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Colonne droite */}
            <div className="flex flex-col gap-3 lg:w-56">
              <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {nextAppt.details.type === "video"
                    ? <Video size={16} />
                    : <CalendarDays size={16} />}
                  <span className="text-sm font-semibold">
                    {typeLabel[nextAppt.details.type]}
                  </span>
                </div>
                {nextAppt.details.type === "video" && (
                  <p className="text-xs text-white/70">
                    Le lien d&apos;appel sera actif 5 min avant.
                  </p>
                )}
              </div>

              <button
                onClick={() => router.push(`/patient/rdv`)}
                className="w-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-2 rounded-xl transition-colors"
              >
                Voir les détails
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#1e3a8a] rounded-2xl p-8 flex flex-col items-center gap-3 text-white text-center">
            <CalendarDays size={32} className="text-white/40" />
            <p className="text-sm font-medium text-white/70">Aucun rendez-vous à venir</p>
            <button
              onClick={() => router.push("/medecins")}
              className="flex items-center gap-2 bg-white text-[#1e3a8a] text-sm font-semibold px-5 py-2 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <Search size={14} />
              Prendre un rendez-vous
            </button>
          </div>
        )}

        {/* Cards santé */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 flex items-center gap-4 border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Activity size={18} className="text-[#1e3a8a]" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Tension artérielle</p>
              <p className="text-base font-bold text-gray-900">
                — <span className="text-xs font-normal text-gray-400">mmHg</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 flex items-center gap-4 border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Scale size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Poids (IMC)</p>
              <p className="text-base font-bold text-gray-900">
                {weight ? `${weight} kg` : "—"}{" "}
                {bmi && <span className="text-xs font-normal text-gray-400">({bmi})</span>}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 flex items-center gap-4 border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center shrink-0">
              <Pill size={18} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Traitement actif</p>
              <p className="text-base font-bold text-gray-900 truncate max-w-30">
                {treatment ?? "Aucun"}
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default PatDash;