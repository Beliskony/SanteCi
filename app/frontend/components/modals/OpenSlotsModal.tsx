"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Clock, Calendar, AlertTriangle } from "lucide-react";
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

type DayValue = typeof DAYS[number]["value"];

// Index JS natif (0 = dimanche ... 6 = samedi), utilisé par Date.getDay()
const DAY_INDEX: Record<DayValue, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};
const DAY_VALUE_BY_INDEX: DayValue[] = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

// Doit rester identique au MIN_MINUTES_BEFORE_SLOT de SlotPicker.tsx (côté patient),
// sinon un créneau peut sembler "ouvert aujourd'hui" ici tout en étant invisible
// pour les patients côté réservation.
const MIN_MINUTES_BEFORE_SLOT = 15;

/**
 * Résout la prochaine occurrence réelle d'un jour récurrent + heure de début.
 * Si le jour choisi est aujourd'hui mais que l'heure de début est déjà passée,
 * on bascule sur l'occurrence de la semaine suivante (même logique que côté
 * patient dans SlotPicker) — et on le signale via `rolledToNextWeek`.
 * `tooSoon` signale un créneau techniquement "aujourd'hui" mais trop proche de
 * l'heure actuelle pour être réservable par un patient (cf. MIN_MINUTES_BEFORE_SLOT).
 */
function getNextOccurrence(
  day: DayValue,
  startTime: string
): { date: Date; rolledToNextWeek: boolean; tooSoon: boolean } {
  const now = new Date();
  const currentDayIndex = now.getDay();
  const targetDayIndex = DAY_INDEX[day];

  let daysToAdd = targetDayIndex - currentDayIndex;
  if (daysToAdd < 0) daysToAdd += 7;

  const candidate = new Date(now);
  candidate.setDate(now.getDate() + daysToAdd);
  const [hours, minutes] = startTime.split(":").map(Number);
  candidate.setHours(hours, minutes, 0, 0);

  let rolledToNextWeek = false;
  if (daysToAdd === 0 && candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 7);
    rolledToNextWeek = true;
  }

  const cutoff = new Date(now.getTime() + MIN_MINUTES_BEFORE_SLOT * 60000);
  const tooSoon = !rolledToNextWeek && candidate.getTime() <= cutoff.getTime();

  return { date: candidate, rolledToNextWeek, tooSoon };
}

export function OpenSlotsModal({ isOpen, onClose }: OpenSlotsModalProps) {
  const [day, setDay] = useState<DayValue>(DAY_VALUE_BY_INDEX[new Date().getDay()]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTelemedicine = useDoctorDashStore((s) => s.updateTelemedicine);
  const user = useAuthStore((s) => s.user);
  const currentAvailability = user && isDoctor(user) ? user.telemedicine.availability : [];

  // À chaque ouverture, on repart d'aujourd'hui plutôt que de rester bloqué sur "Lundi"
  useEffect(() => {
    if (isOpen) {
      setDay(DAY_VALUE_BY_INDEX[new Date().getDay()]);
      setStart("09:00");
      setEnd("12:00");
      setError(null);
    }
  }, [isOpen]);

  const { date: nextOccurrence, rolledToNextWeek, tooSoon } = useMemo(
    () => getNextOccurrence(day, start),
    [day, start]
  );

  const isOccurrenceToday = nextOccurrence.toDateString() === new Date().toDateString();

  const occurrenceLabel = nextOccurrence.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Quand le créneau du jour est trop proche pour être réservable (tooSoon),
  // la prochaine occurrence réellement bookable par un patient est celle de
  // la semaine suivante.
  const nextBookableLabel = tooSoon
    ? new Date(nextOccurrence.getTime() + 7 * 24 * 60 * 60000).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : occurrenceLabel;

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
              onChange={(e) => setDay(e.target.value as DayValue)}
              className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              Ce créneau se répètera chaque {DAYS.find((d) => d.value === day)?.label.toLowerCase()}.
            </p>
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

          {/* Aperçu de la date réelle appliquée, pour éviter toute surprise */}
          {rolledToNextWeek ? (
            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
              <span>
                Il est déjà {start} passé aujourd'hui : ce créneau ne sera pas disponible aujourd'hui.
                Prochaine occurrence : <strong>{occurrenceLabel}</strong>.
              </span>
            </div>
          ) : tooSoon ? (
            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Ce créneau démarre dans moins de {MIN_MINUTES_BEFORE_SLOT} minutes : les patients ne
                pourront pas le réserver aujourd'hui. Il ne redeviendra visible qu'à la prochaine
                occurrence, le <strong>{occurrenceLabel}</strong> {isOccurrenceToday ? "en 8" : ""}.
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Prochaine occurrence : <strong>{occurrenceLabel}</strong>
              {isOccurrenceToday && " (aujourd'hui)"}
            </p>
          )}

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