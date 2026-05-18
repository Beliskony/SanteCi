import { Smartphone, Wifi, Shield, Check, AlertTriangle } from "lucide-react"

const requirements = [
  {
    icon: Smartphone,
    title: "Un appareil équipé",
    description: "Smartphone, tablette ou ordinateur avec caméra et microphone fonctionnels.",
  },
  {
    icon: Wifi,
    title: "Une bonne connexion",
    description: "Connexion internet stable (3G/4G/5G ou Wi-Fi) pour assurer une bonne qualité vidéo.",
  },
  {
    icon: Shield,
    title: "Un environnement calme",
    description: "Installez-vous dans un endroit calme et bien éclairé pour garantir la confidentialité de l'échange.",
  },
]

const treatable = [
  "Renouvellement d'ordonnance",
  "Résultats d'analyses et suivi",
  "Affections mineures (rhume, allergies, problèmes digestifs légers)",
  "Avis médical et orientation",
]

const Prerequis = () => {
  return (
    <section className="bg-slate-50 py-16 px-6 min-h-120">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

        {/* Left column */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-8 leading-snug">
            Prérequis pour une <br /> téléconsultation réussie
          </h2>

          <div className="flex flex-col gap-6">
            {requirements.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4">
                {/* Icon box */}
                <div className="shrink-0 w-9 h-9 border border-slate-200 rounded-lg bg-white flex items-center justify-center">
                  <Icon size={18} className="text-slate-500" strokeWidth={1.5} />
                </div>
                {/* Text */}
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">{title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-5">
            Ce qui peut être traité en vidéo
          </h3>

          <ul className="flex flex-col gap-3 mb-6">
            {treatable.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Check size={16} className="text-blue-900 mt-0.5 shrink-0" strokeWidth={2.5} />
                <span className="text-sm text-slate-700">{item}</span>
              </li>
            ))}
          </ul>

          {/* Warning banner */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
            <p className="text-xs text-red-600 leading-relaxed">
              <span className="font-semibold">La téléconsultation ne remplace pas les urgences.</span>{" "}
              En cas d'urgence vitale, contactez immédiatement le 185 ou le 180.
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}

export default Prerequis