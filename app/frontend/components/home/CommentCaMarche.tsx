import { Search, CalendarCheck, FileText } from "lucide-react";

const steps = [
  {
    icon: <Search size={32} />,
    title: "1. Trouvez un médecin",
    description: "Recherchez par spécialité, ville ou nom parmi nos praticiens vérifiés. Consultez leurs disponibilités en temps réel.",
  },
  {
    icon: <CalendarCheck size={32} />,
    title: "2. Prenez rendez-vous",
    description: "Choisissez le créneau qui vous convient pour une consultation en cabinet ou en vidéo. Payez en ligne en toute sécurité.",
  },
  {
    icon: <FileText size={32} />,
    title: "3. Consultez et suivez",
    description: "Échangez avec le médecin et retrouvez vos ordonnances et votre historique dans votre dossier médical partagé.",
  },
];

const CommentCaMarche = () => {
  return (
    <section className="bg-white w-full px-6 md:px-12 lg:px-20 py-16">
      <div className="max-w-4xl mx-auto flex flex-col gap-14">

        {/* En-tête centré */}
        <div className="flex flex-col items-center text-center gap-3">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Comment ça marche ?
          </h2>
          <p className="text-gray-500 text-base leading-relaxed max-w-lg">
            Un parcours simple, intuitif et sécurisé pour prendre soin de votre santé en quelques étapes.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center text-[#1e3a8a]">
                {step.icon}
              </div>
              <h3 className="text-base font-bold text-gray-900">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default CommentCaMarche;