"use client";

import { useState } from "react";
import { Folder, Filter, Upload, Download, FileText, Activity, File } from "lucide-react";
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore";
import {
  isPopulatedDoctor,
  type Appointment,
} from "@/app/frontend/types/Appointment";
import { FilterDocumentsModal, type DocumentFilters } from "../../../modals/FilterDocumentsModal";
import { UploadDocumentModal } from "../../../modals/UploadDocumentModal";

interface DocumentsCardProps {
  onDownload?: (appointment: Appointment) => void;
  onViewAll?: () => void;
}

type DocType = "Ordonnance" | "Analyse" | "Certificat";

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

export function DocumentsCard({ onDownload, onViewAll }: DocumentsCardProps) {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filters, setFilters] = useState<DocumentFilters>({ types: [] });

  const isLoading = useAppointmentStore((s) => s.isLoading);
  const appointments = useAppointmentStore((s) => s.appointments);

  let withDocs = appointments.filter(
    (a) =>
      a.status.current === "completed" &&
      (a.consultation.prescriptionId || a.communication.sharedDocuments.length > 0)
  );

  if (filters.types.length > 0) {
    withDocs = withDocs.filter((a) => filters.types.includes(getDocType(a)));
  }
  if (filters.dateFrom) {
    withDocs = withDocs.filter((a) => new Date(a.details.scheduledFor) >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    withDocs = withDocs.filter((a) => new Date(a.details.scheduledFor) <= filters.dateTo!);
  }
  if (filters.doctorName) {
    withDocs = withDocs.filter((a) =>
      doctorLabel(a).toLowerCase().includes(filters.doctorName!.toLowerCase())
    );
  }

  const preview = withDocs.slice(0, 3);

  const handleUpload = async (file: File, type: string, date: Date, notes?: string) => {
    console.log("Upload document:", { file, type, date, notes });
  };

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-800">Documents & Ordonnances</span>
          </div>
          <div className="flex gap-2">
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
        ) : preview.length === 0 ? (
          <p className="text-xs text-gray-400">Aucun document disponible</p>
        ) : (
          <table className="w-full text-xs">
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
              {preview.map((a) => {
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
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_STYLE[type]}`}>
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
                        onClick={() => onDownload?.(a)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {withDocs.length > 3 && (
          <div className="mt-4 text-center border-t border-gray-100 pt-3">
            <button
              onClick={onViewAll}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              Voir tous les documents ({withDocs.length})
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
    </>
  );
}