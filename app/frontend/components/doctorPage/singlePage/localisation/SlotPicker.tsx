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

const MIN_MINUTES_BEFORE_SLOT = 15

const getRealDateForDay = (dayName: string): Date => {
  const today = new Date()
  const currentDayIndex = today.getDay()

  const dayMap: Record<string, number> = {
    lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0,
  }

  const targetDayIndex = dayMap[dayName]
  let daysToAdd = targetDayIndex - currentDayIndex
  if (daysToAdd < 0) daysToAdd += 7

  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + daysToAdd)
  return targetDate
}

const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long'
  })
}

const isSlotStillBookable = (date: Date, slotStart: string): boolean => {
  const [hours, minutes] = slotStart.split(':').map(Number)
  const slotDateTime = new Date(date)
  slotDateTime.setHours(hours, minutes, 0, 0)
  const cutoff = new Date(Date.now() + MIN_MINUTES_BEFORE_SLOT * 60000)
  return slotDateTime > cutoff
}

export default function SlotPicker({ availability, selectedSlot, onSelectSlot }: SlotPickerProps) {
  const [currentDayIndex, setCurrentDayIndex] = useState(0)

  const daysWithFreeSlots = useMemo(() => {
    return availability
      .map((day) => {
        let realDate = getRealDateForDay(day.day)
        let isToday = realDate.toDateString() === new Date().toDateString()

        let freeSlots = day.slots.filter((slot) => {
          if (slot.isBooked) return false
          if (isToday) return isSlotStillBookable(realDate, slot.start)
          return true
        })

        // Planning récurrent : si "aujourd'hui" correspond à ce jour mais que
        // tous ses créneaux sont déjà passés, on bascule sur l'occurrence
        // de la semaine suivante au lieu de supprimer le jour.
        if (isToday && freeSlots.length === 0) {
          realDate = new Date(realDate)
          realDate.setDate(realDate.getDate() + 7)
          isToday = false
          freeSlots = day.slots.filter((slot) => !slot.isBooked)
        }

        return { day, realDate, isToday, freeSlots }
      })
      .filter((d) => d.freeSlots.length > 0)
      // Tri sur la date finale (post-rollover) pour que l'index 0
      // corresponde toujours à la date la plus proche.
      .sort((a, b) => a.realDate.getTime() - b.realDate.getTime())
  }, [availability])

  useMemo(() => {
    setCurrentDayIndex(0)
  }, [availability])

  if (daysWithFreeSlots.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-amber-600">Aucun créneau disponible pour le moment</p>
        <p className="text-xs text-slate-400 mt-1">Revenez plus tard</p>
      </div>
    )
  }

  const safeIndex = currentDayIndex < daysWithFreeSlots.length ? currentDayIndex : 0
  const { day: currentDay, realDate, isToday, freeSlots } = daysWithFreeSlots[safeIndex]

  const goToPreviousDay = () => {
    setCurrentDayIndex((prev) => (prev > 0 ? prev - 1 : daysWithFreeSlots.length - 1))
  }

  const goToNextDay = () => {
    setCurrentDayIndex((prev) => (prev < daysWithFreeSlots.length - 1 ? prev + 1 : 0))
  }

  //  Format : "Mercredi 2 septembre à 13:00"
  const formatSelectedDate = (date: Date): string => {
    return date.toLocaleString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getSelectedDate = (): Date | null => {
    if (!selectedSlot) return null
    try {
      return new Date(selectedSlot)
    } catch {
      return null
    }
  }

  const selectedDate = getSelectedDate()

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-2">
        Sélectionnez un créneau horaire
      </label>

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
            {DAYS_FR[currentDay.day] || currentDay.day}
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

      <div className="flex justify-center gap-1 mb-4">
        {daysWithFreeSlots.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentDayIndex(idx)}
            className={`h-1 rounded-full transition-all ${
              idx === safeIndex
                ? 'w-4 bg-blue-900'
                : 'w-2 bg-slate-300 hover:bg-slate-400'
            }`}
            type="button"
          />
        ))}
      </div>

      {freeSlots.length === 0 ? (
        <p className="text-xs text-amber-600 text-center py-4 bg-amber-50 rounded-lg">
          Aucun créneau disponible pour ce jour.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {freeSlots.map((slot, slotIdx) => {
            const slotDateTime = `${realDate.toISOString().split('T')[0]}T${slot.start}:00`
            const isSelected = selectedSlot === slotDateTime

            return (
              <button
                key={`${currentDay.day}-${slot.start}-${slotIdx}`}
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

      {/*  Message de confirmation */}
      {selectedDate && (
        <p className="text-xs text-emerald-600 text-center mt-3">
          ✓ Créneau sélectionné : {formatSelectedDate(selectedDate)}
        </p>
      )}
    </div>
  )
}