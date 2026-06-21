"use client";

import { FolderOpen, MessageSquare, CalendarPlus, FileText } from "lucide-react";

interface PatientQuickActionsProps {
  onDossier:    () => void;
  onMessage:    () => void;
  onRevoir:     () => void;
  onOrdonnance: () => void;
}

export function PatientQuickActions({ onDossier, onMessage, onRevoir, onOrdonnance }: PatientQuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={onDossier}
        className="flex items-center justify-center gap-2 px-3 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
      >
        <FolderOpen size={14} />
        Dossier
      </button>
      <button
        onClick={onMessage}
        className="flex items-center justify-center gap-2 px-3 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
      >
        <MessageSquare size={14} />
        Message
      </button>
      <button
        onClick={onRevoir}
        className="flex items-center justify-center gap-2 px-3 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
      >
        <CalendarPlus size={14} />
        Revoir
      </button>
      <button
        onClick={onOrdonnance}
        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#1e3a8a] text-white text-xs font-bold rounded-xl hover:bg-blue-800 transition-colors"
      >
        <FileText size={14} />
        Ordonnance
      </button>
    </div>
  );
}