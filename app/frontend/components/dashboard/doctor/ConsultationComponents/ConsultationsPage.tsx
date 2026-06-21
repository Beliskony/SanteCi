"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useAuthStore, isDoctor }  from "@/app/frontend/store/useAuthStore";
import { useAppointmentStore }     from "@/app/frontend/store/appoitmentStore";
import { ConsultationTabs }        from "./ConsultationTabs";
import { ConsultationCard }        from "./ConsultationCard";
import type { ConsultTab }         from "./ConsultationTabs";
import type { Appointment }        from "@/app/frontend/types/Appointment";

// ── Mapping tab → statuts ─────────────────────────────────────────────────────

const TAB_STATUSES: Record<ConsultTab, string[]> = {
  today:     ["pending", "confirmed", "ongoing"],
  pending:   ["pending"],
  confirmed: ["confirmed", "ongoing"],
  completed: ["completed"],
  cancelled: ["cancelled", "no_show"],
};

// ── Helper : filtre du jour ───────────────────────────────────────────────────

function isToday(dateStr: string | Date): boolean {
  const d   = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate()     === now.getDate()     &&
    d.getMonth()    === now.getMonth()    &&
    d.getFullYear() === now.getFullYear()
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConsultationsPage() {
  const user      = useAuthStore((s) => s.user);
  const appts     = useAppointmentStore((s) => s.appointments);
  const isLoading = useAppointmentStore((s) => s.isLoading);
  const fetchList = useAppointmentStore((s) => s.fetchList);

  const [activeTab,    setActiveTab]    = useState<ConsultTab>("today");
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  // doctorId stable
  const doctorId = useMemo(() => {
    if (!user || !isDoctor(user)) return null;
    const raw = user._id;
    return typeof raw === "string" ? raw : raw;
  }, [user]);

  // Charger les RDV au montage
  useEffect(() => {
    if (!doctorId) return;
    fetchList({ doctorId, limit: 100 });
  }, [doctorId, fetchList]);

  // Auto-expand le premier RDV ongoing/confirmed du jour
  useEffect(() => {
    if (expandedId) return;
    const first = appts.find(
      (a) =>
        ["ongoing", "confirmed"].includes(a.status.current) &&
        isToday(a.details.scheduledFor)
    );
    if (first) setExpandedId(first._id);
  }, [appts, expandedId]);

  // Filtrer selon l'onglet actif
  const filtered = useMemo((): Appointment[] => {
    const statuses = TAB_STATUSES[activeTab];
    return appts
      .filter((a) => {
        const statusOk = statuses.includes(a.status.current);
        if (activeTab === "today") {
          return statusOk && isToday(a.details.scheduledFor);
        }
        return statusOk;
      })
      .sort((a, b) =>
        new Date(a.details.scheduledFor).getTime() -
        new Date(b.details.scheduledFor).getTime()
      );
  }, [appts, activeTab]);

  // Handlers
  const handleTabChange = useCallback((tab: ConsultTab) => {
    setActiveTab(tab);
    setExpandedId(null);
  }, []);

  const handleViewDetail = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleMarkAbsent = useCallback((_id: string) => {
    // Le markNoShow est appelé dans ConsultationCard directement
    setExpandedId(null);
  }, []);

  const handleMessage = useCallback((patientId: string) => {
    console.log("Message →", patientId);
    // TODO : ouvrir MessagerieLayout avec ce patient
  }, []);

  const handleDossier = useCallback((patientId: string) => {
    console.log("Dossier →", patientId);
    // TODO : ouvrir dossier patient
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* ── En-tête ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Toutes les consultations</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Suivez l&apos;état de vos rendez-vous et accédez rapidement aux dossiers patients.
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#1e3a8a] text-white text-sm font-bold rounded-xl hover:bg-blue-800 transition-colors shrink-0 shadow-sm">
            <Plus size={15} />
            Ouvrir des créneaux
          </button>
        </div>

        {/* ── Onglets ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 pt-2">
            <ConsultationTabs
              active={activeTab}
              onChange={handleTabChange}
              total={filtered.length}
            />
          </div>

          {/* ── Liste ── */}
          <div className="p-4 flex flex-col gap-3">
            {isLoading && appts.length === 0 ? (
              /* Skeletons */
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-3 bg-slate-200 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-14 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Plus size={20} className="text-slate-400" />
                </div>
                <p className="text-sm text-slate-400">
                  Aucune consultation {activeTab === "today" ? "aujourd'hui" : "dans cette catégorie"}
                </p>
              </div>
            ) : (
              filtered.map((appt) => (
                <ConsultationCard
                  key={appt._id}
                  appointment={appt}
                  isExpanded={expandedId === appt._id}
                  onViewDetail={handleViewDetail}
                  onMarkAbsent={handleMarkAbsent}
                  onMessage={handleMessage}
                  onDossier={handleDossier}
                />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}