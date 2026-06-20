import { CreditCardIcon, LockIcon } from "lucide-react";
import Link from "next/link";

const cards = [
  {
    icon: CreditCardIcon,
    title: "Paiements",
    description: "Orange Money, MTN Money, Wave, carte ou virement avec les options et préférences.",
    href: "#faq-paiements",
    linkLabel: "Voir nos questions paiement",
  },
  {
    icon: LockIcon,
    title: "Confidentialité",
    description: "Vos données de santé sont protégées et accessibles uniquement à vous, votre médecin et votre équipe médicale privée.",
    href: "#faq-confidentialite",
    linkLabel: "Voir nos questions confidentialité",
  },
];

export default function FaqShortcutCards() {
  return (
    <div className="grid sm:grid-cols-2 gap-4 mt-4 mb-10">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-[#1e3a8a] flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">{card.title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">{card.description}</p>
            <Link
              href={card.href}
              className="text-xs font-semibold text-[#1e3a8a] hover:text-[#1e3a8a] transition-colors"
            >
              {card.linkLabel} →
            </Link>
          </div>
        );
      })}
    </div>
  );
}