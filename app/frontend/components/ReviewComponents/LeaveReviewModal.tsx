"use client";

import { useEffect, useState } from "react";
import { X, Star as StarIcon } from "lucide-react";
import { StarRating } from "./StarRating";
import { useReviewStore } from "@/app/frontend/store/useReviewStore";

interface LeaveReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  doctorName: string;
  onSuccess?: () => void;
}

export function LeaveReviewModal({
  isOpen,
  onClose,
  appointmentId,
  doctorName,
  onSuccess,
}: LeaveReviewModalProps) {
  const isSaving = useReviewStore((s) => s.isSaving);
  const currentAppointmentReview = useReviewStore((s) => s.currentAppointmentReview);
  const fetchReviewForAppointment = useReviewStore((s) => s.fetchReviewForAppointment);
  const createReview = useReviewStore((s) => s.createReview);
  const updateReview = useReviewStore((s) => s.updateReview);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifie si un avis existe déjà pour ce RDV → pré-remplit le formulaire (mode édition)
  useEffect(() => {
    if (!isOpen || !appointmentId) return;
    fetchReviewForAppointment(appointmentId);
  }, [isOpen, appointmentId, fetchReviewForAppointment]);

  useEffect(() => {
    if (currentAppointmentReview) {
      setRating(currentAppointmentReview.rating);
      setComment(currentAppointmentReview.comment ?? "");
      setIsAnonymous(currentAppointmentReview.isAnonymous);
    }
  }, [currentAppointmentReview]);

  if (!isOpen) return null;

  const isEditing = !!currentAppointmentReview;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Merci de sélectionner une note.");
      return;
    }
    setError(null);

    try {
      if (isEditing) {
        await updateReview(currentAppointmentReview!._id, { rating, comment, isAnonymous });
      } else {
        await createReview({ appointmentId, rating, comment, isAnonymous });
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Impossible d'enregistrer votre avis.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <StarIcon size={18} className="text-amber-400" fill="currentColor" />
            <div>
              <p className="text-sm font-bold text-slate-900">
                {isEditing ? "Modifier votre avis" : "Laisser un avis"}
              </p>
              <p className="text-xs text-slate-500">{doctorName}</p>
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
          <p className="text-xs text-slate-500 text-center">
            Votre avis aide les autres patients à choisir le bon médecin — c'est totalement facultatif.
          </p>

          <div className="flex justify-center">
            <StarRating value={rating} onChange={setRating} size={32} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
              Commentaire (optionnel)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Partagez votre expérience..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#1e3a8a] resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-slate-300"
            />
            Publier anonymement
          </label>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Passer
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-[#1e3a8a] text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {isSaving ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Publier"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}