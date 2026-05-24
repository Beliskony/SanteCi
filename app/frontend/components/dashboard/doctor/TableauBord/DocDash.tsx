"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";
import { useDoctorDashStore }     from "@/app/frontend/store/doctorStore";
import { useAppointmentStore }    from "@/app/frontend/store/appoitmentStore";
import { useNotificationStore }   from "@/app/frontend/store/otherStore";
import { DoctorStatsCards }       from "./DoctorStatsCards";
import { NextConsultations }      from "./NextConsultations";
import { UnreadMessages }         from "./UnreadMessages";

interface DocDashProps {
  onNavigate?: (page: string) => void; // pour changer de section dans DocSideBar
}

export default function DocDash({ onNavigate }: DocDashProps) {

  // ── Sélecteurs atomiques ──────────────────────────────────
  const user      = useAuthStore((s) => s.user);
  const firstName = useAuthStore((s) => s.user && isDoctor(s.user) ? s.user.profile.firstName : "");

  const fetchStats         = useDoctorDashStore((s) => s.fetchStats);
  const fetchList          = useAppointmentStore((s) => s.fetchList);
  const fetchNotifications = useNotificationStore((s) => s.fetchAll);
  const startAppt          = useAppointmentStore((s) => s.start);

  // ── doctorId stable ───────────────────────────────────────
  const doctorId = useMemo(() => {
    if (!user || !isDoctor(user)) return null;
    const raw = user._id;
    return typeof raw === "string" ? raw : raw.toString();
  }, [user]);

  // ── Chargement initial ────────────────────────────────────
  useEffect(() => {
    if (!doctorId) return;
    fetchStats(doctorId);
    fetchList({ doctorId, limit: 10 });
    fetchNotifications();
  }, [doctorId, fetchStats, fetchList, fetchNotifications]);

  // ── Handlers ──────────────────────────────────────────────
  const handleStart = useCallback(async (id: string) => {
    await startAppt(id);
  }, [startAppt]);

  const handleViewDossier = useCallback((id: string) => {
    // Navigation vers le dossier du patient lié à ce rdv
    console.log("Voir dossier:", id);
  }, []);

  const handleOpenSlots = useCallback(() => {
    onNavigate?.("agenda");
  }, [onNavigate]);

  const handleViewAgenda = useCallback(() => {
    onNavigate?.("agenda");
  }, [onNavigate]);

  const handleViewMessages = useCallback(() => {
    onNavigate?.("messagerie");
  }, [onNavigate]);

  const handleOpenMessage = useCallback((id: string) => {
    onNavigate?.("messagerie");
  }, [onNavigate]);

  // ── Rendu ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* Bonjour */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Bonjour, {firstName ? `Dr ${firstName}` : "Docteur"} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Voici un résumé de votre activité du jour.
          </p>
        </div>

        {/* ── 4 cards stats ── */}
        <DoctorStatsCards onOpenSlots={handleOpenSlots} />

        {/* ── Consultations + Messages ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <NextConsultations
            onViewAgenda={handleViewAgenda}
            onStart={handleStart}
            onViewDossier={handleViewDossier}
          />
          <UnreadMessages
            onViewAll={handleViewMessages}
            onOpenMessage={handleOpenMessage}
          />
        </div>

      </div>
    </div>
  );
}