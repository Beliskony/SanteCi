"use client";

import { useState } from "react";
import { AlertTriangle, X, Plus } from "lucide-react";
import type { PatientHealth } from "@/app/frontend/store/useAuthStore";
import { usePatientStore } from "@/app/frontend/store/patientStore";
import { AddAllergyModal } from "../../../modals/AddAllergyModal";
import { ConfirmRemoveModal } from "../../../modals/ConfirmRemoveModal";

interface AllergiesCardProps {
  health: PatientHealth | null;
}

export function AllergiesCard({ health }: AllergiesCardProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [removingItem, setRemovingItem] = useState<{ type: "allergy" | "intolerance"; value: string } | null>(null);

  const allergies: string[] = health?.allergies ?? [];
  const intolerances: string[] = health?.chronicDiseases ?? [];
  const all = [
    ...allergies.map(a => ({ type: "allergy" as const, value: a })),
    ...intolerances.map(i => ({ type: "intolerance" as const, value: i }))
  ];

  const updateHealth = usePatientStore((s) => s.updateHealth);

  const handleAdd = async (type: "allergy" | "intolerance", value: string) => {
    if (type === "allergy") {
      await updateHealth({ allergies: [...allergies, value] });
    } else {
      await updateHealth({ chronicDiseases: [...intolerances, value] });
    }
  };

  const handleRemove = async () => {
    if (!removingItem) return;
    if (removingItem.type === "allergy") {
      await updateHealth({ allergies: allergies.filter(a => a !== removingItem.value) });
    } else {
      await updateHealth({ chronicDiseases: intolerances.filter(i => i !== removingItem.value) });
    }
    setRemovingItem(null);
  };

  return (
    <>
      <div className="bg-white border-l-[3px] border-l-amber-500 border border-gray-100 rounded-r-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-gray-800">Allergies & Intolérances</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {all.length === 0 && (
            <span className="text-xs text-gray-400">Aucune allergie renseignée</span>
          )}
          {all.map((item) => (
            <span
              key={`${item.type}-${item.value}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-full text-gray-600"
            >
              <button
                onClick={() => setRemovingItem(item)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
              {item.value}
            </span>
          ))}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center w-7 h-7 border border-gray-200 rounded-full text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <AddAllergyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAdd}
        existingAllergies={allergies}
        existingIntolerances={intolerances}
      />

      <ConfirmRemoveModal
        isOpen={removingItem !== null}
        onClose={() => setRemovingItem(null)}
        onConfirm={handleRemove}
        itemName={removingItem?.value || ""}
        itemType={removingItem?.type === "allergy" ? "allergie" : "intolérance"}
      />
    </>
  );
}