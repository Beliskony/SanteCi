// app/frontend/components/dossier-medical/modals/ConfirmRemoveModal.tsx
"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmRemoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: "allergie" | "intolérance" | "contact" | "document" | "traitement";
  isRemoving?: boolean;
}

const typeLabels = {
  allergie: "l'allergie",
  intolérance: "l'intolérance",
  contact: "le contact",
  document: "le document",
  traitement: "le traitement",
};

export function ConfirmRemoveModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isRemoving = false,
}: ConfirmRemoveModalProps) {
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-sm mx-4 bg-white rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-base font-medium text-gray-800">Confirmer la suppression</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>

          <p className="text-sm text-gray-600 mb-2">
            Êtes-vous sûr de vouloir supprimer <span className="font-medium text-gray-800">"{itemName}"</span> ?
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Cette action est irréversible. {typeLabels[itemType]} sera définitivement supprimée.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isRemoving}
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={isRemoving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isRemoving ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}