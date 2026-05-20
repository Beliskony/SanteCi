"use client";

import { useState } from "react";
import { Pill, RefreshCw } from "lucide-react";
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore";
import { isPopulatedDoctor } from "@/app/frontend/types/Appointment";
import { RenewPrescriptionModal } from "../../../modals/RenewTreatmentModal";

interface TraitementsCardProps {
  onRenew?: (appointmentId: string, reason: string, priority: "normal" | "urgent") => Promise<void>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TraitementsCard({ onRenew }: TraitementsCardProps) {
  const [renewModal, setRenewModal] = useState<{ appointmentId: string; medicationName?: string; doctorName?: string } | null>(null);

  const isLoading = useAppointmentStore((s) => s.isLoading);
  const appointments = useAppointmentStore((s) => s.appointments);

  const active = appointments.filter(
    (a) =>
      a.status.current === "completed" &&
      (a.consultation.prescriptionId || a.consultation.recommendations.length > 0)
  );

  const handleRenew = async (appointmentId: string, reason: string, priority: "normal" | "urgent") => {
    if (onRenew) {
      await onRenew(appointmentId, reason, priority);
    }
    setRenewModal(null);
  };

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Pill className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-800">Traitements en cours</span>
        </div>

        {isLoading ? (
          <p className="text-xs text-gray-400">Chargement…</p>
        ) : active.length === 0 ? (
          <p className="text-xs text-gray-400">Aucun traitement actif</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {active.map((a) => {
              const doctor = isPopulatedDoctor(a.doctorId)
                ? `${a.doctorId.profile.title ?? "Dr."} ${a.doctorId.profile.firstName} ${a.doctorId.profile.lastName}`
                : `Dr. #${String(a.doctorId).slice(-4)}`;

              const medicationName = a.consultation.recommendations.find((r) =>
                r.toLowerCase().includes("médicament") || r.toLowerCase().includes("prescrire")
              ) || a.details.reason;

              return (
                <div key={a._id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <Pill className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.details.reason}</p>
                    {a.consultation.diagnosis && (
                      <p className="text-xs text-gray-500 truncate">{a.consultation.diagnosis}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      Prescrit par {doctor}
                      {a.consultation.followUpDate && ` · Suivi le ${formatDate(a.consultation.followUpDate)}`}
                    </p>
                    {a.consultation.recommendations.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {a.consultation.recommendations.map((r, i) => (
                          <li key={i} className="text-xs text-gray-500 flex gap-1">
                            <span className="text-gray-300">·</span> {r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    onClick={() => setRenewModal({ appointmentId: a._id, medicationName, doctorName: doctor })}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 shrink-0 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Renouveler
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {renewModal && (
        <RenewPrescriptionModal
          isOpen={true}
          onClose={() => setRenewModal(null)}
          onRenew={handleRenew}
          appointmentId={renewModal.appointmentId}
          medicationName={renewModal.medicationName}
          doctorName={renewModal.doctorName}
        />
      )}
    </>
  );
}