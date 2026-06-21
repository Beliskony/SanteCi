"use client";

import { useEffect, useMemo } from "react";
import { usePatientStore } from "@/app/frontend/store/patientStore";
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore";

import { DossierHeader } from "./DossierHeader";
import { VitalesCard } from "./VitalesCard";
import { AllergiesCard } from "./AllergiesCard";
import { ContactsUrgenceCard } from "./ContactsUrgenceCard";
import { AntecedentsCard } from "./AntecedenCard";
import { TraitementsCard } from "./TraitementsCard";
import { DocumentsCard } from "./DocumentsCard";

export default function DossierPage() {
  //  FIX #1 — Sélecteurs atomiques au lieu de usePatientStore() entier
  const fetchHealth        = usePatientStore((s) => s.fetchHealth);
  const fetchPrescriptions = usePatientStore((s) => s.fetchPrescriptions);

  //  FIX #1 — Sélecteurs atomiques depuis useAuthStore
  const user = useAuthStore((s) => s.user);

  const patient = useMemo(
    () => (user && isPatient(user) ? user : null),
    [user]
  );

  //  FIX #2 — patientId correctement extrait, stable (string primitive)
  const patientId = useMemo(() => {
    if (!patient) return null;
    const raw = patient._id;
    return typeof raw === "string" ? raw : raw;
  }, [patient]);

  const profile = patient?.profile ?? null;
  const health  = patient?.health  ?? null;

  //  FIX #2 + #3 — fetchPrescriptions appelé avec le bon patientId
  // fetchPrescriptions est une ref stable Zustand → safe comme dépendance
  useEffect(() => {
    if (!patientId) return;
    fetchHealth();
    fetchPrescriptions(patientId, 1, 10);
  }, [patientId, fetchHealth, fetchPrescriptions]);

  const patientName = patient
    ? `${patient.profile.firstName} ${patient.profile.lastName}`
    : "Patient";

  const lastUpdated = patient?.metadata?.updatedAt
    ? new Date(patient.metadata.updatedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const handleRenewPrescription = async (
    appointmentId: string,
    reason: string,
    priority: "normal" | "urgent"
  ) => {
    console.log("Renouvellement:", { appointmentId, reason, priority });
  };

  const handleDownloadDocument = async (appointment: any) => {
    console.log("Télécharger document:", appointment);
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">

      <DossierHeader
        patientName={patientName}
        lastUpdated={lastUpdated}
        onExport={() => console.log("export PDF")}
        onShare={() => console.log("partager")}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3.5">
        <div className="flex flex-col gap-3.5">
          <VitalesCard profile={profile} health={health} />
          <AllergiesCard health={health} />
          <ContactsUrgenceCard onCall={(phone) => console.log("Appel", phone)} />
        </div>

        <div className="flex flex-col gap-3.5">
          <AntecedentsCard health={health} />
          <TraitementsCard onRenew={handleRenewPrescription} />
          <DocumentsCard
            onDownload={handleDownloadDocument}
            onViewAll={() => console.log("Voir tous les documents")}
          />
        </div>
      </div>
    </main>
  );
}