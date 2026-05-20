// app/frontend/components/dossier-medical/modals/FilterDocumentsModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, Filter, Stethoscope, FileText, Activity, File, X } from "lucide-react";

export interface DocumentFilters {
  types: ("Ordonnance" | "Analyse" | "Certificat")[];
  dateFrom?: Date;
  dateTo?: Date;
  doctorName?: string;
}

interface FilterDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: DocumentFilters) => void;
  currentFilters?: DocumentFilters;
}

const typeOptions = [
  { value: "Ordonnance" as const, label: "Ordonnances", icon: FileText, color: "amber" },
  { value: "Analyse" as const, label: "Analyses", icon: Activity, color: "green" },
  { value: "Certificat" as const, label: "Certificats", icon: File, color: "gray" },
];

export function FilterDocumentsModal({
  isOpen,
  onClose,
  onApply,
  currentFilters,
}: FilterDocumentsModalProps) {
  const [selectedTypes, setSelectedTypes] = useState<DocumentFilters["types"]>(
    currentFilters?.types || []
  );
  const [dateFrom, setDateFrom] = useState<string>(
    currentFilters?.dateFrom ? currentFilters.dateFrom.toISOString().split("T")[0] : ""
  );
  const [dateTo, setDateTo] = useState<string>(
    currentFilters?.dateTo ? currentFilters.dateTo.toISOString().split("T")[0] : ""
  );
  const [doctorName, setDoctorName] = useState(currentFilters?.doctorName || "");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const toggleType = (type: DocumentFilters["types"][number]) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleReset = () => {
    setSelectedTypes([]);
    setDateFrom("");
    setDateTo("");
    setDoctorName("");
  };

  const handleApply = () => {
    onApply({
      types: selectedTypes,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      doctorName: doctorName.trim() || undefined,
    });
    onClose();
  };

  const hasActiveFilters = selectedTypes.length > 0 || dateFrom || dateTo || doctorName;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div ref={modalRef} className="w-full max-w-md mx-4 bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-base font-medium text-gray-800">Filtrer les documents</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* Type de document */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Type de document</label>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => toggleType(value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors ${
                    selectedTypes.includes(value)
                      ? `bg-${color}-100 text-${color}-800 border border-${color}-200`
                      : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Période */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Période</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 mb-1 block">Du</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 mb-1 block">Au</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Médecin */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Médecin</label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Nom du médecin"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Réinitialiser
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Filter className="w-3.5 h-3.5 inline mr-1.5" />
              Appliquer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}