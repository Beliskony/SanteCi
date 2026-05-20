"use client";

import { useState } from "react";
import { PhoneCall, Phone, Plus, X } from "lucide-react";
import { usePatientStore } from "@/app/frontend/store/patientStore";
import { useAuthStore, isPatient } from "@/app/frontend/store/useAuthStore";
import { AddEmergencyContactModal } from "../../../modals/AddEmergencyContactModal";
import { ConfirmRemoveModal } from "../../../modals/ConfirmRemoveModal";

interface ContactsUrgenceCardProps {
  onCall?: (phone: string) => void;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function ContactsUrgenceCard({ onCall }: ContactsUrgenceCardProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [removingContact, setRemovingContact] = useState<{ name: string; phone: string; relationship: string } | null>(null);

  const user = useAuthStore((s) => s.user);
  const patient = user && isPatient(user) ? user : null;
  const contacts = patient?.contact.emergencyContacts ?? [];

  const addEmergencyContact = usePatientStore((s) => s.addEmergencyContact);
  const removeEmergencyContact = usePatientStore((s) => s.removeEmergencyContact);
  const isSaving = usePatientStore((s) => s.isSaving);
  const canAdd = contacts.length < 3;

  const handleAdd = async (contact: { name: string; phone: string; relationship: string }) => {
    await addEmergencyContact(contact);
  };

  const handleRemove = async () => {
    if (!removingContact) return;
    // Note: Il faut un contactId. À adapter selon ton backend
    console.warn("removeEmergencyContact nécessite un contactId", removingContact);
    setRemovingContact(null);
  };

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <PhoneCall className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-800">Contacts d'urgence</span>
        </div>

        <div className="divide-y divide-gray-100">
          {contacts.length === 0 && (
            <p className="text-xs text-gray-400 pb-3">Aucun contact renseigné</p>
          )}
          {contacts.map((contact, i) => (
            <div key={`${contact.phone}-${i}`} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-medium text-blue-800 shrink-0">
                  {initials(contact.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{contact.name}</p>
                  <p className="text-xs text-gray-500">
                    {contact.relationship} · {contact.phone}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onCall?.(contact.phone)}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRemovingContact(contact)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {canAdd && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={isSaving}
            className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors pt-2 border-t border-gray-100 w-full disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter un contact
          </button>
        )}
      </div>

      <AddEmergencyContactModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAdd}
        existingCount={contacts.length}
        maxContacts={3}
      />

      <ConfirmRemoveModal
        isOpen={removingContact !== null}
        onClose={() => setRemovingContact(null)}
        onConfirm={handleRemove}
        itemName={removingContact?.name || ""}
        itemType="contact"
      />
    </>
  );
}