"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Scale,
  Pill,
  Video,
  Search,
  Bell,
  ChevronRight,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore";
import { useConsultationStore } from "@/app/frontend/store/consultationStore";
import { useDoctorStore } from "@/app/frontend/store/otherStore";


// ─── Composant DoctorInfo ─────────────────────────────────────
// Charge le profil du médecin à partir de son ID (string)
const DoctorInfo = ({ doctorId }: { doctorId: string }) => {
  const { currentDoctor, fetchById } = useDoctorStore();

  useEffect(() => {
    fetchById(doctorId);
  }, [doctorId]);

  // currentDoctor est Partial<DoctorUser> — profile peut être undefined
  const firstName = currentDoctor?.profile?.firstName;
  const lastName  = currentDoctor?.profile?.lastName;
  const title     = currentDoctor?.profile?.title;
  const specialty = currentDoctor?.profile?.specialty;

  return (
    <div>
      <p className="text-xs text-white/60 mb-2">Médecin</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 shrink-0 flex items-center justify-center text-sm font-bold text-white">
          {firstName?.[0] ?? "D"}{lastName?.[0] ?? "r"}
        </div>
        <div>
          <p className="text-sm font-semibold">
            {firstName
              ? `${title ?? ""} ${firstName} ${lastName ?? ""}`.trim()
              : "Chargement..."}
          </p>
          {specialty && (
            <p className="text-xs text-white/60">{specialty}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const PatDash = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { consultations, isLoading, fetchMine, getByStatus, joinRoom } =
    useConsultationStore();

  // ── Charger les consultations au montage ──────────────────
  useEffect(() => {
    fetchMine({ status: "confirmed", limit: 5 });
  }, []);

  // ── Données utilisateur ───────────────────────────────────
  const profile   = user?.profile;
  const firstName = profile?.firstName ?? "—";
  const health    = isPatient(user!) ? user?.health : null;
  const weight    = health?.weight ?? null;
  const height    = health?.height ?? null;
  const bmi       = health?.bmi
    ?? (weight && height
      ? parseFloat((weight / ((height / 100) ** 2)).toFixed(1))
      : null);
  const treatment = health?.currentMedications?.[0] ?? null;

  // ── Prochain rendez-vous confirmé ─────────────────────────
  const confirmed   = getByStatus("confirmed");
  const inProgress  = getByStatus("in_progress");
  const nextAppt    = inProgress[0] ?? confirmed[0] ?? null;

  // ── Format date ───────────────────────────────────────────
  const formatDate = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return isToday
      ? `Aujourd'hui, ${time}`
      : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + `, ${time}`;
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[#f4f6fb]">

      {/* ── Header ── */}
      <header className="flex items-center justify-between bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <h1 className="text-base font-bold text-gray-900">Tableau de bord</h1>
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors">
            <Bell size={20} />
            {consultations.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {profile ? `${profile.firstName} ${profile.lastName}` : "—"}
              </p>
              <p className="text-xs text-gray-400">Patient</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden shrink-0">
              {profile?.photo ? (
                <img src={profile.photo} alt="photo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                  {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Corps ── */}
      <main className="flex flex-col gap-6 p-4 sm:p-6 max-w-5xl w-full mx-auto">

        {/* ── Bienvenue + bouton ── */}
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
            onClick={() => router.push("/dashboard/patient/medecins")}
            className="flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#2d4fa8] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shrink-0"
          >
            <Search size={15} />
            Nouveau rendez-vous
          </button>
        </div>

        {/* ── Card prochain RDV ── */}
        {isLoading ? (
          <div className="bg-[#1e3a8a] rounded-2xl p-8 flex items-center justify-center gap-3 text-white/70">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Chargement des rendez-vous...</span>
          </div>
        ) : nextAppt ? (
          <div className="bg-[#1e3a8a] rounded-2xl p-6 flex flex-col lg:flex-row gap-6 text-white">

            {/* Infos RDV */}
            <div className="flex flex-col gap-4 flex-1">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                  Prochain rendez-vous
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  nextAppt.status === "confirmed"
                    ? "bg-green-400/20 text-green-300"
                    : "bg-blue-400/20 text-blue-200"
                }`}>
                  {nextAppt.status === "confirmed" ? "Confirmé" : "En cours"}
                </span>
              </div>

              {/* Date */}
              <div>
                <p className="text-xs text-white/60 mb-1">Date et heure</p>
                <p className="text-2xl font-bold capitalize">
                  {formatDate(nextAppt.scheduledAt)}
                </p>
              </div>

              {/* Médecin — doctorId seulement, pas de populate */}
              {nextAppt.doctorId && (
                <DoctorInfo doctorId={nextAppt.doctorId} />
              )}
            </div>

            {/* Téléconsultation / Cabinet */}
            <div className="flex flex-col gap-3 lg:w-56">
              <div className="bg-white/10 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {nextAppt.type === "video" ? (
                    <Video size={16} />
                  ) : (
                    <CalendarDays size={16} />
                  )}
                  <span className="text-sm font-semibold">
                    {nextAppt.type === "video"
                      ? "Téléconsultation"
                      : nextAppt.type === "audio"
                      ? "Appel audio"
                      : "Chat médical"}
                  </span>
                </div>
                {nextAppt.type === "video" && (
                  <p className="text-xs text-white/70">
                    Le lien d'appel sera actif 5 min avant.
                  </p>
                )}
              </div>

              {nextAppt.type === "video" && nextAppt.meetingUrl && (
                <button
                  onClick={() => joinRoom(nextAppt._id)}
                  className="w-full bg-white text-[#1e3a8a] hover:bg-blue-50 text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Rejoindre
                  <ChevronRight size={15} />
                </button>
              )}

              <button
                onClick={() => router.push(`/dashboard/patient/rdv/${nextAppt._id}`)}
                className="w-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-2 rounded-xl transition-colors"
              >
                Voir les détails
              </button>
            </div>
          </div>
        ) : (
          /* Aucun RDV */
          <div className="bg-[#1e3a8a] rounded-2xl p-8 flex flex-col items-center gap-3 text-white text-center">
            <CalendarDays size={32} className="text-white/40" />
            <p className="text-sm font-medium text-white/70">
              Aucun rendez-vous à venir
            </p>
            <button
              onClick={() => router.push("/dashboard/patient/medecins")}
              className="flex items-center gap-2 bg-white text-[#1e3a8a] text-sm font-semibold px-5 py-2 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <Search size={14} />
              Prendre un rendez-vous
            </button>
          </div>
        )}

        {/* ── Cards santé ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Tension */}
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

          {/* Poids / IMC */}
          <div className="bg-white rounded-2xl p-5 flex items-center gap-4 border border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Scale size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Poids (IMC)</p>
              <p className="text-base font-bold text-gray-900">
                {weight ? `${weight} kg` : "—"}{" "}
                {bmi && (
                  <span className="text-xs font-normal text-gray-400">({bmi})</span>
                )}
              </p>
            </div>
          </div>

          {/* Traitement */}
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