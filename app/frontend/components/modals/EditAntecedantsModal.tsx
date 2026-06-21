// app/frontend/components/dossier-medical/modals/EditAntecedentsModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { ConfirmRemoveModal } from "./ConfirmRemoveModal";

interface MedicalEntry {
  type: "CHRONIQUE" | "FAMILIAL" | "CHIRURGICAL" | "AUTRE";
  title: string;
  description?: string;
}

interface EditAntecedentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chronicDiseases: string[];
  onSave: (data: { chronicDiseases: string[] }) => Promise<void>;
}

const TYPE_OPTIONS = [
  { value: "CHRONIQUE", label: "Chronique", color: "red" },
  { value: "FAMILIAL", label: "Familial", color: "blue" },
  { value: "CHIRURGICAL", label: "Chirurgical", color: "amber" },
  { value: "AUTRE", label: "Autre", color: "gray" },
] as const;

function existingToEntries(chronicDiseases: string[]): MedicalEntry[] {
  return chronicDiseases.map((title) => ({ type: "CHRONIQUE", title, description: undefined }));
}

export function EditAntecedentsModal({
  isOpen,
  onClose,
  chronicDiseases: initialChronicDiseases,
  onSave,
}: EditAntecedentsModalProps) {
  const [entries, setEntries] = useState<MedicalEntry[]>(() => existingToEntries(initialChronicDiseases));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
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

  const handleAdd = () => {
    setEntries([...entries, { type: "CHRONIQUE", title: "", description: "" }]);
    setEditingIndex(entries.length);
    setIsAdding(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setIsAdding(false);
  };

  const handleSaveEntry = (updatedEntry: MedicalEntry) => {
    if (editingIndex !== null) {
      const newEntries = [...entries];
      newEntries[editingIndex] = updatedEntry;
      setEntries(newEntries);
    }
    setEditingIndex(null);
    setIsAdding(false);
  };

  const handleRemove = (index: number) => setRemovingIndex(index);

  const confirmRemove = () => {
    if (removingIndex !== null) {
      const newEntries = entries.filter((_, i) => i !== removingIndex);
      setEntries(newEntries);
      setRemovingIndex(null);
      if (editingIndex === removingIndex) {
        setEditingIndex(null);
        setIsAdding(false);
      } else if (editingIndex !== null && editingIndex > removingIndex) {
        setEditingIndex(editingIndex - 1);
      }
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const chronicDiseases = entries.filter((e) => e.type === "CHRONIQUE").map((e) => e.title);
      await onSave({ chronicDiseases });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasEmptyRequired = entries.some((e) => !e.title.trim());

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div ref={modalRef} className="w-full max-w-lg mx-4 bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 p-4 shrink-0">
            <h2 className="text-base font-medium text-gray-800">Antécédents & Pathologies</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto flex-1">
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2 mb-4">
              Les antécédents familiaux et chirurgicaux sont en cours de développement.
              Pour l'instant, seules les maladies chroniques sont sauvegardées.
            </div>

            {entries.length === 0 && !isAdding && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-3">Aucun antécédent renseigné</p>
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un antécédent
                </button>
              </div>
            )}

            <div className="space-y-3">
              {entries.map((entry, i) => (
                <div key={i} className={`bg-gray-50 rounded-lg p-3 ${editingIndex === i ? "ring-2 ring-blue-500 bg-white" : ""}`}>
                  {editingIndex === i ? (
                    <EntryForm
                      entry={entry}
                      onSave={handleSaveEntry}
                      onCancel={() => {
                        if (isAdding) setEntries(entries.filter((_, idx) => idx !== i));
                        setEditingIndex(null);
                        setIsAdding(false);
                      }}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          entry.type === "CHRONIQUE" ? "bg-red-50 text-red-700"
                          : entry.type === "FAMILIAL" ? "bg-blue-50 text-blue-700"
                          : entry.type === "CHIRURGICAL" ? "bg-amber-50 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                        }`}>
                          {TYPE_OPTIONS.find((t) => t.value === entry.type)?.label}
                        </span>
                        <p className="text-sm font-medium text-gray-800 mt-1">{entry.title}</p>
                        {entry.description && <p className="text-xs text-gray-500 mt-1">{entry.description}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(i)} className="p-1.5 text-gray-400 hover:text-blue-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleRemove(i)} className="p-1.5 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!isAdding && entries.length > 0 && (
              <button onClick={handleAdd} className="w-full mt-3 py-2 text-sm text-blue-600 border border-dashed border-blue-200 rounded-lg hover:bg-blue-50">
                + Ajouter un antécédent
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-4 border-t border-gray-100 shrink-0">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={hasEmptyRequired || isSaving} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmRemoveModal
        isOpen={removingIndex !== null}
        onClose={() => setRemovingIndex(null)}
        onConfirm={confirmRemove}
        itemName={removingIndex !== null ? entries[removingIndex]?.title || "cet antécédent" : ""}
        itemType="traitement"
      />
    </>
  );
}

function EntryForm({ entry, onSave, onCancel }: { entry: MedicalEntry; onSave: (entry: MedicalEntry) => void; onCancel: () => void }) {
  const [type, setType] = useState<MedicalEntry["type"]>(entry.type);
  const [title, setTitle] = useState(entry.title);
  const [description, setDescription] = useState(entry.description || "");

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => setType(opt.value)} className={`px-3 py-1.5 text-xs rounded-full ${
              type === opt.value ? `bg-${opt.color}-100 text-${opt.color}-800 border border-${opt.color}-200` : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Titre <span className="text-red-500">*</span></label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Diabète de type 2" className="w-full px-3 py-2 placeholder:text-gray-600 text-sm text-gray-950 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" autoFocus />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Description (optionnelle)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg">Annuler</button>
        <button onClick={() => onSave({ type, title: title.trim(), description: description.trim() || undefined })} disabled={!title.trim()} className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg disabled:opacity-50">Sauvegarder</button>
      </div>
    </div>
  );
}