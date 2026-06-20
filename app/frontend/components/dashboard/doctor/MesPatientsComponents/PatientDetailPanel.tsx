// ============================================================
// components/patients/PatientDetailPanel.tsx
// ============================================================

import React from "react";
import { FolderOpen, MessageSquare, CalendarPlus, FileText } from "lucide-react";
import {
  type PatientDTO,
  type PatientChip,
  getAge,
  getInitials,
  buildChips,
  avatarColor,
} from "@/app/frontend/types/Patient";

const CHIP_COLORS: Record<PatientChip["variant"], string> = {
  red:   "bg-red-100   text-red-800",
  blue:  "bg-blue-100  text-blue-800",
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
};

const SkeletonDetail: React.FC = () => (
  <div className="p-5 space-y-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
      <div className="space-y-2">
        <div className="h-4 w-36 bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-200 rounded" />
      </div>
    </div>
    <div className="flex gap-2">
      <div className="h-5 w-24 bg-gray-200 rounded-full" />
      <div className="h-5 w-20 bg-gray-200 rounded-full" />
    </div>
    <div className="h-20 bg-gray-100 rounded-xl" />
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-9 bg-gray-200 rounded-lg" />
      ))}
    </div>
  </div>
);

const EmptyDetail: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full py-16 text-center">
    <FolderOpen className="text-gray-300 mb-3" size={40} aria-hidden />
    <p className="text-sm text-gray-400">Sélectionnez un patient pour voir sa fiche</p>
  </div>
);

interface ActionButtonProps {
  icon:     React.ReactNode;
  label:    string;
  onClick:  () => void;
  primary?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick, primary = false }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
      primary
        ? "bg-blue-600 hover:bg-blue-700 text-white"
        : "border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
    }`}
  >
    {icon}
    {label}
  </button>
);

interface Props {
  patient:       PatientDTO | null;
  isLoading:     boolean;
  onOpenDossier: (p: PatientDTO) => void;
  onSendMessage: (p: PatientDTO) => void;
  onSchedule:    (p: PatientDTO) => void;
  onOrdonnance:  (p: PatientDTO) => void;
}

export const PatientDetailPanel: React.FC<Props> = ({
  patient,
  isLoading,
  onOpenDossier,
  onSendMessage,
  onSchedule,
  onOrdonnance,
}) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
    {isLoading ? (
      <SkeletonDetail />
    ) : !patient ? (
      <EmptyDetail />
    ) : (
      <div className="p-5 flex flex-col gap-4">

        {/* En-tête */}
        <div className="flex items-center gap-3">
          {patient.profile.photo ? (
            <img
              src={patient.profile.photo}
              alt={`${patient.profile.firstName} ${patient.profile.lastName}`}
              className="w-12 h-12 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold shrink-0 ${avatarColor(patient.profile.firstName, patient.profile.lastName)}`}
              aria-hidden
            >
              {getInitials(patient.profile)}
            </div>
          )}
          <div>
            <p className="text-base font-semibold text-gray-900">
              {patient.profile.firstName} {patient.profile.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {getAge(patient.profile.dateOfBirth)} ans
              {patient.profile.bloodGroup && ` • ${patient.profile.bloodGroup}`}
              {" "}• Patient depuis {new Date(patient.metadata.createdAt).getFullYear()}
            </p>
          </div>
        </div>

        {/* Chips */}
        {(() => {
          const chips = buildChips(patient);
          return chips.length > 0 ? (
            <section>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">
                Informations clés
              </p>
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip, i) => (
                  <span key={i} className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${CHIP_COLORS[chip.variant]}`}>
                    {chip.label}
                  </span>
                ))}
              </div>
            </section>
          ) : null;
        })()}

        <hr className="border-gray-100" />

        {/* Dernière consultation */}
        <section>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">
            Dernière consultation
          </p>
          {patient.lastConsultation ? (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-medium text-gray-800 mb-1">
                {patient.lastConsultation.title}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Notes : {patient.lastConsultation.notes}
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Aucune consultation enregistrée</p>
          )}
        </section>

        <hr className="border-gray-100" />

        {/* Stats rapides */}
        <div className="flex gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-900">{patient.metadata.totalConsultations}</p>
            <p className="text-[11px] text-gray-400">Consultations</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{patient.metadata.totalPrescriptions}</p>
            <p className="text-[11px] text-gray-400">Ordonnances</p>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Actions rapides */}
        <section>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">
            Actions rapides
          </p>
          <div className="grid grid-cols-2 gap-2">
            <ActionButton icon={<FolderOpen size={15} aria-hidden />} label="Dossier"     onClick={() => onOpenDossier(patient)} />
            <ActionButton icon={<MessageSquare size={15} aria-hidden />} label="Message"  onClick={() => onSendMessage(patient)} />
            <ActionButton icon={<CalendarPlus size={15} aria-hidden />} label="Revoir"    onClick={() => onSchedule(patient)} />
            <ActionButton icon={<FileText size={15} aria-hidden />}     label="Ordonnance" onClick={() => onOrdonnance(patient)} primary />
          </div>
        </section>

      </div>
    )}
  </div>
);