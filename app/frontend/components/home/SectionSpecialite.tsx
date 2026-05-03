import { Stethoscope, Baby, Activity, Sun, Eye, Heart, Brain, Smile, ArrowRight } from "lucide-react";
import Link from "next/link";

const specialites = [
  { name: "Généraliste",   icon: <Stethoscope size={28} /> },
  { name: "Pédiatre",      icon: <Baby size={28} /> },
  { name: "Gynécologue",   icon: <Activity size={28} /> },
  { name: "Dentiste",      icon: <Smile size={28} /> },
  { name: "Ophtalmologue", icon: <Eye size={28} /> },
  { name: "Dermatologue",  icon: <Sun size={28} /> },
  { name: "Cardiologue",   icon: <Heart size={28} /> },
  { name: "Psychologue",   icon: <Brain size={28} /> },
];

const SectionSpecialite = () => {
  return (
    <section className="bg-[#e2e8f0] w-full px-6 md:px-12 lg:px-20 py-16">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">

        {/* ── En-tête ── */}
        <div className="flex flex-row justify-between items-start gap-4">
          <div className="flex flex-col gap-2 max-w-lg">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Spécialités les plus recherchées
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Trouvez rapidement le spécialiste qu'il vous faut parmi plus de 50 spécialités
              médicales couvertes par notre réseau.
            </p>
          </div>

          <Link
            href="/doctors"
            className="shrink-0 flex items-center gap-1.5 border border-gray-300 bg-white rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Toutes les spécialités
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* ── Grille ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {specialites.map((specialite, index) => (
            <Link
              href={`/doctors?specialty=${encodeURIComponent(specialite.name)}`}
              key={index}
              className="group flex flex-col items-center gap-4 bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-[#1e3a8a]/10 flex items-center justify-center text-[#1e3a8a] group-hover:bg-[#1e3a8a] group-hover:text-white transition-colors duration-200">
                {specialite.icon}
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-[#1e3a8a] transition-colors duration-200">
                {specialite.name}
              </span>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
};

export default SectionSpecialite;