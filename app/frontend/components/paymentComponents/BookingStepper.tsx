"use client";

import { Check } from "lucide-react";

export type BookingStep = 1 | 2 | 3 | 4;

const STEPS: { step: BookingStep; label: string }[] = [
  { step: 1, label: "Créneau"      },
  { step: 2, label: "Motif"        },
  { step: 3, label: "Paiement"     },
  { step: 4, label: "Confirmation" },
];

interface BookingStepperProps {
  currentStep: BookingStep;
}

export function BookingStepper({ currentStep }: BookingStepperProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto">
      {STEPS.map(({ step, label }, i) => {
        const isDone    = step < currentStep;
        const isActive  = step === currentStep;
        const isLast    = i === STEPS.length - 1;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* Cercle + label */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                isDone
                  ? "bg-[#1e3a8a] text-white"
                  : isActive
                  ? "bg-[#1e3a8a] text-white ring-4 ring-[#1e3a8a]/20"
                  : "bg-slate-100 text-slate-400"
              }`}>
                {isDone ? <Check size={14} strokeWidth={3} /> : step}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${
                isActive ? "text-[#1e3a8a]" : isDone ? "text-slate-500" : "text-slate-400"
              }`}>
                {label}
              </span>
            </div>

            {/* Ligne de connexion */}
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${
                isDone ? "bg-[#1e3a8a]" : "bg-slate-200"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}