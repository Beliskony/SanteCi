"use client"

import type { DoctorTelemedicine } from "@/app/frontend/store/useAuthStore"
import { useMemo, useState } from "react"

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

// Helper pour obtenir la date réelle d'un jour
const getRealDateForDay = (dayName: string): Date => {
  const today = new Date()
  const currentDayIndex = today.getDay() // 0 = dimanche, 1 = lundi, ...
  
  // Convertir notre système (lundi = 0) en système JS (dimanche = 0)
  const dayMap: Record<string, number> = {
    lundi: 1,
    mardi: 2,
    mercredi: 3,
    jeudi: 4,
    vendredi: 5,
    samedi: 6,
    dimanche: 0,
  }
  
  const targetDayIndex = dayMap[dayName]
  let daysToAdd = targetDayIndex - currentDayIndex
  
  // Si le jour est passé dans la semaine, ajouter 7 jours
  if (daysToAdd < 0) {
    daysToAdd += 7
  }
  
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + daysToAdd)
  
  return targetDate
}

// Formater la date pour l'affichage
const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long'
  })
}

export default function SlotPicker({ availability, selectedSlot, onSelectSlot }: SlotPickerProps) {
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  
  // Trier les jours dans l'ordre de la semaine
  const sortedDays = useMemo(() =>
    [...availability].sort((a, b) =>
      DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
    ),
    [availability]
  )
  
  // Filtrer seulement les jours avec des créneaux disponibles
  const daysWithSlots = useMemo(() =>
    sortedDays.filter(day => day.slots.some(slot => !slot.isBooked)),
    [sortedDays]
  )
  
  // Réinitialiser l'index si on change de médecin
  useMemo(() => {
    setCurrentDayIndex(0)
  }, [availability])
  
  if (daysWithSlots.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-amber-600">Aucun créneau disponible pour le moment</p>
        <p className="text-xs text-slate-400 mt-1">Revenez plus tard</p>
      </div>
    )
  }
  
  const currentDay = daysWithSlots[currentDayIndex]
  const freeSlots = currentDay.slots.filter(slot => !slot.isBooked)
  const realDate = getRealDateForDay(currentDay.day)
  const isToday = realDate.toDateString() === new Date().toDateString()
  
  const goToPreviousDay = () => {
    setCurrentDayIndex((prev) => (prev > 0 ? prev - 1 : daysWithSlots.length - 1))
  }
  
  const goToNextDay = () => {
    setCurrentDayIndex((prev) => (prev < daysWithSlots.length - 1 ? prev + 1 : 0))
  }
  
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-2">
        Sélectionnez un créneau horaire
      </label>
      
      {/* Navigation jour */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousDay}
          className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center"
          type="button"
        >
          ‹
        </button>
        
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900">
            {DAYS_FR[currentDay.day]}
          </p>
          <p className="text-xs text-slate-500">
            {formatDateDisplay(realDate)}
            {isToday && <span className="ml-1 text-blue-600">(Aujourd'hui)</span>}
          </p>
        </div>
        
        <button
          onClick={goToNextDay}
          className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center"
          type="button"
        >
          ›
        </button>
      </div>
      
      {/* Indicateur de progression */}
      <div className="flex justify-center gap-1 mb-4">
        {daysWithSlots.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentDayIndex(idx)}
            className={`h-1 rounded-full transition-all ${
              idx === currentDayIndex
                ? 'w-4 bg-blue-900'
                : 'w-2 bg-slate-300 hover:bg-slate-400'
            }`}
            type="button"
          />
        ))}
      </div>
      
      {/* Grille de créneaux */}
      {freeSlots.length === 0 ? (
        <p className="text-xs text-amber-600 text-center py-4 bg-amber-50 rounded-lg">
          Aucun créneau disponible pour ce jour.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {freeSlots.map((slot) => {
            const slotDateTime = `${realDate.toISOString().split('T')[0]}T${slot.start}`
            const isSelected = selectedSlot === slotDateTime
            
            return (
              <button
                key={slot.start}
                onClick={() => onSelectSlot(slotDateTime)}
                className={`py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border
                  ${
                    isSelected
                      ? "bg-blue-900 text-white border-blue-900 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-blue-900 hover:text-blue-900"
                  }`}
                type="button"
              >
                {slot.start}
              </button>
            )
          })}
        </div>
      )}
      
      {/* Message informatif */}
      {selectedSlot && (
        <p className="text-xs text-emerald-600 text-center mt-3">
          ✓ Créneau sélectionné : {new Date(selectedSlot).toLocaleString('fr-FR')}
        </p>
      )}
    </div>
  )
}