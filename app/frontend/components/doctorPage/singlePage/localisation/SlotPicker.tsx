"use client"

import type { DoctorTelemedicine } from "@/app/frontend/store/useAuthStore"

interface SlotPickerProps {
  availability: DoctorTelemedicine["availability"]
  selectedSlot: string | null
  onSelectSlot: (slot: string) => void
}

const DAYS_FR: Record<string, string> = {
  lundi: "Lundi",
  mardi: "Mardi",
  mercredi: "Mercredi",
  jeudi: "Jeudi",
  vendredi: "Vendredi",
  samedi: "Samedi",
  dimanche: "Dimanche",
}

const DAY_ORDER = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]

export default function SlotPicker({ availability, selectedSlot, onSelectSlot }: SlotPickerProps) {
  // Trier les jours dans l'ordre de la semaine
  const sortedDays = [...availability].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  )

  // Trouver le premier jour avec des créneaux disponibles
  const firstAvailableIndex = sortedDays.findIndex((d) =>
    d.slots.some((s) => !s.isBooked)
  )
  const activeDayIndex = firstAvailableIndex >= 0 ? firstAvailableIndex : 0

  // On affiche le jour actif (simplification : pas de navigation entre jours dans ce composant)
  const activeDay = sortedDays[activeDayIndex]
  const freeSlots = activeDay?.slots.filter((s) => !s.isBooked) ?? []

  if (!activeDay) return null

  return (
    <div>
      {/* Navigation jour */}
      <div className="flex items-center justify-between mb-3">
        <button className="text-slate-400 hover:text-slate-600 transition-colors p-1">
          ‹
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900">
            {DAYS_FR[activeDay.day]}
          </p>
          <p className="text-xs text-slate-400">Aujourd&apos;hui</p>
        </div>
        <button className="text-slate-400 hover:text-slate-600 transition-colors p-1">
          ›
        </button>
      </div>

      {/* Grille de créneaux */}
      {freeSlots.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">
          Aucun créneau disponible ce jour.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {freeSlots.map((slot) => {
            const isSelected = selectedSlot === slot.start
            return (
              <button
                key={slot.start}
                onClick={() => onSelectSlot(slot.start)}
                className={`py-2 rounded-lg text-sm font-medium transition-all duration-150 border
                  ${
                    isSelected
                      ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-blue-900 hover:text-blue-900"
                  }`}
              >
                {slot.start}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}