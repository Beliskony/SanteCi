// app/frontend/components/dossier-medical/modals/AddEmergencyContactModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { User, Phone, Heart, X } from "lucide-react";

interface AddEmergencyContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (contact: { name: string; phone: string; relationship: string }) => Promise<void>;
  existingCount: number;
  maxContacts: number;
}

const relationshipOptions = [
  "Conjoint/Conjointe",
  "Parent",
  "Enfant",
  "Frère/Sœur",
  "Ami/Amie",
  "Collègue",
  "Voisin",
  "Autre",
];

export function AddEmergencyContactModal({
  isOpen,
  onClose,
  onAdd,
  existingCount,
  maxContacts,
}: AddEmergencyContactModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [customRelationship, setCustomRelationship] = useState("");
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

  const isRelationshipCustom = relationship === "Autre";
  const finalRelationship = isRelationshipCustom ? customRelationship : relationship;

  const validatePhone = (phone: string) => {
    const phoneRegex = /^(\+[0-9]{1,3}[0-9]{8,12}|0[0-9]{9})$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Veuillez saisir un nom");
      return;
    }
    if (!validatePhone(phone)) {
      setError("Numéro de téléphone invalide");
      return;
    }
    if (!relationship || (isRelationshipCustom && !customRelationship.trim())) {
      setError("Veuillez préciser la relation");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onAdd({
        name: name.trim(),
        phone: phone.trim(),
        relationship: finalRelationship.trim(),
      });
      setName("");
      setPhone("");
      setRelationship("");
      setCustomRelationship("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const remaining = maxContacts - existingCount;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div ref={modalRef} className="w-full max-w-md mx-4 bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-base font-medium text-gray-800">Ajouter un contact d'urgence</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {existingCount > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
              Vous avez {existingCount} contact{existingCount > 1 ? "s" : ""} sur {maxContacts} maximum.
              Plus que {remaining} place{remaining > 1 ? "s" : ""} disponible{remaining > 1 ? "s" : ""}.
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jean Dupont"
                className="w-full pl-9 pr-3 py-2 text-sm text-black/70 border placeholder:text-gray-500 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Téléphone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78 ou 0612345678"
                className="w-full pl-9 pr-3 py-2 text-sm text-black/70 border placeholder:text-gray-500 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              Relation <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm text-black/70 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none bg-white"
              >
                <option value="">Sélectionner une relation</option>
                {relationshipOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isRelationshipCustom && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Précisez la relation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customRelationship}
                onChange={(e) => setCustomRelationship(e.target.value)}
                placeholder="Ex: Tuteur légal, Beau-père..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}

          {error && (
            <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Ajout..." : "Ajouter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}