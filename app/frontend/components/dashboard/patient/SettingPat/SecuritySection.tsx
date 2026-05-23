"use client";

import { useState } from "react";
import { ShieldCheck, UserX, Phone, Plus, Trash2, Loader2 } from "lucide-react";
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore";
import { usePatientStore } from "@/app/frontend/store/patientStore";
import { SectionLabel } from "./ProfileSection";

export function SecuritySection() {
  const user    = useAuthStore((s) => s.user);
  const patient = user && isPatient(user) ? user : null;
  const contacts = patient?.contact?.emergencyContacts ?? [];

  const addEmergencyContact    = usePatientStore((s) => s.addEmergencyContact);
  const removeEmergencyContact = usePatientStore((s) => s.removeEmergencyContact);
  const deleteAccount          = usePatientStore((s) => s.deleteAccount);
  const isSaving               = usePatientStore((s) => s.isSaving);

  // Contact d'urgence form
  const [showContactForm, setShowContactForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relationship: "" });
  const [contactSaving, setContactSaving] = useState(false);

  // Suppression compte
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone || !newContact.relationship) return;
    setContactSaving(true);
    try {
      await addEmergencyContact(newContact);
      setNewContact({ name: "", phone: "", relationship: "" });
      setShowContactForm(false);
    } finally {
      setContactSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "SUPPRIMER") return;
    await deleteAccount();
  };

  const RELATIONSHIPS = ["Père", "Mère", "Conjoint(e)", "Frère/Sœur", "Ami(e)", "Autre"];

  return (
    <div className="flex flex-col gap-6">

      {/* ── Contacts d'urgence ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel icon={<Phone size={14} />} label="Contacts d'urgence" />

        <div className="flex flex-col gap-2">
          {contacts.length === 0 && (
            <p className="text-xs text-slate-400 py-2">Aucun contact d&apos;urgence renseigné.</p>
          )}
          {contacts.map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center shrink-0">
                  <Phone size={14} className="text-[#1e3a8a]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.relationship} · {c.phone}</p>
                </div>
              </div>
              <button
                onClick={() => removeEmergencyContact((c as any)._id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Formulaire ajout */}
        {showContactForm ? (
          <div className="flex flex-col gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ContactField label="Nom complet" value={newContact.name}
                onChange={(v) => setNewContact((c) => ({ ...c, name: v }))} placeholder="Jean Kouassi" />
              <ContactField label="Téléphone" value={newContact.phone} type="tel"
                onChange={(v) => setNewContact((c) => ({ ...c, phone: v }))} placeholder="+225 07 00 00 00 00" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Relation</label>
              <div className="flex flex-wrap gap-1.5">
                {RELATIONSHIPS.map((r) => (
                  <button key={r}
                    onClick={() => setNewContact((c) => ({ ...c, relationship: r }))}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      newContact.relationship === r
                        ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowContactForm(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleAddContact} disabled={contactSaving}
                className="flex-1 py-2 text-xs font-bold text-white bg-[#1e3a8a] rounded-xl hover:bg-blue-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {contactSaving ? <Loader2 size={12} className="animate-spin" /> : null}
                Ajouter
              </button>
            </div>
          </div>
        ) : contacts.length < 3 ? (
          <button onClick={() => setShowContactForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#1e3a8a] border border-dashed border-[#1e3a8a]/30 rounded-xl hover:bg-blue-50 hover:border-[#1e3a8a]/60 transition-all self-start">
            <Plus size={14} />
            Ajouter un contact ({contacts.length}/3)
          </button>
        ) : (
          <p className="text-xs text-slate-400">Maximum 3 contacts d&apos;urgence atteint.</p>
        )}
      </div>

      {/* ── Sécurité du compte ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel icon={<ShieldCheck size={14} />} label="Sécurité" />
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Code PIN</p>
            <p className="text-xs text-slate-500 mt-0.5">Protégez votre compte avec un code PIN à 4-6 chiffres</p>
          </div>
          <button className="px-4 py-2 text-xs font-bold text-[#1e3a8a] border border-[#1e3a8a]/30 rounded-xl hover:bg-blue-50 transition-colors shrink-0">
            Configurer
          </button>
        </div>
      </div>

      {/* ── Zone dangereuse ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel icon={<UserX size={14} />} label="Zone dangereuse" />

        {!showDeleteConfirm ? (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-red-700">Supprimer mon compte</p>
              <p className="text-xs text-red-400 mt-0.5">Action irréversible. Toutes vos données seront désactivées.</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-xs font-bold text-red-500 border border-red-200 rounded-xl hover:bg-red-100 transition-colors shrink-0"
            >
              Supprimer
            </button>
          </div>
        ) : (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col gap-3">
            <p className="text-sm font-semibold text-red-700">Confirmer la suppression</p>
            <p className="text-xs text-red-500">
              Tapez <span className="font-bold font-mono">SUPPRIMER</span> pour confirmer.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="SUPPRIMER"
              className="px-3 py-2 text-sm border border-red-200 rounded-xl bg-white focus:outline-none focus:border-red-400 font-mono"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "SUPPRIMER" || isSaving}
                className="flex-1 py-2 text-xs font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : null}
                Confirmer la suppression
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1e3a8a] text-slate-800 placeholder:text-slate-400 transition-all" />
    </div>
  );
}