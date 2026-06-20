import FaqAccordion from "./FaqAccordion";

const processSteps = [
  {
    number: "1",
    title: "Recherchez un médecin ou un établissement",
    description:
      "Utilisez la barre de recherche pour trouver un médecin par spécialité, nom ou localisation. Consultez les avis, disponibilités, tarifs et langues parlées. Comparez facilement plusieurs profils avant de prendre une décision éclairée.",
  },
  {
    number: "2",
    title: "Choisir un créneau et préparer le motif",
    description:
      "Sélectionnez un créneau disponible parmi les disponibilités du médecin, choisissez le type de consultation souhaité (vidéo ou présentiel), puis décrivez brièvement votre motif de consultation. Cette étape aide le médecin à mieux vous préparer.",
  },
  {
    number: "3",
    title: "Rejoindre votre téléconsultation",
    description:
      "À l'heure du rendez-vous, rejoignez la consultation depuis votre espace sécurisé. Aucun logiciel supplémentaire n'est nécessaire : tout fonctionne directement depuis votre navigateur. Google Maps, Apple Maps, ou tout autre service de navigation est disponible.",
  },
];

export default function ProcessSection() {
  return (
    <section className="bg-white py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section label */}
        <p className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-widest mb-3">
          Détail du processus
        </p>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left — steps */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">
              Un processus simple,{" "}
              <span className="text-[#1e3a8a]">pensé pour rassurer</span>
            </h2>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-10">
              Nous savons que la consultation médicale en ligne peut sembler complexe. C'est pourquoi
              la téléconsultation et toute la plateforme SantéCi ont été conçus pour vous guider
              pas à pas tout au long du processus, avec une interface accessible à tous.
            </p>

            <div className="space-y-8">
              {processSteps.map((step) => (
                <div key={step.number} className="flex gap-5">
                  {/* Number badge */}
                  <div className="shrink-0 w-9 h-9 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                    {step.number}
                  </div>

                  {/* Content */}
                  <div className="pt-0.5">
                    <h3 className="text-base font-bold text-gray-800 mb-1">{step.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — FAQ */}
          <div className="lg:pt-16">
            <FaqAccordion />
          </div>
        </div>
      </div>
    </section>
  );
}