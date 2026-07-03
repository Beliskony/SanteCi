"use client";

import { useState } from "react";
import { Plus, Trash2, X, FileText, AlertCircle } from "lucide-react";
import { useDoctorPrescriptionStore } from "@/app/frontend/store/useDoctorPrescriptionStore";
import type { MedicationDTO, TestRequestedDTO } from "@/app/frontend/services/prescriptionService";

interface CreatePrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  onSuccess?: () => void;
}

const EMPTY_MEDICATION: MedicationDTO = {
  name: "", dosage: "", frequency: "", duration: "", instructions: "", quantity: 1, unit: "",
};

const EMPTY_TEST: TestRequestedDTO = {
  type: "", instructions: "", laboratory: "",
};

export function CreatePrescriptionModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  appointmentId,
  onSuccess,
}: CreatePrescriptionModalProps) {
  const createPrescription = useDoctorPrescriptionStore((s) => s.createPrescription);
  const isSaving = useDoctorPrescriptionStore((s) => s.isSaving);

  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState<MedicationDTO[]>([{ ...EMPTY_MEDICATION }]);
  const [showTests, setShowTests] = useState(false);
  const [tests, setTests] = useState<TestRequestedDTO[]>([]);
  const [notes, setNotes] = useState("");
  const [validityDays, setValidityDays] = useState(90);
  const [refillsAllowed, setRefillsAllowed] = useState(0);
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setDiagnosis("");
    setMedications([{ ...EMPTY_MEDICATION }]);
    setShowTests(false);
    setTests([]);
    setNotes("");
    setValidityDays(90);
    setRefillsAllowed(0);
    setFollowUpRequired(false);
    setFollowUpDate("");
    setFollowUpNotes("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Médicaments ──────────────────────────────────────────
  const updateMedication = (index: number, field: keyof MedicationDTO, value: string | number) => {
    setMedications((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const addMedication = () => {
    if (medications.length >= 20) return;
    setMedications((prev) => [...prev, { ...EMPTY_MEDICATION }]);
  };

  const removeMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Examens demandés ──────────────────────────────────────
  const updateTest = (index: number, field: keyof TestRequestedDTO, value: string) => {
    setTests((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const addTest = () => {
    if (tests.length >= 10) return;
    setTests((prev) => [...prev, { ...EMPTY_TEST }]);
  };

  const removeTest = (index: number) => {
    setTests((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Validation ────────────────────────────────────────────
  const isMedicationValid = (m: MedicationDTO) =>
    m.name.trim() && m.dosage.trim() && m.frequency.trim() && m.duration.trim() && m.unit.trim() && m.quantity >= 1;

  const isFormValid =
    diagnosis.trim().length > 0 &&
    medications.length > 0 &&
    medications.every(isMedicationValid) &&
    (!showTests || tests.every((t) => t.type.trim().length > 0));

  // ── Soumission ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isFormValid) {
      setError("Veuillez remplir tous les champs obligatoires (diagnostic et médicaments).");
      return;
    }
    setError(null);

    try {
      await createPrescription({
        patientId,
        appointmentId,
        diagnosis: diagnosis.trim(),
        medications: medications.map((m) => ({
          ...m,
          instructions: m.instructions?.trim() || undefined,
        })),
        testsRequested: showTests && tests.length > 0
          ? tests.map((t) => ({
              type: t.type.trim(),
              instructions: t.instructions?.trim() || undefined,
              laboratory: t.laboratory?.trim() || undefined,
            }))
          : undefined,
        notes: notes.trim() || undefined,
        validityDays,
        refillsAllowed,
        followUp: followUpRequired
          ? {
              required: true,
              date: followUpDate || undefined,
              notes: followUpNotes.trim() || undefined,
            }
          : { required: false },
      });

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création de l'ordonnance.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-[#1e3a8a]" />
              Nouvelle ordonnance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Pour {patientName}</p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Diagnostic */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Diagnostic <span className="text-red-500">*</span>
            </label>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Ex : Hypertension artérielle légère"
              rows={2}
              className="w-full px-3 py-2.5 text-sm text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          {/* Médicaments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">
                Médicaments <span className="text-red-500">*</span>
              </label>
              <button
                onClick={addMedication}
                disabled={medications.length >= 20}
                className="flex items-center gap-1 text-xs font-semibold text-[#1e3a8a] hover:underline disabled:opacity-40"
              >
                <Plus size={13} />
                Ajouter
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {medications.map((med, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative">
                  {medications.length > 1 && (
                    <button
                      onClick={() => removeMedication(i)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">Nom *</label>
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => updateMedication(i, "name", e.target.value)}
                        placeholder="Ex : Amlodipine"
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">Dosage *</label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => updateMedication(i, "dosage", e.target.value)}
                        placeholder="Ex : 5mg"
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">Fréquence *</label>
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={(e) => updateMedication(i, "frequency", e.target.value)}
                        placeholder="Ex : 1 fois/jour"
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">Durée *</label>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => updateMedication(i, "duration", e.target.value)}
                        placeholder="Ex : 30 jours"
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">Quantité *</label>
                      <input
                        type="number"
                        min={1}
                        value={med.quantity}
                        onChange={(e) => updateMedication(i, "quantity", parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">Unité *</label>
                      <input
                        type="text"
                        value={med.unit}
                        onChange={(e) => updateMedication(i, "unit", e.target.value)}
                        placeholder="Ex : boîte(s), comprimé(s)"
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">Instructions (optionnel)</label>
                    <input
                      type="text"
                      value={med.instructions}
                      onChange={(e) => updateMedication(i, "instructions", e.target.value)}
                      placeholder="Ex : À prendre après le repas"
                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Examens demandés */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTests}
                  onChange={(e) => {
                    setShowTests(e.target.checked);
                    if (e.target.checked && tests.length === 0) setTests([{ ...EMPTY_TEST }]);
                  }}
                  className="w-4 h-4 accent-[#1e3a8a]"
                />
                Examens demandés (optionnel)
              </label>
              {showTests && (
                <button
                  onClick={addTest}
                  disabled={tests.length >= 10}
                  className="flex items-center gap-1 text-xs font-semibold text-[#1e3a8a] hover:underline disabled:opacity-40"
                >
                  <Plus size={13} />
                  Ajouter
                </button>
              )}
            </div>

            {showTests && (
              <div className="flex flex-col gap-3">
                {tests.map((test, i) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative">
                    <button
                      onClick={() => removeTest(i)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="mb-2">
                      <label className="text-[10px] font-medium text-slate-500 mb-1 block">Type d&apos;examen *</label>
                      <input
                        type="text"
                        value={test.type}
                        onChange={(e) => updateTest(i, "type", e.target.value)}
                        placeholder="Ex : Bilan lipidique"
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">Laboratoire</label>
                        <input
                          type="text"
                          value={test.laboratory}
                          onChange={(e) => updateTest(i, "laboratory", e.target.value)}
                          placeholder="Optionnel"
                          className="w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">Instructions</label>
                        <input
                          type="text"
                          value={test.instructions}
                          onChange={(e) => updateTest(i, "instructions", e.target.value)}
                          placeholder="Optionnel"
                          className="w-full px-2.5 py-1.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Notes complémentaires</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Recommandations, précautions..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          {/* Validité + Renouvellements */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Validité (jours)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 90)}
                className="w-full px-3 py-2 text-sm text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Renouvellements autorisés</label>
              <input
                type="number"
                min={0}
                max={10}
                value={refillsAllowed}
                onChange={(e) => setRefillsAllowed(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Suivi */}
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={followUpRequired}
                onChange={(e) => setFollowUpRequired(e.target.checked)}
                className="w-4 h-4 accent-[#1e3a8a]"
              />
              Consultation de suivi requise
            </label>
            {followUpRequired && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-500 mb-1 block">Date prévue</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-500 mb-1 block">Note de suivi</label>
                  <input
                    type="text"
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="Optionnel"
                    className="w-full px-2.5 py-2 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-100 shrink-0">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isFormValid || isSaving}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-[#1e3a8a] rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {isSaving ? "Création..." : "Créer l'ordonnance"}
          </button>
        </div>
      </div>
    </div>
  );
}