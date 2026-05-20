"use client";

import { useEffect } from "react";
import { usePatientStore } from "@/app/frontend/store/patientStore";
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore";
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore";

import { DossierHeader } from "./DossierHeader";
import { VitalesCard } from "./VitalesCard";
import { AllergiesCard } from "./AllergiesCard";
import { ContactsUrgenceCard } from "./ContactsUrgenceCard";
import { AntecedentsCard } from "./AntecedenCard";
import { TraitementsCard } from "./TraitementsCard";
import { DocumentsCard } from "./DocumentsCard";

export default function DossierPage() {
  const user = useAuthStore((s) => s.user);
  const patient = user && isPatient(user) ? user : null;
  const profile = patient?.profile ?? null;
  const health = patient?.health ?? null;

  const patientStore = usePatientStore();
  const appointmentStore = useAppointmentStore();

  useEffect(() => {
    patientStore.fetchPrescriptions(1, 10);
    appointmentStore.fetchList({});
  }, []);

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
      {patientStore.error && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
          {patientStore.error}
        </div>
      )}

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