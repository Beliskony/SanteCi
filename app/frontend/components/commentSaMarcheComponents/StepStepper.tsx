import {
  SearchIcon,
  ShieldCheckIcon,
  MessageSquareIcon,
  VideoIcon,
  FileTextIcon,
} from "lucide-react";

const steps = [
  {
    number: "Étape 1",
    icon: SearchIcon,
    title: "Je cherche",
    description: "Recherchez un médecin ou une spécialité de consultation.",
  },
  {
    number: "Étape 2",
    icon: ShieldCheckIcon,
    title: "Je me rassure",
    description: "Accédez aux avis, tarifs, spécialités et disponibilités.",
  },
  {
    number: "Étape 3",
    icon: MessageSquareIcon,
    title: "Je parle",
    description: "Décrivez brièvement votre problème et obtenez les horaires disponibles.",
  },
  {
    number: "Étape 4",
    icon: VideoIcon,
    title: "Je consulte",
    description: "Consultez en vidéo ou en présentiel, selon votre préférence.",
  },
  {
    number: "Étape 5",
    icon: FileTextIcon,
    title: "Je récupère",
    description: "Ordonnances, documents et historique de suivi dans votre espace.",
  },
];

export default function StepsStepper() {
  return (
    <section className="bg-gray-50 border-y border-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Steps grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative flex flex-col items-center text-center group">
                {/* Connector line (hidden on mobile) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(50%+2rem)] right-[calc(-50%+2rem)] h-px bg-[#1e3a8a]/20 z-0" />
                )}

                {/* Icon circle */}
                <div className="relative z-10 w-12 h-12 rounded-2xl bg-[#1e3a8a]/10 border border-[#1e3a8a]/20 flex items-center justify-center mb-3 group-hover:bg-[#1e3a8a]/20 transition-colors">
                  <Icon className="w-5 h-5 text-[#1e3a8a]" />
                </div>

                {/* Step label */}
                <span className="text-xs font-medium text-[#1e3a8a] uppercase tracking-wide mb-1">
                  {step.number}
                </span>

                {/* Title */}
                <h3 className="text-sm font-bold text-gray-800 mb-1">{step.title}</h3>

                {/* Description */}
                <p className="text-xs text-gray-500 leading-relaxed max-w-35">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}