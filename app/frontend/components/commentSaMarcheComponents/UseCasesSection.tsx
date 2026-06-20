const useCases = [
  "Renouvellement d'ordonnance",
  "Suivi médecin traitant",
  "Avis médical rapide",
  "Consultation spécialiste",
  "Consultation salariés",
];

export default function UseCasesSection() {
  return (
    <section className="bg-gray-50 border-t border-gray-100 py-14 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left — label + title */}
          <div>
            <p className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-widest mb-3">
              Cas d'usage typiques
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              Adapté à chaque situation médicale
            </h2>
          </div>

          {/* Right — tags */}
          <div className="flex flex-wrap gap-3">
            {useCases.map((useCase) => (
              <span
                key={useCase}
                className="inline-flex items-center px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 shadow-xs hover:border-teal-400 hover:text-teal-700 transition-colors cursor-default"
              >
                {useCase}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}