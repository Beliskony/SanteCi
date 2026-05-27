"use client";

import { Video, MessageSquare, Phone, MapPin, Play, FolderOpen, FileText } from "lucide-react";
import type { Appointment } from "@/app/frontend/types/Appointment";
import { isPopulatedPatient } from "@/app/frontend/types/Appointment";
import { useAppointmentStore } from "@/app/frontend/store/appoitmentStore";
import { useSocketStore }      from "@/app/frontend/store/soketStore";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; badge: string }> = {
  video:     { label: "Vidéo",   icon: <Video size={11} />,         badge: "bg-[#1e3a8a] text-white"       },
  audio:     { label: "Audio",   icon: <Phone size={11} />,         badge: "bg-violet-500 text-white"      },
  chat:      { label: "Chat",    icon: <MessageSquare size={11} />, badge: "bg-emerald-500 text-white"     },
  in_person: { label: "Cabinet", icon: <MapPin size={11} />,        badge: "bg-amber-500 text-white"       },
};

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  pending:   { label: "En attente", style: "bg-amber-100 text-amber-700"   },
  confirmed: { label: "Confirmée",  style: "bg-blue-100 text-blue-700"     },
  ongoing:   { label: "En cours",   style: "bg-red-100 text-red-600"       },
  completed: { label: "Terminée",   style: "bg-green-100 text-green-700"   },
  cancelled: { label: "Annulée",    style: "bg-slate-100 text-slate-500"   },
  no_show:   { label: "Absent",     style: "bg-orange-100 text-orange-600" },
};

// Étiquette spéciale côté patient
function getPatientTag(totalConsults: number): { label: string; style: string } | null {
  if (totalConsults === 0) return { label: "Nouveau patient",  style: "bg-orange-100 text-orange-600" };
  if (totalConsults === 1) return { label: "2e consultation",  style: "bg-blue-100 text-blue-600"     };
  return null;
}

// ── Composant ─────────────────────────────────────────────────────────────────

interface ConsultationCardProps {
  appointment:   Appointment;
  isExpanded:    boolean;
  onViewDetail:  (id: string) => void;
  onMarkAbsent:  (id: string) => void;
  onMessage:     (patientId: string) => void;
  onDossier:     (patientId: string) => void;
}

export function ConsultationCard({
  appointment,
  isExpanded,
  onViewDetail,
  onMarkAbsent,
  onMessage,
  onDossier,
}: ConsultationCardProps) {
  const { details, status, payment, patientId, _id } = appointment;

  const markNoShow    = useAppointmentStore((s) => s.markNoShow);
  const startAppt     = useAppointmentStore((s) => s.start);
  const initiateCall  = useSocketStore((s) => s.initiateCall);
  const user          = useAuthStore((s) => s.user);

  const patient    = isPopulatedPatient(patientId) ? patientId : null;
  const typeCfg    = TYPE_CONFIG[details.type]    ?? TYPE_CONFIG.in_person;
  const statusCfg  = STATUS_CONFIG[status.current] ?? STATUS_CONFIG.pending;
  const isOngoing  = status.current === "ongoing";
  const isConfirmed= status.current === "confirmed";

  const scheduledFor = new Date(details.scheduledFor);
  const time = scheduledFor.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const patientName = patient
    ? `${patient.profile.firstName} ${patient.profile.lastName}`
    : "Patient";
  const patientInitials = patient
    ? `${patient.profile.firstName?.[0] ?? ""}${patient.profile.lastName?.[0] ?? ""}`
    : "?";

  // Étiquette patient (nouveau/suivi)
  const patientTag = getPatientTag(0); // à remplacer par totalConsultations réel

  // Démarrer la consultation
  const handleStart = async () => {
    await startAppt(_id);
    if (!user || !isDoctor(user) || !patient) return;
    const doctorId = typeof user._id === "string" ? user._id : user._id.toString();
    if (details.type === "video" || details.type === "audio") {
      initiateCall({
        callerId:      doctorId,
        callerType:    "doctor",
        receiverId:    patient._id,
        appointmentId: _id,
        callType:      details.type as "video" | "audio",
      });
    }
  };

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${
      isExpanded
        ? "border-[#1e3a8a]/20 shadow-sm"
        : "border-slate-200 hover:border-slate-300"
    }`}>
      <div className={`flex gap-4 p-4 ${isExpanded ? "border-l-4 border-l-[#1e3a8a]" : ""}`}>

        {/* ── Heure + durée ── */}
        <div className={`flex flex-col items-center justify-center shrink-0 w-14 py-2 rounded-xl text-center ${
          isExpanded ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-600"
        }`}>
          <span className="text-sm font-bold leading-none">{time}</span>
          <span className={`text-[10px] mt-1 ${isExpanded ? "text-white/70" : "text-slate-400"}`}>
            {details.duration}min
          </span>
        </div>

        {/* ── Contenu ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">

          {/* Ligne 1 : avatar + nom + badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {patient?.profile?.photo ? (
                <img src={patient.profile.photo} alt={patientName}
                  className="w-9 h-9 rounded-full object-cover border border-slate-100 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center text-xs font-bold text-[#1e3a8a] shrink-0">
                  {patientInitials}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-slate-900 truncate">{patientName}</p>
                  {/* Badge type */}
                  <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${typeCfg.badge}`}>
                    {typeCfg.icon} {typeCfg.label}
                  </span>
                  {/* Badge statut */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.style}`}>
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{details.reason}</p>
              </div>
            </div>

            {/* Actions selon le mode */}
            {isExpanded ? (
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={handleStart}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1e3a8a] text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors"
                >
                  <Play size={12} className="fill-white" />
                  {isOngoing ? "Reprendre" : "Démarrer"}
                </button>
                <button
                  onClick={() => onDossier(patient?._id ?? "")}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <FolderOpen size={12} />
                  Voir le dossier
                </button>
                <button
                  onClick={() => onMessage(patient?._id ?? "")}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <MessageSquare size={12} />
                  Envoyer un message
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onViewDetail(_id)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Voir détail
                </button>
                {(isConfirmed || isOngoing) && (
                  <button
                    onClick={() => { markNoShow(_id); onMarkAbsent(_id); }}
                    className="px-3 py-1.5 text-xs font-semibold text-orange-500 border border-orange-100 rounded-xl hover:bg-orange-50 transition-colors"
                  >
                    Marquer absent
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Ligne 2 : détails expanded */}
          {isExpanded && (
            <div className="grid grid-cols-3 gap-4 mt-1">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Motif</p>
                <p className="text-xs text-slate-700 font-medium">{details.reason || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Paiement</p>
                <p className="text-xs text-slate-700 font-medium">
                  {status.paymentStatus === "paid"
                    ? `Payé • ${payment?.amount?.toLocaleString("fr-FR") ?? "—"} FCFA`
                    : status.paymentStatus === "pending"
                    ? "En attente"
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Dernière note</p>
                <p className="text-xs font-medium">
                  {patientTag ? (
                    <span className={`px-2 py-0.5 rounded-full ${patientTag.style}`}>{patientTag.label}</span>
                  ) : "—"}
                </p>
              </div>
            </div>
          )}

          {/* Ligne 3 : symptômes expanded */}
          {isExpanded && details.symptoms?.length > 0 && (
            <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed">
              Symptômes déclarés : {details.symptoms.join(", ")}.
            </p>
          )}

          {/* Compact : infos secondaires */}
          {!isExpanded && (
            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              {details.reason && <span>{details.reason}</span>}
              {status.paymentStatus && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>Paiement : {status.paymentStatus === "paid" ? "Validé" : "En attente"}</span>
                </>
              )}
              {appointment.communication?.sharedDocuments?.length > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <FileText size={11} />
                    Documents : {appointment.communication.sharedDocuments.length} fichier{appointment.communication.sharedDocuments.length > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}