// components/appointments/AppointmentMeta.tsx
import type { Appointment, ConsultationType } from "@/app/frontend/types/Appointment";

// ── Icons ─────────────────────────────────────────────────────────────────────

function VideoIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
      <circle cx="12" cy="11" r="3"/>
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}

// ── Label lisible par type de consultation ─────────────────────────────────────

const CONSULT_TYPE_LABEL: Record<ConsultationType, string> = {
  video:     "Téléconsultation",
  audio:     "Consultation audio",
  chat:      "Messagerie",
  in_person: "En cabinet",
};

// ── Composant ─────────────────────────────────────────────────────────────────

interface AppointmentMetaProps {
  appointment: Appointment;
}

export function AppointmentMeta({ appointment }: AppointmentMetaProps) {
  const { details, payment, status } = appointment;
  const isRemote = details.type !== "in_person";

  const paymentLabel = (() => {
    if (status.paymentStatus === "paid") {
      return `Payé (${payment.amount.toLocaleString("fr-FR")} ${payment.currency})`;
    }
    if (status.paymentStatus === "refunded") return "Remboursé";
    if (status.paymentStatus === "failed")   return "Paiement échoué";
    return "En attente de paiement";
  })();

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-3">
      {/* Type de consultation */}
      <div className="flex items-start gap-2">
        {isRemote ? <VideoIcon /> : <MapPinIcon />}
        <div>
          <p className="text-xs font-medium text-slate-700">
            {CONSULT_TYPE_LABEL[details.type]}
          </p>
          {isRemote && (
            <p className="text-[11px] text-slate-400">
              Le lien sera actif 5min avant
            </p>
          )}
        </div>
      </div>

      {/* Motif */}
      {details.reason && (
        <div className="flex items-start gap-2">
          <FileIcon />
          <div>
            <p className="text-xs font-medium text-slate-700">Motif</p>
            <p className="text-[11px] text-slate-400 line-clamp-2">
              {details.reason}
            </p>
          </div>
        </div>
      )}

      {/* Paiement */}
      <div className="flex items-start gap-2">
        <CreditCardIcon />
        <div>
          <p className="text-xs font-medium text-slate-700">Paiement</p>
          <p className="text-[11px] text-slate-400">{paymentLabel}</p>
        </div>
      </div>
    </div>
  );
}