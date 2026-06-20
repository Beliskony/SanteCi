"use client";

import { SearchIcon } from "lucide-react";

interface FaqHeroProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export default function FaqHero({ search, onSearchChange }: FaqHeroProps) {
  return (
    <div className="bg-white pt-10 pb-10 px-4 text-center border-b border-gray-100">


      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        Questions fréquentes
      </h1>

      <p className="text-gray-500 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">
        Retrouvez les réponses essentielles sur votre compte, l'OTP, les rendez-vous, les
        paiements, la téléconsultation et la confidentialité de vos données.
      </p>

      {/* Search */}
      <div className="max-w-xl mx-auto relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher dans la FAQ"
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent transition"
        />
      </div>
    </div>
  );
}