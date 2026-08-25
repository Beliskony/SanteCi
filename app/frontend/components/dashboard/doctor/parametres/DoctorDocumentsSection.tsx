// app/frontend/components/dashboard/doctor/parametres/DoctorDocumentsSection.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { 
  FileText, Upload, Loader2, CheckCircle, AlertCircle, 
  GraduationCap, ShieldCheck, Building2, Trash2
} from "lucide-react";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";
import { useDoctorDashStore } from "@/app/frontend/store/doctorStore";
import { doctorService } from "@/app/frontend/services/doctorService";

// ─── Configuration ────────────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  { 
    value: 'diploma' as const, 
    label: 'Diplôme de médecine', 
    icon: GraduationCap,
    description: 'Diplôme de fin d\'études médicales',
    required: true,
    acceptedFormats: '.pdf,.jpg,.jpeg,.png',
    fieldName: 'diploma'
  },
  { 
    value: 'license_certificate' as const, 
    label: 'Certificat d\'inscription à l\'ordre', 
    icon: ShieldCheck,
    description: 'Certificat d\'inscription au conseil de l\'ordre',
    required: true,
    acceptedFormats: '.pdf,.jpg,.jpeg,.png',
    fieldName: 'licenseCertificate'
  },
  { 
    value: 'practice_attestation' as const, 
    label: 'Attestation de pratique', 
    icon: Building2,
    description: 'Attestation de votre structure d\'exercice',
    required: false,
    acceptedFormats: '.pdf,.jpg,.jpeg,.png',
    fieldName: 'practiceAttestation'
  },
];

const TYPE_LABELS: Record<string, string> = {
  diploma: 'Diplôme',
  license_certificate: 'Certificat d\'ordre',
  practice_attestation: 'Attestation de pratique',
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function DoctorDocumentsSection() {
  // ── Store ──────────────────────────────────────────────────────────────────
  const user = useAuthStore((s) => s.user && isDoctor(s.user) ? s.user : null);
  const { isSaving, error: storeError, clearError } = useDoctorDashStore();
  
  // ── État local ─────────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<any[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<typeof DOCUMENT_TYPES[number]['value']>('diploma');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [practiceName, setPracticeName] = useState('');
  const [practiceType, setPracticeType] = useState<'hospital' | 'clinic' | 'private' | 'other'>('private');


  // ── Upload d'un document ────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setSuccess(`Fichier "${file.name}" sélectionné pour ${TYPE_LABELS[selectedType]}`);
    setLocalError(null);
    clearError();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setLocalError('Veuillez sélectionner un fichier.');
      return;
    }

    if (!practiceName.trim()) {
      setLocalError('Veuillez indiquer le nom de votre lieu d\'exercice.');
      return;
    }

    setUploading(prev => ({ ...prev, [selectedType]: true }));
    setLocalError(null);
    clearError();
    setSuccess(null);

    try {
      const files: {
        diploma?: File;
        licenseCertificate?: File;
        practiceAttestation?: File;
      } = {};

      if (selectedType === 'diploma') {
        files.diploma = selectedFile;
      } else if (selectedType === 'license_certificate') {
        files.licenseCertificate = selectedFile;
      } else if (selectedType === 'practice_attestation') {
        files.practiceAttestation = selectedFile;
      }

      await doctorService.uploadVerificationDocuments(files, {
        name: practiceName,
        type: practiceType
      });
      
      setSuccess(`${TYPE_LABELS[selectedType]} téléchargé avec succès. En attente de validation par l'administrateur.`);
      
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setLocalError(err?.message || 'Échec du téléchargement.');
    } finally {
      setUploading(prev => ({ ...prev, [selectedType]: false }));
    }
  };

  // ── Suppression d'un document ──────────────────────────────────────────────

  const handleDelete = async (docId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce document ?')) return;

    setLocalError(null);
    clearError();
    setSuccess(null);

    try {
      await doctorService.deleteVerificationDocument(docId);
      setSuccess('Document supprimé avec succès.');
    } catch (err: any) {
      setLocalError(err?.message || 'Échec de la suppression.');
    }
  };

  // ── Mise à jour du lieu d'exercice ─────────────────────────────────────────

  const handleUpdatePractice = async () => {
    if (!practiceName.trim()) {
      setLocalError('Veuillez indiquer le nom de votre lieu d\'exercice.');
      return;
    }

    setLocalError(null);
    clearError();
    setSuccess(null);

    try {
      await doctorService.updatePracticeLocation({
        name: practiceName,
        type: practiceType
      });
      setSuccess('Lieu d\'exercice mis à jour avec succès.');
    } catch (err: any) {
      setLocalError(err?.message || 'Échec de la mise à jour.');
    }
  };

  // ── Gestionnaires d'événements ─────────────────────────────────────────────

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value as typeof DOCUMENT_TYPES[number]['value']);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePracticeTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPracticeType(e.target.value as 'hospital' | 'clinic' | 'private' | 'other');
  };

  // ── Rendu ────────────────────────────────────────────────────────────────────

  const typeInfo = DOCUMENT_TYPES.find(t => t.value === selectedType);
  const error = localError || storeError;

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#1e3a8a]" size={28} />
        <span className="ml-3 text-sm text-slate-500">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Documents professionnels</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Téléchargez vos justificatifs pour validation par l&apos;administrateur.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isVerified ? (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <CheckCircle size={13} /> Vérifié
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                <AlertCircle size={13} /> En attente de validation
              </span>
            )}
          </div>
        </div>

        {!isVerified && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-700">Documents requis</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Téléchargez votre diplôme et votre certificat d&apos;inscription à l&apos;ordre. 
                L&apos;administrateur les vérifiera et validera votre compte sous 24h.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Messages ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-red-600">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-emerald-600">
          <CheckCircle size={14} className="shrink-0" />
          {success}
        </div>
      )}

      {/* ─── Lieu d'exercice ────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Lieu d'exercice</h3>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={practiceName}
              onChange={(e) => setPracticeName(e.target.value)}
              placeholder="Nom de l'hôpital, clinique ou cabinet"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-[#1e3a8a] focus:bg-white transition-colors placeholder:text-slate-300"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={practiceType}
              onChange={handlePracticeTypeChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-[#1e3a8a] focus:bg-white transition-colors"
            >
              <option value="hospital">Hôpital</option>
              <option value="clinic">Clinique</option>
              <option value="private">Cabinet privé</option>
              <option value="other">Autre</option>
            </select>
          </div>
          <button
            onClick={handleUpdatePractice}
            disabled={isSaving}
            className="shrink-0 px-5 py-2.5 bg-[#1e3a8a] text-white text-sm font-bold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Mettre à jour'}
          </button>
        </div>
      </div>

      {/* ─── Upload ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Télécharger un document</h3>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <select
              value={selectedType}
              onChange={handleTypeChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-[#1e3a8a] focus:bg-white transition-colors"
            >
              {DOCUMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label} {t.required ? '(obligatoire)' : '(optionnel)'}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1.5">
              {typeInfo?.description} • Formats acceptés : {typeInfo?.acceptedFormats}
            </p>
          </div>

          <div className="shrink-0 flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={typeInfo?.acceptedFormats}
              onChange={handleFileSelect}
              className="hidden"
              id="doc-upload"
            />
            <label
              htmlFor="doc-upload"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Upload size={14} />
              {selectedFile ? 'Changer' : 'Choisir'}
            </label>
            
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading[selectedType] || !practiceName.trim()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors
                ${!selectedFile || uploading[selectedType] || !practiceName.trim()
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-[#1e3a8a] text-white hover:bg-blue-800'
                }`}
            >
              {uploading[selectedType] ? (
                <><Loader2 size={14} className="animate-spin" /> Téléchargement...</>
              ) : (
                'Envoyer'
              )}
            </button>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Fichier sélectionné :</span> {selectedFile.name}
              <span className="text-slate-400 text-xs ml-2">
                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </p>
          </div>
        )}

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-xs text-amber-700">
            <span className="font-semibold">📌 Important :</span> 
            Une fois vos documents téléchargés, l&apos;administrateur les vérifiera et validera votre compte 
            sous 24h. Vous recevrez une notification par email.
          </p>
        </div>
      </div>

      {/* ─── Liste des documents ────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Documents téléchargés</h3>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun document téléchargé</p>
            <p className="text-xs mt-1">Utilisez le formulaire ci-dessus pour ajouter vos justificatifs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.map((doc: any) => {
              const typeInfo = DOCUMENT_TYPES.find(t => t.value === doc.type);
              const isImage = doc.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              const isPDF = doc.url?.match(/\.pdf$/i);

              return (
                <div
                  key={doc._id}
                  className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                >
                  {/* Icône */}
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {isImage ? (
                      <img src={doc.url} alt={doc.fileName} className="w-full h-full object-cover rounded-lg" />
                    ) : isPDF ? (
                      <FileText size={18} className="text-red-500" />
                    ) : (
                      <FileText size={18} className="text-slate-400" />
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {typeInfo?.label || TYPE_LABELS[doc.type] || doc.type}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{doc.fileName}</p>
                    <p className="text-[10px] text-slate-400">
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('fr-FR') : ''}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      <FileText size={14} />
                    </a>
                    <button
                      onClick={() => handleDelete(doc._id)}
                      disabled={isSaving}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}