"use client";

import { useEffect, useState } from "react";
import { StarRating } from "./StarRating";
import { useReviewStore } from "@/app/frontend/store/useReviewStore";

interface DoctorReviewsSectionProps {
  doctorId: string;
}

export function DoctorReviewsSection({ doctorId }: DoctorReviewsSectionProps) {
  const doctorReviews = useReviewStore((s) => s.doctorReviews);
  const fetchDoctorReviews = useReviewStore((s) => s.fetchDoctorReviews);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchDoctorReviews(doctorId, { page, limit: 10 });
  }, [doctorId, page, fetchDoctorReviews]);

  if (!doctorReviews) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="h-16 bg-slate-100 rounded-xl" />
        <div className="h-16 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  const { reviews, total, pages, averageRating, reviewCount } = doctorReviews;

  return (
    <div className="flex flex-col gap-4">
      {/* Résumé */}
      <div className="flex items-center gap-3">
        <StarRating value={Math.round(averageRating)} size={20} />
        <p className="text-sm text-slate-700">
          <span className="font-bold">{averageRating.toFixed(1)}</span> / 5
          <span className="text-slate-400"> · {reviewCount} avis</span>
        </p>
      </div>

      {/* Liste */}
      {reviews.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          Aucun avis pour le moment.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <div key={r._id} className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-slate-800">{r.patientName}</p>
                <span className="text-[11px] text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <StarRating value={r.rating} size={14} />
              {r.comment && (
                <p className="text-sm text-slate-600 mt-2">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination simple */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-xs text-slate-500">
            {page} / {pages} ({total} avis)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}