"use client";

import { useState } from "react";
import { X, Clock, Calendar } from "lucide-react";
import { useDoctorDashStore } from "@/app/frontend/store/doctorStore";
import { useAuthStore, isDoctor } from "@/app/frontend/store/useAuthStore";

interface OpenSlotsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = [
  { value: "lundi",    label: "Lundi" },
  { value: "mardi",    label: "Mardi" },
  { value: "mercredi", label: "Mercredi" },
  { value: "jeudi",    label: "Jeudi" },
  { value: "vendredi", label: "Vendredi" },
  { value: "samedi",   label: "Samedi" },
  { value: "dimanche", label: "Dimanche" },
] as const;

export function OpenSlotsModal({ isOpen, onClose }: OpenSlotsModalProps) {
  const [day, setDay] = useState<typeof DAYS[number]["value"]>("lundi");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTelemedicine = useDoctorDashStore((s) => s.updateTelemedicine);
  const user = useAuthStore((s) => s.user);
  const currentAvailability = user && isDoctor(user) ? user.telemedicine.availability : [];

  const handleSubmit = async () => {
    if (start >= end) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      // Trouver si ce jour a déjà des créneaux, sinon en créer un nouveau
      const existingDayIndex = currentAvailability.findIndex((a) => a.day === day);
      const newSlot = { start, end, isBooked: false };

      let newAvailability;
      if (existingDayIndex >= 0) {
        newAvailability = currentAvailability.map((a, i) =>
          i === existingDayIndex
            ? { ...a, slots: [...a.slots, newSlot] }
            : a
        );
      } else {
        newAvailability = [...currentAvailability, { day, slots: [newSlot] }];
      }

      await updateTelemedicine({ availability: newAvailability });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout du créneau.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm mx-4 bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-base font-medium text-gray-800">Ouvrir un créneau</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Jour
            </label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value as typeof day)}
              className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                Début
              </label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Fin</label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {error && (
            <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Ajout..." : "Ajouter le créneau"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}