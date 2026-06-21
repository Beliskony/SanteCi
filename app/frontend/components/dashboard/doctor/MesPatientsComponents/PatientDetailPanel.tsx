"use client";

import { PatientQuickActions } from "./PatientQuickActions";
import type { PatientListItem } from "../../../../types/PatientList";

interface PatientDetailPanelProps {
  patient: PatientListItem | null;
  onDossier?:   (id: string) => void;
  onMessage?:   (id: string) => void;
  onRevoir?:    (id: string) => void;
  onOrdonnance?:(id: string) => void;
}

export function PatientDetailPanel({ patient, onDossier, onMessage, onRevoir, onOrdonnance }: PatientDetailPanelProps) {
  if (!patient) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 flex items-center justify-center">
        <p className="text-sm text-slate-400 text-center">
          Sélectionnez un patient pour voir ses détails
        </p>
      </div>
    );
  }

  const initials = `${patient.firstName[0] ?? ""}${patient.lastName[0] ?? ""}`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4">

      {/* Header patient */}
      <div className="flex items-center gap-3">
        {patient.photo ? (
          <img src={patient.photo} alt={patient.firstName} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center text-sm font-bold text-[#1e3a8a]">
            {initials}
          </div>
        )}
        <div>
          <p className="text-base font-bold text-slate-900">{patient.firstName} {patient.lastName}</p>
          <p className="text-xs text-slate-500">
            {patient.age} ans{patient.bloodGroup ? ` • ${patient.bloodGroup}` : ""}{patient.patientSince ? ` • Patient depuis ${patient.patientSince}` : ""}
          </p>
        </div>
      </div>

      {/* Infos clés */}
      {patient.keyInfo && patient.keyInfo.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Informations clés</p>
          <div className="flex flex-wrap gap-1.5">
            {patient.keyInfo.map((info, i) => (
              <span
                key={i}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                  info.toLowerCase().includes("allerg")
                    ? "bg-red-50 text-red-600"
                    : info.toLowerCase().includes("traitement")
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {info}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dernière consultation */}
      {patient.lastConsultation && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Dernière consultation</p>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-sm font-bold text-slate-800">{patient.lastConsultation.title}</p>
            <p className="text-xs text-slate-500 mt-1">
              Notes : {patient.lastConsultation.notes}
            </p>
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Actions rapides</p>
        <PatientQuickActions
          onDossier={() => onDossier?.(patient._id)}
          onMessage={() => onMessage?.(patient._id)}
          onRevoir={() => onRevoir?.(patient._id)}
          onOrdonnance={() => onOrdonnance?.(patient._id)}
        />
      </div>

    </div>
  );
}