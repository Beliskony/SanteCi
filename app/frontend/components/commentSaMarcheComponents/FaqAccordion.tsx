"use client";

import { useState } from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";

const faqItems = [
  {
    question: "Pourquoi choisir SantéCi ?",
    answer: null,
    isOpen: true,
    checks: [
      "Accès rapide à des médecins qualifiés et vérifiés",
      "Parcours de soin simplifié et numérisé",
      "Historique médical centralisé",
    ],
  },
  {
    question: "Consulter avec le médecin",
    answer:
      "Vous choisissez le créneau qui vous convient parmi les disponibilités du médecin. La consultation se fait en vidéo depuis votre espace. Les résultats et ordonnances vous sont transmis directement après la séance.",
    isOpen: false,
    checks: null,
  },
  {
    question: "Récupérer ordonnances et suivi",
    answer:
      "Une fois la consultation terminée, votre ordonnance, vos documents et un résumé de la consultation sont disponibles dans votre espace patient, accessibles à tout moment.",
    isOpen: false,
    checks: null,
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <div className="space-y-2">
      {faqItems.map((item, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-xl overflow-hidden bg-white"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-900">{item.question}</span>
            <ChevronDownIcon
              className={`w-4 h-4 text-gray-400 shrink-0 ml-3 transition-transform duration-200 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>

          {openIndex === index && (
            <div className="px-5 pb-4">
              {item.checks ? (
                <ul className="space-y-2">
                  {item.checks.map((check, ci) => (
                    <li key={ci} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckIcon className="w-4 h-4 text-[#1e3a8a] mt-0.5 shrink-0" />
                      {check}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}