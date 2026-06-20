// ============================================================
// components/patients/MesPatients.tsx
// Page "Annuaire patient" — dashboard médecin
//
// Anti-fuites mémoire :
//   - AbortController annulé au cleanup de chaque useEffect
//   - Debounce via useRef<setTimeout> + clearTimeout au cleanup
//   - clearError() au démontage
// ============================================================

import React, { useEffect, useRef, useCallback } from "react";
import { Filter, Download } from "lucide-react";

import { usePatientStore, useFilteredPatients } from "@/app/frontend/store/appoitmentStore";
import { useAuthStore, isDoctor }               from "@/app/frontend/store/useAuthStore";
import type { PatientDTO }                      from "@/app/frontend/types/Patient";

import { PatientStatCards }   from "./PatientStatCards";
import { PatientListPanel }   from "./PatientListPanel";
import { PatientDetailPanel } from "./PatientDetailPanel";

const DEBOUNCE_MS = 300;

export const MesPatients: React.FC = () => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const user     = useAuthStore((s) => s.user);
  const doctorId = user && isDoctor(user) ? String(user._id) : null;

  // ── Store ─────────────────────────────────────────────────────────────────
  const {
    summary,
    selectedPatient,
    isLoading,
    isLoadingDetail,
    searchQuery,
    error,
    fetchList,
    fetchById,
    fetchSummary,
    selectPatient,
    setSearchQuery,
    clearError,
  } = usePatientStore();

  const filteredPatients = useFilteredPatients();

  // ── Ref debounce ──────────────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Chargement initial ────────────────────────────────────────────────────
  useEffect(() => {
    if (!doctorId) return;
    const ctrl = new AbortController();
    fetchSummary(doctorId);
    fetchList({ doctorId, limit: 50 });
    return () => ctrl.abort();
  }, [doctorId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup debounce + erreur au démontage ────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      clearError();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recherche (debounced) ─────────────────────────────────────────────────
  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (doctorId) fetchList({ doctorId, search: q || undefined, limit: 50 });
      }, DEBOUNCE_MS);
    },
    [doctorId, fetchList, setSearchQuery]
  );

  // ── Sélection patient ─────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (p: PatientDTO) => {
      selectPatient(p);   // sélection locale immédiate
      fetchById(p._id);   // charge le détail complet
    },
    [selectPatient, fetchById]
  );

  // ── Actions rapides ───────────────────────────────────────────────────────
  // Remplace les console.info par tes navigate() / openModal()

  const handleOpenDossier = useCallback((p: PatientDTO) => {
    // navigate(`/doctor/patients/${p._id}/dossier`);
    console.info("[MesPatients] dossier :", p._id);
  }, []);

  const handleSendMessage = useCallback((p: PatientDTO) => {
    // openMessageModal(p._id);
    console.info("[MesPatients] message :", p._id);
  }, []);

  const handleSchedule = useCallback((p: PatientDTO) => {
    // navigate(`/doctor/agenda/nouveau?patientId=${p._id}`);
    console.info("[MesPatients] revoir :", p._id);
  }, []);

  const handleOrdonnance = useCallback((p: PatientDTO) => {
    // navigate(`/doctor/ordonnances/nouveau?patientId=${p._id}`);
    console.info("[MesPatients] ordonnance :", p._id);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section className="p-6 max-w-6xl mx-auto">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Annuaire patient</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Retrouvez l&apos;historique, les traitements et les prochains rendez-vous de vos patients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors">
            <Filter size={14} aria-hidden /> Filtrer
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">
            <Download size={14} aria-hidden /> Exporter
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between"
        >
          <span>{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700 font-medium text-xs ml-4" aria-label="Fermer">
            ✕
          </button>
        </div>
      )}

      {/* Stats */}
      <PatientStatCards summary={summary} isLoading={isLoading} />

      {/* Grille */}
      <div className="grid grid-cols-[1.1fr_1fr] gap-4">
        <PatientListPanel
          patients={filteredPatients}
          selectedId={selectedPatient?._id ?? null}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearch={handleSearch}
          onSelect={handleSelect}
        />
        <PatientDetailPanel
          patient={selectedPatient}
          isLoading={isLoadingDetail}
          onOpenDossier={handleOpenDossier}
          onSendMessage={handleSendMessage}
          onSchedule={handleSchedule}
          onOrdonnance={handleOrdonnance}
        />
      </div>

    </section>
  );
};

export default MesPatients;