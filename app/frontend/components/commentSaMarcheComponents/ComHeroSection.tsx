import Link from "next/link";

export default function ComHeroSection() {
  return (
    <section className="bg-white pt-10 pb-12 px-4 text-center">

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
        Comment ça marche ?
      </h1>

      {/* Subtitle */}
      <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
        De la recherche d'un médecin jusqu'à l'ordonnance et au suivi, SantéCi simplifie
        chaque étape du parcours de soin avec une expérience claire et rassurante.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/register"
          className="inline-flex items-center justify-center px-6 py-3 bg-[#1e3a8a] hover:bg-[#1e3a8a]/80 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          Commencer maintenant
        </Link>
        <Link
          href="/medecins"
          className="inline-flex items-center justify-center px-6 py-3 bg-white border border-gray-200 hover:border-[#1e3a8a] text-gray-700 hover:text-[#1e3a8a] text-sm font-semibold rounded-xl transition-colors"
        >
          Explorer les médecins
        </Link>
      </div>
    </section>
  );
}