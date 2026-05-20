"use client";

import { Download, Share2, Clock } from "lucide-react";

interface DossierHeaderProps {
  patientName: string;
  lastUpdated: string; // ex: "12 Octobre 2023"
  onExport?: () => void;
  onShare?: () => void;
}

export function DossierHeader({
  patientName,
  lastUpdated,
  onExport,
  onShare,
}: DossierHeaderProps) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
      <div>
        <h1 className="text-xl font-medium text-gray-900">
          Dossier de {patientName}
        </h1>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5 text-green-600" />
          Dernière mise à jour : {lastUpdated}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Exporter (PDF)
        </button>
        <button
          onClick={onShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          Partager
        </button>
      </div>
    </div>
  );
}