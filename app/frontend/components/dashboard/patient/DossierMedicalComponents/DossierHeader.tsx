"use client";

import { Clock } from "lucide-react";

interface DossierHeaderProps {
  patientName: string;
  lastUpdated: string; // ex: "12 Octobre 2023"
  //onExport?: () => void;
  //onShare?: () => void;
}

export function DossierHeader({
  patientName,
  lastUpdated,
  //onExport,
  //onShare,
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

    </div>
  );
}