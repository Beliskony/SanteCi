"use client";

import { useEffect, useState } from "react";
import { X, FileText, AlertCircle, Pill, Clock, HeartPulse, Phone } from "lucide-react";
import { doctorService } from "@/app/frontend/services/doctorService";
import type { PatientListItem } from "../../types/PatientList";

interface PatientDossier {
  profile: {
    firstName: string;
    lastName: string;
    photo?: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup?: string;
  };
  contact: {
    phone: string;
    email?: string;
    emergencyContacts: Array<{ name: string; phone: string; relationship: string }>;
  };
  health: {
    allergies: string[];
    chronicDiseases: string[];
    currentMedications: string[];
    disabilities: string[];
    height?: number;
    weight?: number;
    bmi?: number;
  };
  patientSince: string;
  consultations: Array<{
    _id: string;
    date: string;
    type: string;
    reason: string;
    status: string;
    diagnosis?: string;
    notes?: string;
    recommendations: string[];
  }>;
  prescriptions: Array<{
    _id: string;
    prescriptionId: string;
    date: string;
    status: string;
    diagnosis: string;
    validityDays: number;
  }>;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  ongoing: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absence",
};

const TYPE_LABEL: Record<string, string> = {
  video: "Vidéo",
  audio: "Audio",
  chat: "Chat",
  in_person: "Présentiel",
};

interface PatientDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientListItem;
}

export function PatientDossierModal({ isOpen, onClose, patient }: PatientDossierModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dossier, setDossier] = useState<PatientDossier | null>(null);

  useEffect(() => {
    if (!isOpen || !patient._id) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    doctorService
      .getPatientDossier(patient._id)
      .then((data) => {
        if (!cancelled) setDossier(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Impossible de charger le dossier médical");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, patient._id]);
  

  if (!isOpen) return null;

  const patientFullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#1e3a8a]" />
            <div>
              <p className="text-sm font-bold text-slate-900">Dossier médical</p>
              <p className="text-xs text-slate-500">
                {patientFullName} • {patient.age} ans
                {patient.bloodGroup ? ` • ${patient.bloodGroup}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-5 flex flex-col gap-4">

          {isLoading && (
            <div className="space-y-3 animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-200 rounded w-3/4" />
            </div>
          )}

          {!isLoading && error && (
            <p className="text-sm text-red-500 text-center py-6">{error}</p>
          )}

          {!isLoading && !error && dossier && (
            <>
              {/* Contact & urgence */}
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  <Phone size={13} />
                  Contact
                </p>
                <p className="text-sm text-slate-700">{dossier.contact.phone}</p>
                {dossier.contact.email && <p className="text-xs text-slate-500">{dossier.contact.email}</p>}
                {dossier.contact.emergencyContacts.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {dossier.contact.emergencyContacts.map((c, i) => (
                      <p key={i} className="text-xs text-slate-500">
                        Urgence : <span className="font-medium text-slate-700">{c.name}</span> ({c.relationship}) — {c.phone}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Allergies */}
              {dossier.health.allergies.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    <AlertCircle size={13} className="text-red-500" />
                    Allergies
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {dossier.health.allergies.map((a, i) => (
                      <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Antécédents */}
              {dossier.health.chronicDiseases.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    <HeartPulse size={13} />
                    Antécédents / maladies chroniques
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {dossier.health.chronicDiseases.map((c, i) => (
                      <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Traitements en cours */}
              {dossier.health.currentMedications.length > 0 && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    <Pill size={13} className="text-emerald-600" />
                    Traitements en cours
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {dossier.health.currentMedications.map((m, i) => (
                      <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mesures (taille/poids/IMC) */}
              {(dossier.health.height || dossier.health.weight || dossier.health.bmi) && (
                <div className="flex gap-4 text-xs text-slate-600">
                  {dossier.health.height && <span>Taille : <b>{dossier.health.height} cm</b></span>}
                  {dossier.health.weight && <span>Poids : <b>{dossier.health.weight} kg</b></span>}
                  {dossier.health.bmi && <span>IMC : <b>{dossier.health.bmi}</b></span>}
                </div>
              )}

              {/* Historique consultations */}
              <div className="border-t border-slate-100 pt-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  <Clock size={13} />
                  Historique des consultations ({dossier.consultations.length})
                </p>
                {dossier.consultations.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {dossier.consultations.map((c) => (
                      <div key={c._id} className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-800">
                            {c.diagnosis || c.reason} <span className="text-[10px] font-normal text-slate-400">• {TYPE_LABEL[c.type] ?? c.type}</span>
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(c.date).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{STATUS_LABEL[c.status] ?? c.status}</p>
                        {c.notes && <p className="text-xs text-slate-500 mt-1">Notes : {c.notes}</p>}
                        {c.recommendations.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            Recommandations : {c.recommendations.join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Aucune consultation enregistrée</p>
                )}
              </div>

              {/* Ordonnances */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Ordonnances ({dossier.prescriptions.length})
                </p>
                {dossier.prescriptions.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {dossier.prescriptions.map((p) => (
                      <div key={p._id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{p.diagnosis || p.prescriptionId}</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(p.date).toLocaleDateString("fr-FR")} • {p.status}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400">{p.validityDays}j</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Aucune ordonnance émise</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}