"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

const faqs = [
  {
    question: "Comment se déroule une téléconsultation ?",
    answer: "Vous choisissez un médecin, réservez un créneau et payez en ligne. À l'heure du rendez-vous, vous vous connectez via l'application SanteCi pour démarrer l'appel vidéo.",
  },
  {
    question: "Quels sont les moyens de paiement acceptés ?",
    answer: "Nous acceptons les paiements par carte bancaire, Mobile Money (Orange Money, MTN Money, Wave) ainsi que les virements bancaires.",
  },
  {
    question: "Mes données médicales sont-elles sécurisées ?",
    answer: "Oui, toutes vos données médicales sont chiffrées et stockées sur des serveurs sécurisés. Elles ne sont jamais partagées sans votre consentement.",
  },
  {
    question: "Puis-je annuler ou reporter un rendez-vous ?",
    answer: "Oui, vous pouvez annuler ou reporter un rendez-vous jusqu'à 2 heures avant l'heure prévue depuis votre espace patient, sans frais supplémentaires.",
  },
];

const MiniFAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-[#e2e8f0] w-full px-6 md:px-12 lg:px-20 py-16">
      <div className="max-w-3xl mx-auto flex flex-col gap-10">

        {/* En-tête centré */}
        <div className="flex flex-col items-center text-center gap-2">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Questions fréquentes
          </h2>
          <p className="text-gray-500 text-sm">
            Tout ce que vous devez savoir sur l'utilisation de SanteCi.
          </p>
        </div>

        {/* Accordéons */}
        <div className="flex flex-col gap-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex justify-between items-center px-6 py-5 text-left"
                >
                  <span className="text-sm font-semibold text-gray-900">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lien voir toutes les FAQ */}
        <div className="flex justify-center">
          <Link
            href="#"
            className="text-sm font-semibold text-[#1e3a8a] hover:text-[#3742fa] transition-colors"
          >
            Voir toutes les FAQ
          </Link>
        </div>

      </div>
    </section>
  );
};

export default MiniFAQ;