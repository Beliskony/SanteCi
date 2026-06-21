// app/frontend/components/dossier-medical/modals/UploadDocumentModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, type: string, date: Date, notes?: string) => Promise<void>;
}

const documentTypes = [
  { value: "ordonnance", label: "Ordonnance", color: "amber", accept: ".pdf,.jpg,.png" },
  { value: "analyse", label: "Analyse médicale", color: "green", accept: ".pdf,.jpg,.png,.xlsx" },
  { value: "certificat", label: "Certificat médical", color: "gray", accept: ".pdf,.jpg,.png" },
  { value: "radio", label: "Radio / Imagerie", color: "blue", accept: ".pdf,.jpg,.png,.dicom" },
  { value: "autre", label: "Autre document", color: "gray", accept: ".pdf,.jpg,.png,.doc,.docx" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadDocumentModal({ isOpen, onClose, onUpload }: UploadDocumentModalProps) {
  const [selectedType, setSelectedType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > MAX_FILE_SIZE) {
        setError(`Le fichier est trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      setError("Veuillez sélectionner un type de document");
      return;
    }
    if (!file) {
      setError("Veuillez sélectionner un fichier");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onUpload(file, selectedType, new Date(documentDate), notes || undefined);
      setSelectedType("");
      setFile(null);
      setDocumentDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeConfig = documentTypes.find((t) => t.value === selectedType);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div ref={modalRef} className="w-full max-w-md mx-4 bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-base font-medium text-gray-800">Ajouter un document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Type de document */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">
              Type de document <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {documentTypes.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setSelectedType(value)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                    selectedType === value
                      ? `bg-${color}-100 text-${color}-800 border border-${color}-200`
                      : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date du document */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Date du document <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Upload fichier */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Fichier <span className="text-red-500">*</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                file ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-blue-300"
              }`}
            >
              {file ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-800 truncate max-w-50">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="p-1 text-gray-400 hover:text-red-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-1">Glissez un fichier ou cliquez pour parcourir</p>
                  <p className="text-xs text-gray-400">PDF, JPG, PNG, DICOM, DOCX (max {MAX_FILE_SIZE / 1024 / 1024}MB)</p>
                  <input ref={fileInputRef} type="file" onChange={handleFileChange} accept={typeConfig?.accept || ".pdf,.jpg,.png"} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="mt-3 px-4 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                    Parcourir
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Notes (optionnelles)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations complémentaires sur ce document..."
              rows={2}
              className="w-full px-3 py-2 text-sm text-gray-700 placeholder:text-gray-500 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={!selectedType || !file || isSubmitting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? "Upload..." : "Ajouter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}