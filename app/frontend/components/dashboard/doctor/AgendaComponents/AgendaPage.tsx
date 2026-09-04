"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";
import { useAppointmentStore }    from "@/app/frontend/store/appoitmentStore";
import { useSocketStore }         from "@/app/frontend/store/soketStore";
import { AgendaCalendar }         from "./AgendaCalendar";
import { AgendaLegend }           from "./AgendaLegend";
import { AgendaTimeline }         from "./AgendaTimeline";
import type { Appointment }  from "@/app/frontend/types/Appointment";
import { isPopulatedPatient } from "@/app/frontend/types/Appointment";
import { OpenSlotsModal } from "../../../modals/OpenSlotsModal";
import { AgendaMonthView } from "./AgendaMonthView";
import { AgendaWeekView } from "./AgendaWeekView";

// ── Types ─────────────────────────────────────────────────────────────────────

type ViewMode = "Jour" | "Semaine" | "Mois";

const MONTHS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

const DAYS_FR  = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

//  Options de filtre de statut
const STATUS_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmé" },
  { value: "ongoing", label: "En cours" },
  { value: "completed", label: "Terminé" },
  { value: "cancelled", label: "Annulé" },
  { value: "no_show", label: "Absent" },
  { value: "missed_review", label: "À examiner" }, // ← ajouté
];

// ── Page principale ───────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode,     setViewMode]     = useState<ViewMode>("Jour");
  const [activeAppt,   setActiveAppt]   = useState<Appointment | null>(null);
  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);
  const [isStarting,   setIsStarting]   = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResolving,  setIsResolving]  = useState(false); // ← ajouté
  const [statusFilter, setStatusFilter] = useState<string>("all"); //  Filtre de statut

  // Sélecteurs atomiques
  const user         = useAuthStore((s) => s.user);
  const appointments = useAppointmentStore((s) => s.appointments);
  const isLoading    = useAppointmentStore((s) => s.isLoading);
  const fetchList    = useAppointmentStore((s) => s.fetchList);
  const fetchAgenda  = useAppointmentStore((s) => s.fetchAgenda);
  const startAppointment  = useAppointmentStore((s) => s.start);
  const cancelAppointment = useAppointmentStore((s) => s.cancel);
  const resolveMissed     = useAppointmentStore((s) => s.resolveMissed); // ← ajouté

  const doctorId = useMemo(() => {
    if (!user || !isDoctor(user)) return null;
    const raw = user._id;
    return typeof raw === "string" ? raw : raw;
  }, [user]);

  // Charger les RDV du jour sélectionné
  useEffect(() => {
    if (!doctorId) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    fetchAgenda(doctorId, dateStr);
  }, [doctorId, selectedDate, fetchAgenda]);

  // Au montage : charger tous les RDV du mois pour le mini-calendrier
  useEffect(() => {
    if (!doctorId) return;
    fetchList({ doctorId, limit: 100 });
  }, [doctorId, fetchList]);

  //  Filtrer les rendez-vous par statut
  const filteredAppointments = useMemo(() => {
    if (statusFilter === "all") return appointments;
    return appointments.filter(a => a.status.current === statusFilter);
  }, [appointments, statusFilter]);

  // Label de la date affichée
  const dateLabel = useMemo(() => {
    const day   = DAYS_FR[selectedDate.getDay()];
    const d     = selectedDate.getDate();
    const month = MONTHS_FR[selectedDate.getMonth()];
    const isToday = new Date().toDateString() === selectedDate.toDateString();
    return isToday
      ? `Aujourd'hui, ${d} ${month}`
      : `${day} ${d} ${month}`;
  }, [selectedDate]);

  // Compter les RDV passés du jour (avec filtre)
  const prevApptCount = useMemo(() => {
    const now = new Date();
    return filteredAppointments.filter((a) => {
      const dt = new Date(a.details.scheduledFor);
      return dt.toDateString() === selectedDate.toDateString() && dt < now;
    }).length;
  }, [filteredAppointments, selectedDate]);

  const goToPrev = useCallback(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  }, [selectedDate]);

  const goToNext = useCallback(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  }, [selectedDate]);

  const handleAddUnavailability = () => {
    setIsSlotsModalOpen(true);
  };

  // ── Démarrer la consultation ────────────────────────────────────────────
  const handleStartConsultation = async () => {
    if (!activeAppt) return;
    setIsStarting(true);
    try {
      await startAppointment(activeAppt._id);

      if (
        (activeAppt.details.type === "video" || activeAppt.details.type === "audio") &&
        doctorId
      ) {
        const patient    = isPopulatedPatient(activeAppt.patientId) ? activeAppt.patientId : null;
        const receiverId = patient ? String(patient._id) : String(activeAppt.patientId);

        useSocketStore.getState().initiateCall({
          callerId:      doctorId,
          callerType:    "doctor",
          receiverId,
          appointmentId: activeAppt._id,
          callType:      activeAppt.details.type,
        });
      }

      setActiveAppt(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Impossible de démarrer la consultation.");
    } finally {
      setIsStarting(false);
    }
  };

  // ── Annuler le RDV ──────────────────────────────────────────────────────
  const handleCancelAppointment = async () => {
    if (!activeAppt) return;
    const reason = window.prompt("Motif de l'annulation :");
    if (reason === null) return;

    setIsCancelling(true);
    try {
      await cancelAppointment(activeAppt._id, "doctor", reason.trim() || "Annulé par le médecin");
      setActiveAppt(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Impossible d'annuler le rendez-vous.");
    } finally {
      setIsCancelling(false);
    }
  };

  // ── Résoudre un RDV payé et manqué ──────────────────────────────────────
  const handleResolveMissed = async (
    decision: "refund" | "keep_payment" | "reschedule_credit"
  ) => {
    if (!activeAppt) return;
    setIsResolving(true);
    try {
      await resolveMissed(activeAppt._id, decision);
      setActiveAppt(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Impossible de résoudre ce rendez-vous.");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-0)] bg-[#f4f6fb] overflow-hidden gap-x-4 py-3.5">

      {/* Overlay — mobile uniquement, quand le drawer calendrier est ouvert */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Colonne gauche ── */}
      <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 w-72 shrink-0 flex flex-col gap-4 p-4
          overflow-y-auto border-r border-slate-200 bg-white
          transform transition-transform duration-300 ease-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        `}
      >
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden self-end p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
        >
          <X size={16} />
        </button>

        <AgendaCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          appointments={appointments} //  Passer les appointments pour les points
        />
        <AgendaLegend onAddUnavailability={handleAddUnavailability} />
      </aside>

      {/* ── Colonne droite ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 lg:ml-4">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-4 bg-white border-b border-slate-200 shrink-0">

           {/* Date + navigation + toggle calendrier mobile */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Ouvrir le calendrier"
            >
              <CalendarDays size={18} />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrev}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToNext}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">{dateLabel}</h2>
              {prevApptCount > 0 && (
                <span className="hidden sm:inline text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                  {prevApptCount} RDV précédents
                </span>
              )}
            </div>
          </div>

         {/* Filtre + sélecteur de vue */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none text-xs font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
              {(["Jour", "Semaine", "Mois"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    viewMode === mode
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>


        {/* ── Timeline ── */}
        <div className="flex-1 overflow-hidden px-2 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400">Chargement de l&apos;agenda...</p>
              </div>
            </div>
          ) : viewMode === "Jour" ? (
            <AgendaTimeline
              selectedDate={selectedDate}
              appointments={filteredAppointments} //  Filtré
              onClickAppt={setActiveAppt}
              onClickSlot={handleAddUnavailability}
            />
          ) : viewMode === "Semaine" ? (
            <AgendaWeekView
              selectedDate={selectedDate}
              appointments={filteredAppointments} //  Filtré
              onClickAppt={setActiveAppt}
              onSelectDay={(date) => { setSelectedDate(date); setViewMode("Jour"); }}
              statusFilter={statusFilter === "all" ? null : statusFilter}
            />
          ) : (
            <AgendaMonthView
              selectedDate={selectedDate}
              appointments={filteredAppointments} //  Filtré
              onSelectDay={(date) => { setSelectedDate(date); setViewMode("Jour"); }}
              statusFilter={statusFilter === "all" ? null : statusFilter}
            />
          )}
        </div>
      </div>

      {/* ── Panneau détail RDV ── */}
      {activeAppt && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => setActiveAppt(null)}
          />
          <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-slate-200 z-40 p-5 flex flex-col gap-4 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Détails du RDV</h3>
              <button
                onClick={() => setActiveAppt(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <InfoRow label="Patient" value={
                (() => {
                  const p = isPopulatedPatient(activeAppt.patientId) ? activeAppt.patientId : null;
                  return p ? `${p.profile.firstName} ${p.profile.lastName}` : "—";
                })()
              } />
              <InfoRow label="Type" value={activeAppt.details.type} />
              <InfoRow label="Motif" value={activeAppt.details.reason || "—"} />
              <InfoRow label="Durée" value={`${activeAppt.details.duration} min`} />
              <InfoRow label="Statut" value={activeAppt.status.current} />
            </div>

            {/* ── RDV payé et manqué : décision de résolution ── */}
            {activeAppt.status.current === "missed_review" ? (
              <div className="flex flex-col gap-2 mt-auto">
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2.5">
                  Ce rendez-vous payé n'a pas eu lieu. Choisissez comment le résoudre.
                </p>
                <button
                  onClick={() => handleResolveMissed("refund")}
                  disabled={isResolving}
                  className="w-full py-2.5 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResolving ? "..." : "Rembourser le patient"}
                </button>
                <button
                  onClick={() => handleResolveMissed("reschedule_credit")}
                  disabled={isResolving}
                  className="w-full py-2.5 bg-[#1e3a8a] text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResolving ? "..." : "Offrir un crédit de reprogrammation"}
                </button>
                <button
                  onClick={() => handleResolveMissed("keep_payment")}
                  disabled={isResolving}
                  className="w-full py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResolving ? "..." : "Conserver le paiement"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-auto">
                <button
                  onClick={handleStartConsultation}
                  disabled={isStarting || isCancelling}
                  className="w-full py-2.5 bg-[#1e3a8a] text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStarting ? "Démarrage..." : "Démarrer la consultation"}
                </button>
                <button
                  onClick={handleCancelAppointment}
                  disabled={isStarting || isCancelling}
                  className="w-full py-2.5 border border-red-100 text-red-500 text-xs font-semibold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCancelling ? "Annulation..." : "Annuler le RDV"}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <OpenSlotsModal isOpen={isSlotsModalOpen} onClose={() => setIsSlotsModalOpen(false)} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-800 font-medium capitalize">{value}</span>
    </div>
  );
}