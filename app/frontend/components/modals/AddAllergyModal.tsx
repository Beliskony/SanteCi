// app/frontend/components/dossier-medical/modals/AddAllergyModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";

interface AddAllergyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: "allergy" | "intolerance", value: string) => Promise<void>;
  existingAllergies: string[];
  existingIntolerances: string[];
}

const commonAllergies = [
  "Arachides", "Fruits à coque", "Gluten", "Lactose", "Œufs",
  "Poissons", "Crustacés", "Soja", "Sésame", "Moutarde", "Céleri", "Lupin", "Mollusques", "Sulfites",
];

const commonIntolerances = [
  "Lactose", "Gluten", "Histamine", "Fructose", "Caféine", "Alcool", "Oignons", "Ail", "Légumineuses",
];

export function AddAllergyModal({
  isOpen,
  onClose,
  onAdd,
  existingAllergies,
  existingIntolerances,
}: AddAllergyModalProps) {
  const [type, setType] = useState<"allergy" | "intolerance">("allergy");
  const [customValue, setCustomValue] = useState("");
  const [selectedCommon, setSelectedCommon] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const existingItems = type === "allergy" ? existingAllergies : existingIntolerances;

  const handleSubmit = async (value: string) => {
    if (!value.trim()) {
      setError("Veuillez saisir une valeur");
      return;
    }
    if (existingItems.includes(value.trim())) {
      setError(`Cette ${type === "allergy" ? "allergie" : "intolérance"} existe déjà`);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onAdd(type, value.trim());
      setCustomValue("");
      setSelectedCommon(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonList = type === "allergy" ? commonAllergies : commonIntolerances;
  const typeLabel = type === "allergy" ? "Allergie" : "Intolérance";
  const typeColor = type === "allergy" ? "amber" : "blue";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div ref={modalRef} className="w-full max-w-md mx-4 bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-base font-medium text-gray-800">Ajouter une {typeLabel.toLowerCase()}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Type selector */}
          <div className="flex gap-2 mb-4 p-1 bg-gray-50 rounded-lg">
            <button
              onClick={() => setType("allergy")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                type === "allergy" ? "bg-white text-amber-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Allergie
              </div>
            </button>
            <button
              onClick={() => setType("intolerance")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                type === "intolerance" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Intolérance
            </button>
          </div>

          {/* Liste des items courants */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 mb-2 block">{typeLabel}s courantes</label>
            <div className="flex flex-wrap gap-2">
              {commonList.map((item) => {
                const isExisting = existingItems.includes(item);
                return (
                  <button
                    key={item}
                    onClick={() => !isExisting && setSelectedCommon(item)}
                    disabled={isExisting}
                    className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                      selectedCommon === item
                        ? `bg-${typeColor}-100 text-${typeColor}-800 border border-${typeColor}-200`
                        : isExisting
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {item}
                    {isExisting && " ✓"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ou ajout personnalisé */}
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 mb-2 block">
              Ou ajouter une {typeLabel.toLowerCase()} personnalisée
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder={`Ex: ${type === "allergy" ? "Pénicilline" : "Menthol"}`}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                onKeyDown={(e) => e.key === "Enter" && customValue.trim() && handleSubmit(customValue)}
              />
              <button
                onClick={() => customValue.trim() && handleSubmit(customValue)}
                disabled={!customValue.trim() || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {selectedCommon && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => handleSubmit(selectedCommon)}
                disabled={isSubmitting}
                className={`w-full py-2.5 text-sm font-medium text-white rounded-lg ${
                  type === "allergy" ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
                } disabled:opacity-50`}
              >
                {isSubmitting ? "Ajout en cours..." : `Ajouter ${selectedCommon}`}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}