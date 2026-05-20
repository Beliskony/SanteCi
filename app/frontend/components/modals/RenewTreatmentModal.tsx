// app/frontend/components/dossier-medical/modals/RenewPrescriptionModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Pill, AlertCircle, Send, X } from "lucide-react";

interface RenewPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRenew: (appointmentId: string, reason: string, priority: "normal" | "urgent") => Promise<void>;
  appointmentId: string;
  medicationName?: string;
  doctorName?: string;
}

export function RenewPrescriptionModal({
  isOpen,
  onClose,
  onRenew,
  appointmentId,
  medicationName,
  doctorName,
}: RenewPrescriptionModalProps) {
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Veuillez indiquer un motif de renouvellement");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onRenew(appointmentId, reason.trim(), priority);
      setReason("");
      setPriority("normal");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div ref={modalRef} className="w-full max-w-md mx-4 bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-base font-medium text-gray-800">Demander un renouvellement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Information */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Pill className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Renouvellement d'ordonnance</p>
                {medicationName && <p className="text-xs text-blue-700 mt-1">Médicament : {medicationName}</p>}
                {doctorName && <p className="text-xs text-blue-600 mt-0.5">Prescrit par {doctorName}</p>}
              </div>
            </div>
          </div>

          {/* Priorité */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Priorité</label>
            <div className="flex gap-3">
              <button
                onClick={() => setPriority("normal")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  priority === "normal" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Standard (3-5 jours)
              </button>
              <button
                onClick={() => setPriority("urgent")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  priority === "urgent" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Urgent (24-48h)
              </button>
            </div>
          </div>

          {/* Motif */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Motif du renouvellement <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Traitement toujours en cours, amélioration observée, besoin de poursuivre..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <p className="text-[11px] text-gray-400 text-center">
            Le médecin sera notifié de votre demande. Vous recevrez une réponse sous 48h.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={!reason.trim() || isSubmitting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? "Envoi..." : <><Send className="w-3.5 h-3.5 inline mr-1.5" /> Envoyer la demande</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}