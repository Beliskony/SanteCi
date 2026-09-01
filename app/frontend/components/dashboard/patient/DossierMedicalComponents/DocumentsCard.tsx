"use client";

import { useState, useMemo } from "react";
import { Folder, Filter, Upload, Eye, X, FileText, Activity, File, FileBadge } from "lucide-react";
import {
  isPopulatedDoctor,
  type Appointment,
} from "@/app/frontend/types/Appointment";
import { FilterDocumentsModal, type DocumentFilters } from "../../../modals/FilterDocumentsModal";
import { UploadDocumentModal } from "../../../modals/UploadDocumentModal";
import type { Prescription } from "@/app/frontend/services/prescriptionService";

interface DocumentsCardProps {
  appointments?: Appointment[];
  prescriptions?: Prescription[];
  isLoading?: boolean;
  onViewAll?: () => void;
}

type DocType = "Ordonnance" | "Analyse" | "Certificat";

type ViewingItem =
  | { kind: "prescription"; data: Prescription }
  | { kind: "appointment"; data: Appointment }
  | null;

function getDocType(a: Appointment): DocType {
  const text = [a.details.reason, a.consultation.diagnosis ?? "", a.consultation.notes ?? ""]
    .join(" ")
    .toLowerCase();
  if (text.includes("bilan") || text.includes("analyse") || text.includes("sanguin"))
    return "Analyse";
  if (text.includes("certificat")) return "Certificat";
  return "Ordonnance";
}

const TYPE_STYLE: Record<DocType, string> = {
  Ordonnance: "bg-amber-50 text-amber-700",
  Analyse:    "bg-green-50 text-green-700",
  Certificat: "bg-gray-100 text-gray-600",
};

function DocIcon({ type }: { type: DocType }) {
  if (type === "Analyse")    return <Activity className="w-3.5 h-3.5 text-green-600" />;
  if (type === "Ordonnance") return <FileText  className="w-3.5 h-3.5 text-gray-400" />;
  return <File className="w-3.5 h-3.5 text-gray-400" />;
}

function formatDate(dateStr: string | Date): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function docLabel(a: Appointment): string {
  const reason = a.details.reason.replace(/\s+/g, "_").slice(0, 30);
  return `Ordonnance_${reason}_${a.appointmentId}.pdf`;
}

function doctorLabel(a: Appointment): string {
  if (isPopulatedDoctor(a.doctorId)) {
    const d = a.doctorId.profile;
    return `${d.title ?? "Dr."} ${d.lastName}`;
  }
  return `Dr. #${String(a.doctorId).slice(-4)}`;
}

//  Le doctorId de la prescription est déjà peuplé par le backend
function prescriptionDoctorLabel(p: Prescription): string {
  if (typeof p.doctorId === "object" && p.doctorId !== null) {
    const d = p.doctorId.profile;
    return `${d.title ?? "Dr."} ${d.firstName, d.lastName}`;
  }
  return `Dr. #${String(p.doctorId).slice(-6)}`;
}

// ─── Contenu du modal — ordonnance ─────────────────────────────────────────

function PrescriptionView({
  prescription: p,
  onClose,
}: {
  prescription: Prescription;
  onClose: () => void;
}) {
  const doctorName = prescriptionDoctorLabel(p);

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="min-w-0">
          <p className="text-xs text-amber-600 font-semibold mb-1">Ordonnance</p>
          <h3 className="text-lg font-bold text-gray-900">Ordonnance du {formatDate(p.date)}</h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{doctorName}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-1">Diagnostic</p>
        <p className="text-sm text-gray-800">{p.diagnosis}</p>
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-2">Médicaments</p>
        <div className="flex flex-col gap-2">
          {p.medications.map((m, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-800">{m.name} — {m.dosage}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {m.frequency} · {m.duration} · {m.quantity} {m.unit}
              </p>
              {m.instructions && (
                <p className="text-xs text-gray-500 mt-0.5">{m.instructions}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {p.testsRequested && p.testsRequested.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Examens demandés</p>
          <div className="flex flex-col gap-2">
            {p.testsRequested.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-800">{t.type}</p>
                {t.laboratory && <p className="text-xs text-gray-500">{t.laboratory}</p>}
                {t.instructions && <p className="text-xs text-gray-500">{t.instructions}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {p.notes && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-700">{p.notes}</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 text-xs text-gray-400 flex-wrap">
        <span>Validité : {p.validityDays} jours</span>
        <span>·</span>
        <span className="capitalize">{p.status}</span>
      </div>
    </div>
  );
}

// ─── Contenu du modal — document de rendez-vous ────────────────────────────

function AppointmentDocView({
  appointment: a,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const type = getDocType(a);

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold mb-1 ${TYPE_STYLE[type].split(" ")[1]}`}>{type}</p>
          <h3 className="text-lg font-bold text-gray-900 wrap-break-words">{a.details.reason}</h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {doctorLabel(a)} · {formatDate(a.details.scheduledFor)}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {a.consultation.diagnosis && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">Diagnostic</p>
          <p className="text-sm text-gray-800">{a.consultation.diagnosis}</p>
        </div>
      )}

      {a.consultation.notes && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">Notes de consultation</p>
          <p className="text-sm text-gray-700">{a.consultation.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ────────────────────────────────────────────────────

export function DocumentsCard({
  appointments = [],
  prescriptions = [],
  isLoading = false,
  onViewAll
}: DocumentsCardProps) {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filters, setFilters] = useState<DocumentFilters>({ types: [] });
  const [viewingItem, setViewingItem] = useState<ViewingItem>(null);

  const appointmentsWithDocs = useMemo(() => {
    return appointments.filter(
      (a) =>
        a.status.current === "completed" &&
        (a.consultation.prescriptionId || a.communication.sharedDocuments.length > 0)
    );
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    let result = appointmentsWithDocs;
    if (filters.types.length > 0) {
      result = result.filter((a) => filters.types.includes(getDocType(a)));
    }
    if (filters.dateFrom) {
      result = result.filter((a) => new Date(a.details.scheduledFor) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      result = result.filter((a) => new Date(a.details.scheduledFor) <= filters.dateTo!);
    }
    if (filters.doctorName) {
      result = result.filter((a) =>
        doctorLabel(a).toLowerCase().includes(filters.doctorName!.toLowerCase())
      );
    }
    return result;
  }, [appointmentsWithDocs, filters]);

  const filteredPrescriptions = useMemo(() => {
    let result = prescriptions;
    if (filters.dateFrom) {
      result = result.filter((p) => new Date(p.date) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      result = result.filter((p) => new Date(p.date) <= filters.dateTo!);
    }
    if (filters.doctorName) {
      result = result.filter((p) =>
        prescriptionDoctorLabel(p).toLowerCase().includes(filters.doctorName!.toLowerCase())
      );
    }
    return result;
  }, [prescriptions, filters]);

  const previewAppointments = filteredAppointments.slice(0, 3);
  const previewPrescriptions = filteredPrescriptions.slice(0, 3);
  const hasDocuments = filteredAppointments.length > 0 || filteredPrescriptions.length > 0;
  const totalDocuments = filteredAppointments.length + filteredPrescriptions.length;

  const handleUpload = async (file: File, type: string, date: Date, notes?: string) => {
    console.log("Upload document:", { file, type, date, notes });
  };

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Folder className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-gray-800 truncate">Documents & Ordonnances</span>
            {prescriptions.length > 0 && (
              <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full shrink-0">
                {prescriptions.length}
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-3 h-3" />
              Filtrer
              {filters.types.length > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center">
                  {filters.types.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-3 h-3" />
              Ajouter
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-xs text-gray-400">Chargement…</p>
        ) : !hasDocuments ? (
          <p className="text-xs text-gray-400">Aucun document disponible</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-140 sm:min-w-0 text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-medium text-gray-400 pb-2 w-[36%]">Nom du document</th>
                  <th className="text-left font-medium text-gray-400 pb-2 w-[16%]">Type</th>
                  <th className="text-left font-medium text-gray-400 pb-2 w-[16%]">Date</th>
                  <th className="text-left font-medium text-gray-400 pb-2 w-[22%]">Médecin</th>
                  <th className="text-left font-medium text-gray-400 pb-2 w-[10%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {previewPrescriptions.map((p) => {
                  const doctorName = prescriptionDoctorLabel(p);
                  return (
                    <tr key={p._id}>
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileBadge className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate text-gray-700 max-w-30">
                            Ordonnance du {formatDate(p.date)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-2">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 whitespace-nowrap">
                          Ordonnance
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-gray-500 whitespace-nowrap">
                        {formatDate(p.date)}
                      </td>
                      <td className="py-2.5 pr-2 text-gray-500 truncate max-w-20">
                        {doctorName}
                      </td>
                      <td className="py-2.5">
                        <button
                          onClick={() => setViewingItem({ kind: "prescription", data: p })}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {previewAppointments.map((a) => {
                  const type = getDocType(a);
                  return (
                    <tr key={a._id}>
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <DocIcon type={type} />
                          <span className="truncate text-gray-700 max-w-30">{docLabel(a)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-2">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${TYPE_STYLE[type]}`}>
                          {type}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-gray-500 whitespace-nowrap">
                        {formatDate(a.details.scheduledFor)}
                      </td>
                      <td className="py-2.5 pr-2 text-gray-500 truncate max-w-20">
                        {doctorLabel(a)}
                      </td>
                      <td className="py-2.5">
                        <button
                          onClick={() => setViewingItem({ kind: "appointment", data: a })}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalDocuments > 6 && (
          <div className="mt-4 text-center border-t border-gray-100 pt-3">
            <button
              onClick={onViewAll}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              Voir tous les documents ({totalDocuments})
            </button>
          </div>
        )}
      </div>

      <FilterDocumentsModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={setFilters}
        currentFilters={filters}
      />

      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />

      {viewingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setViewingItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {viewingItem.kind === "prescription" ? (
              <PrescriptionView
                prescription={viewingItem.data}
                onClose={() => setViewingItem(null)}
              />
            ) : (
              <AppointmentDocView
                appointment={viewingItem.data}
                onClose={() => setViewingItem(null)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}