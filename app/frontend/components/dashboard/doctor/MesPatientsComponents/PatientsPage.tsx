"use client";

import { useEffect, useState } from "react";
import { Filter, Download } from "lucide-react";
import { useDoctorPatientsStore } from "@/app/frontend/store/useDoctorPatientsStore";
import { PatientsStatsCards } from "./PatientStatCards";
import { PatientsListPanel } from "./PatientListPanel";
import { PatientDetailPanel } from "./PatientDetailPanel";
import type { PatientListItem as PatientListItemType } from "../../../../types/PatientList";

export default function PatientsPage() {
  const [selectedPatient, setSelectedPatient] = useState<PatientListItemType | null>(null);

  const patients   = useDoctorPatientsStore((s) => s.patients);
  const isLoading  = useDoctorPatientsStore((s) => s.isLoading);
  const fetchPatients = useDoctorPatientsStore((s) => s.fetchPatients);


  useEffect(() => {
    fetchPatients({ limit: 50 });
  }, [fetchPatients]);

  // Adapter les données backend → format attendu par les composants UI
  const mapped: PatientListItemType[] = patients.map((p) => ({
    _id: p._id,
    firstName: p.profile.firstName,
    lastName:  p.profile.lastName,
    photo:     p.profile.photo,
    age:       p.profile.dateOfBirth
      ? Math.floor((Date.now() - new Date(p.profile.dateOfBirth).getTime()) / 31557600000)
      : 0,
    mainCondition:  p.mainCondition,
    followUpStatus: p.followUpStatus,
    nextAppointment: p.nextAppointment
      ? { date: p.nextAppointment.date, label: p.nextAppointment.label }
      : undefined,
    bloodGroup:   p.profile.bloodGroup,
    patientSince: p.patientSince ? new Date(p.patientSince).getFullYear().toString() : undefined,
    keyInfo:          p.keyInfo || [],
    lastConsultation: p.lastConsultation ?? undefined,
  }));


 return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Annuaire patient</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Retrouvez l&apos;historique, les traitements et les prochains rendez-vous de vos patients.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <Filter size={14} />
              Filtrer
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white text-sm font-bold rounded-xl hover:bg-blue-800 transition-colors">
              <Download size={14} />
              Exporter
            </button>
          </div>
        </div>

        <PatientsStatsCards activePatients={patients.length} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          <PatientsListPanel
            patients={mapped}
            isLoading={isLoading}
            selectedPatientId={selectedPatient?._id ?? null}
            onSelectPatient={setSelectedPatient}
          />
          <PatientDetailPanel patient={selectedPatient} />
        </div>

      </div>
    </div>
  );
}