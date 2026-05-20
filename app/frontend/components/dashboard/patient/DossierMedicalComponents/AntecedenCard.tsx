"use client";

import { useState } from "react";
import { ClipboardList, Pencil } from "lucide-react";
import type { PatientHealth } from "@/app/frontend/store/useAuthStore";
import { usePatientStore } from "@/app/frontend/store/patientStore";
import { EditAntecedentsModal } from "../../../modals/EditAntecedantsModal";

interface AntecedentsCardProps {
  health: PatientHealth | null;
}

export function AntecedentsCard({ health }: AntecedentsCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const updateHealth = usePatientStore((s) => s.updateHealth);

  const chronicDiseases = health?.chronicDiseases ?? [];

  const handleSave = async (data: { chronicDiseases: string[] }) => {
    await updateHealth({ chronicDiseases: data.chronicDiseases });
  };

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-800">Antécédents & Pathologies</span>
          </div>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Modifier
          </button>
        </div>

        {chronicDiseases.length === 0 ? (
          <p className="text-xs text-gray-400">Aucun antécédent renseigné</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {chronicDiseases.map((disease, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Chronique
                </p>
                <p className="text-sm font-medium text-gray-800">{disease}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditAntecedentsModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        chronicDiseases={chronicDiseases}
        onSave={handleSave}
      />
    </>
  );
}